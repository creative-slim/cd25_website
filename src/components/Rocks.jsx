import * as THREE from "three";
import { useRef, useImperativeHandle, forwardRef, useEffect, useState, Fragment, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useControls, folder } from "leva";
import { gsap } from "gsap";
import Portal from "./Portal";
import SaturnRing from "./SaturnRing";

const NUM_ROCKS = 100;
const MIN_ORBIT_RADIUS = 4.5;
const MAX_ORBIT_RADIUS = 7.5;
const MIN_ORBIT_SPEED = -1;
const MAX_ORBIT_SPEED = 1;
const ROCK_SIZE = 0.2;
const SHIELD_RADIUS = 3.6;
const SHIELD_COLOR = "black";
const SHIELD_OPACITY = 0.4;
const SHIELD_ROUGHNESS = 0.6;
const SHIELD_METALNESS = 1;
const FALL_TIME = 1.2; // seconds to fall
const RETURN_TIME = 1.2; // seconds to return
const LIGHTNING_SEGMENTS = 8;
const LIGHTNING_CHAOS = 0.2;
const SHIELD_TWITCH_AMOUNT = 0.2; // How much the lightning origin moves on the shield
const JOLT_PROBABILITY = 0.001; // Chance of a lightning jolt per frame
const GOOD_MODE_TRANSITION_TIME = 2.0; // seconds
const SATURN_TILT = 0.5;

// Jerk intensity (now controlled by Leva)
let JERK_MAG = 0.18;
let JERK_ROT = 0.5;

const dodecahedronGeometry = new THREE.DodecahedronGeometry(ROCK_SIZE, 0);
const sphereGeometry = new THREE.SphereGeometry(ROCK_SIZE, 16, 16);
const evilRockMaterial = new THREE.MeshStandardMaterial({ color: "darkGray", roughness: 1, transparent: true });
const lineMaterial = new THREE.LineBasicMaterial({
    color: "white",
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
    linewidth: 100,

});

const Shield = forwardRef(({ radius = SHIELD_RADIUS, color = SHIELD_COLOR, roughness = SHIELD_ROUGHNESS, metalness = SHIELD_METALNESS }, ref) => (
    <mesh ref={ref} visible={false}>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
            color={color}
            transparent
            opacity={0.1}
            roughness={roughness}
            metalness={metalness}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
        />
    </mesh>
));

function generateLightningPath(start, end, segments, chaos) {
    const points = [];
    const direction = end.clone().sub(start);
    const length = direction.length();
    direction.normalize();

    let tangent = new THREE.Vector3().crossVectors(direction, direction.y === 1 || direction.y === -1 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0)).normalize();
    let bitangent = new THREE.Vector3().crossVectors(direction, tangent).normalize();

    points.push(start.clone());
    for (let i = 1; i < segments; i++) {
        const pos = start.clone().add(direction.clone().multiplyScalar(length * i / segments));
        const offset = tangent.clone().multiplyScalar((Math.random() - 0.5) * chaos * length)
            .add(bitangent.clone().multiplyScalar((Math.random() - 0.5) * chaos * length));
        const falloff = 1 - Math.pow(i / segments, 2);
        pos.add(offset.multiplyScalar(falloff));
        points.push(pos);
    }
    points.push(end.clone());
    return points;
}

// Vibrant rainbow palette matching the ring
const RAINBOW_PALETTE = [

    new THREE.Color(0xff0000), // Red
    new THREE.Color(0xff7f00), // Orange-Red
    new THREE.Color(0xffff00), // Yellow
    new THREE.Color(0x00ff00), // Green
    new THREE.Color(0x0000ff), // Blue
    new THREE.Color(0x4b0082), // Indigo
    new THREE.Color(0x9400d3), // Violet
]

// Helper to generate non-overlapping positions for good mode
function generateNonOverlappingPositions(num, radius, minDistance) {
    const positions = [];
    const maxAttempts = 1000;
    for (let i = 0; i < num; i++) {
        let attempt = 0;
        let pos;
        while (attempt < maxAttempts) {
            // Place on a ring in XZ, with some Y jitter
            const theta = Math.random() * Math.PI * 2;
            const y = (Math.random() - 0.5) * 0.2; // small vertical spread
            pos = new THREE.Vector3(
                radius * Math.cos(theta),
                y,
                radius * Math.sin(theta)
            );
            let tooClose = false;
            for (let j = 0; j < positions.length; j++) {
                if (pos.distanceTo(positions[j]) < minDistance) {
                    tooClose = true;
                    break;
                }
            }
            if (!tooClose) break;
            attempt++;
        }
        positions.push(pos);
    }
    return positions;
}

// Ring config constants (tweak as needed)
const RING_AVG_RADIUS = (MIN_ORBIT_RADIUS + MAX_ORBIT_RADIUS) / 2; // Match rocks' orbit
const RING_CONFIGS = [
    { type: 'ring', radius: RING_AVG_RADIUS - 1, tube: 1, opacity: 0.7, speed: 0.5, phase: 0 },
    { type: 'ring', radius: RING_AVG_RADIUS + 1.1, tube: 0.7, opacity: 0.4, speed: 0.7, phase: 1.0 },
    { type: 'ring', radius: RING_AVG_RADIUS + 2.9, tube: 1, opacity: 0.2, speed: 0.3, phase: 2.0 }
];
const RING_SCALE = [1, 1, 1]; // Adjust if you want elliptical ring
const RING_POSITION = [0, 0, 0]; // Centered on earth

const Rocks = forwardRef(({ shieldRadius = SHIELD_RADIUS, shieldColor = SHIELD_COLOR, ...props }, ref) => {
    const groupRef = useRef();
    const shieldRef = useRef();
    const shieldFlashTl = useRef();
    const rocksRefs = useRef(Array.from({ length: NUM_ROCKS }, () => useRef()));
    const goodRocksRefs = useRef(Array.from({ length: NUM_ROCKS }, () => useRef()));
    const linesRef = useRef(Array.from({ length: NUM_ROCKS }, () => useRef()));
    const overallOpacity = useRef({ value: 0 }); // Start fully transparent

    // Pre-generated lightning paths for performance
    const lightningPaths = useRef(Array.from({ length: NUM_ROCKS }, () =>
        Array.from({ length: 5 }, () => []) // 5 pre-generated paths per rock
    ));
    const lightningPathIndex = useRef(Array.from({ length: NUM_ROCKS }, () => 0));

    // Use refs instead of state for values that change every frame
    const progressRef = useRef(Array(NUM_ROCKS).fill(0));
    const isFallingRef = useRef(false);
    const isReturningRef = useRef(false);

    // Reuse THREE objects to prevent garbage collection
    const targetOrbitPos = useRef(new THREE.Vector3());
    const finalPosition = useRef(new THREE.Vector3());
    const finalRotation = useRef(new THREE.Euler(0, 0, 0));
    const basePos = useRef(new THREE.Vector3());
    const shieldSurfacePoint = useRef(new THREE.Vector3());
    const twitchOffset = useRef(new THREE.Vector3());
    const up = useRef(new THREE.Vector3());
    const tangent1 = useRef(new THREE.Vector3());
    const tangent2 = useRef(new THREE.Vector3());

    const rockProperties = useRef(
        Array.from({ length: NUM_ROCKS }, (_, i) => {
            const phi = Math.acos(1 - 2 * (i + 0.5) / NUM_ROCKS);
            const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
            const orbitRadius = MIN_ORBIT_RADIUS + Math.random() * (MAX_ORBIT_RADIUS - MIN_ORBIT_RADIUS);
            const orbitSpeed = MIN_ORBIT_SPEED + Math.random() * (MAX_ORBIT_SPEED - MIN_ORBIT_SPEED);
            return { phi, theta, orbitRadius, orbitSpeed };
        })
    );
    const goodModeProgress = useRef({ value: 0 }); // Using an object to be tweenable by gsap
    const goodModeTimeline = useRef();
    const rockMaterials = useRef(Array.from({ length: NUM_ROCKS }, () => {
        // All good rocks use the same glossy material properties
        return new THREE.MeshStandardMaterial({
            color: 0xffffff, // Will be set per rock below
            roughness: 0.05,
            metalness: 0.95,
            envMapIntensity: 1.0,
            transparent: true,
            opacity: 1,
        });
    }));
    const goodRockColors = useRef(Array.from({ length: NUM_ROCKS }, (_, i) => {
        return RAINBOW_PALETTE[i % RAINBOW_PALETTE.length].clone();
    }));

    const [ringFade, setRingFade] = useState(0);
    const fadeInSaturnRing = () => {
        console.log("fadeInSaturnRing");
        gsap.to({ val: ringFade }, {
            val: 1,
            duration: 0.7,
            ease: 'power2.out',
            onUpdate: function () { setRingFade(this.targets()[0].val); }
        });
    };
    const fadeOutSaturnRing = () => {
        gsap.to({ val: ringFade }, {
            val: 0,
            duration: 0.7,
            ease: 'power2.in',
            onUpdate: function () { setRingFade(this.targets()[0].val); }
        });
    };

    const calmTheStorm = () => {
        console.log("calmTheStorm");
        if (goodModeTimeline.current) {
            goodModeTimeline.current.kill();
        }
        goodModeTimeline.current = gsap.to(goodModeProgress.current, {
            value: 1,
            duration: GOOD_MODE_TRANSITION_TIME,
            ease: "power2.inOut",
            onComplete: fadeInSaturnRing,
        });
    };

    const unleashTheStorm = () => {
        console.log("unleashTheStorm");
        if (goodModeTimeline.current) {
            goodModeTimeline.current.kill();
        }
        fadeOutSaturnRing(); // Start fade out immediately
        goodModeTimeline.current = gsap.to(goodModeProgress.current, {
            value: 0,
            duration: GOOD_MODE_TRANSITION_TIME,
            ease: "power2.inOut"
            // No onComplete here
        });
    };

    // Leva controls for jerk intensity - only in development
    const isDevelopment = import.meta.env.DEV;
    let leva = null;
    if (isDevelopment) {
        leva = useControls("Rocks Jerk", {
            "Jerk Magnitude": {
                value: JERK_MAG,
                min: 0,
                max: 0.5,
                step: 0.01,
                onChange: (v) => (JERK_MAG = v),
            },
            "Jerk Rotation": {
                value: JERK_ROT,
                min: 0,
                max: 2,
                step: 0.01,
                onChange: (v) => (JERK_ROT = v),
            },
        });
    }

    // Leva controls for inner glow - only in development
    const [glowParams, setGlowParams] = useState({
        size: 0.7,
        intensity: 1.5,
        opacity: 0.7,
    });
    if (isDevelopment) {
        useControls("Rocks Glow", {
            "Glow Size": {
                value: 0.7,
                min: 0.3,
                max: 1.0,
                step: 0.01,
                onChange: (v) => setGlowParams((p) => ({ ...p, size: v })),
            },
            "Glow Intensity": {
                value: 1.5,
                min: 0.1,
                max: 5.0,
                step: 0.05,
                onChange: (v) => setGlowParams((p) => ({ ...p, intensity: v })),
            },
            "Glow Opacity": {
                value: 0.7,
                min: 0.1,
                max: 1.0,
                step: 0.01,
                onChange: (v) => setGlowParams((p) => ({ ...p, opacity: v })),
            },
        });
    }

    // Emissive mode state
    const [emissiveMode, setEmissiveMode] = useState(false);
    if (isDevelopment) {
        useControls("Rocks Mode", {
            "Peaceful Mode": {
                value: false,
                onChange: (v) => {
                    if (v) {
                        calmTheStorm();
                    } else {
                        unleashTheStorm();
                    }
                },
            },
            "Emissive Mode": {
                value: false,
                onChange: (v) => setEmissiveMode(v),
            },
        });
    }

    if (isDevelopment) {
        useControls({
            "Shield": folder({
                roughness: {
                    value: SHIELD_ROUGHNESS,
                    min: 0,
                    max: 1,
                    step: 0.01,
                    onChange: (v) => {
                        if (shieldRef.current) {
                            shieldRef.current.material.roughness = v;
                        }
                    },
                    label: "Roughness"
                },
                metalness: {
                    value: SHIELD_METALNESS,
                    min: 0,
                    max: 1,
                    step: 0.01,
                    onChange: (v) => {
                        if (shieldRef.current) {
                            shieldRef.current.material.metalness = v;
                        }
                    },
                    label: "Metalness"
                },
            })
        });
    }

    // Per-rock state
    const [progress, setProgress] = useState(Array(NUM_ROCKS).fill(0)); // Keep for UI updates only
    const [isFalling, setIsFalling] = useState(false);
    const [isReturning, setIsReturning] = useState(false);
    const startTime = useRef(0);

    // Ref to store captured impact state (position, rotation)
    const impactStates = useRef(
        Array.from({ length: NUM_ROCKS }, () => ({
            position: new THREE.Vector3(),
            captured: false,
        }))
    );

    // Imperative API for AnimationManager
    useImperativeHandle(ref, () => ({
        setActive: (active) => {
            startTime.current = performance.now() / 1000;
            if (active) {
                isFallingRef.current = true;
                isReturningRef.current = false;
                setIsFalling(true);
                setIsReturning(false);
                impactStates.current.forEach(s => s.captured = false);
            } else {
                rocksRefs.current.forEach((rockRef, i) => {
                    if (rockRef.current && !impactStates.current[i].captured) {
                        impactStates.current[i].position.copy(rockRef.current.position);
                        impactStates.current[i].captured = true;
                    }
                });
                isFallingRef.current = false;
                isReturningRef.current = true;
                setIsFalling(false);
                setIsReturning(true);
            }
        },
        calmTheStorm: calmTheStorm,
        unleashTheStorm: unleashTheStorm,
        fadeIn: (duration = 1) => {
            gsap.to(overallOpacity.current, { value: 1, duration, ease: "power2.inOut" });
        },
        fadeOut: (duration = 1) => {
            gsap.to(overallOpacity.current, { value: 0, duration, ease: "power2.inOut" });
        },
        cluster: () => { },
        explode: () => { },
        reset: () => { },
        toggleShield: (show = true) => { },
        setShieldProperties: (properties = {}) => { },
        getObject: () => groupRef.current,
        getShield: () => shieldRef.current,
    }));

    const goodModePositions = useRef(generateNonOverlappingPositions(
        NUM_ROCKS,
        (MIN_ORBIT_RADIUS + MAX_ORBIT_RADIUS) / 2 + 0.3, // slightly larger ring
        ROCK_SIZE * 2.3 // larger buffer for more separation
    ));

    // Frame skipping for performance
    const frameCount = useRef(0);

    useFrame((state) => {
        frameCount.current++;
        const time = state.clock.getElapsedTime();
        const tNow = performance.now() / 1000;
        const goodP = goodModeProgress.current.value;
        const currentOverallOpacity = overallOpacity.current.value;

        // Early exit for performance if invisible
        if (currentOverallOpacity < 0.001) {
            if (groupRef.current.visible) groupRef.current.visible = false;
            return;
        }
        if (!groupRef.current.visible) groupRef.current.visible = true;

        if (groupRef.current) {
            groupRef.current.rotation.x = THREE.MathUtils.lerp(0, SATURN_TILT, goodP); // Tilt by about 11 degrees on X axis
        }

        let lightningDidJolt = false;

        // Update progress using refs instead of state
        let newProgress = [...progressRef.current];
        if (isFallingRef.current) {
            const t = Math.min((tNow - startTime.current) / FALL_TIME, 1);
            newProgress = newProgress.map(() => t * t * t);
            if (t >= 1) {
                isFallingRef.current = false;
                setIsFalling(false);
            }
        } else if (isReturningRef.current) {
            const t = Math.min((tNow - startTime.current) / RETURN_TIME, 1);
            const ease = 1 - Math.pow(1 - t, 3);
            newProgress = newProgress.map(() => 1 - ease);
            if (t >= 1) {
                isReturningRef.current = false;
                setIsReturning(false);
            }
        }
        progressRef.current = newProgress;

        // Skip expensive calculations every other frame for performance
        const skipFrame = frameCount.current % 2 === 0;

        for (let i = 0; i < NUM_ROCKS; i++) {
            const evilRock = rocksRefs.current[i].current;
            const goodRock = goodRocksRefs.current[i].current;
            const line = linesRef.current[i].current;
            if (!evilRock || !goodRock || !line) continue;

            // Cross-fade between evil (dodecahedron) and good (sphere) rocks
            evilRock.material.opacity = (1 - goodP) * currentOverallOpacity;
            goodRock.material.opacity = goodP * currentOverallOpacity;
            evilRock.visible = goodP < 1 && currentOverallOpacity > 0;
            goodRock.visible = goodP > 0 && currentOverallOpacity > 0;

            // Only update material properties if they haven't been set yet or if the good mode progress changed significantly
            // Skip expensive material updates on alternate frames
            if (!skipFrame) {
                const goodMaterial = goodRock.material;
                if (!goodMaterial._propertiesSet || Math.abs(goodMaterial._lastGoodP - goodP) > 0.01) {
                    goodMaterial.color.copy(goodRockColors.current[i]);
                    goodMaterial.roughness = 0.05;
                    goodMaterial.metalness = 1.0;
                    goodMaterial.envMapIntensity = 1.5;
                    goodMaterial.emissive.copy(goodRockColors.current[i]);
                    goodMaterial.emissiveIntensity = 2.0;
                    goodMaterial._propertiesSet = true;
                    goodMaterial._lastGoodP = goodP;
                }
            }

            const p = newProgress[i];
            const { phi, theta, orbitRadius, orbitSpeed } = rockProperties.current[i];

            // Lightning appears as random jolts, fades out in good mode
            lineMaterial.opacity = (1 - goodP) * 0.8 * currentOverallOpacity;
            const canJolt = p < 1 && !isReturningRef.current && goodP < 0.5;
            const jolt = canJolt && Math.random() < JOLT_PROBABILITY;
            line.visible = jolt;

            if (jolt) {
                lightningDidJolt = true;
            }

            // Interpolate orbit properties for the good mode transition
            const ringPhi = Math.PI / 2 + (i / NUM_ROCKS - 0.5) * 0.001; // Make ring flatter by reducing vertical spread
            const currentPhi = THREE.MathUtils.lerp(phi, ringPhi, goodP);
            const goodSpeed = 0.1 + ((orbitRadius - MIN_ORBIT_RADIUS) / (MAX_ORBIT_RADIUS - MIN_ORBIT_RADIUS)) * 0.2;
            const currentSpeed = THREE.MathUtils.lerp(orbitSpeed, goodSpeed, goodP);
            const orbitTheta = theta + currentSpeed * time;

            // For good mode, use non-overlapping positions
            let goodPos = goodModePositions.current[i];
            // Interpolate between evil and good positions
            targetOrbitPos.current.set(
                THREE.MathUtils.lerp(
                    orbitRadius * Math.sin(phi) * Math.cos(theta + orbitSpeed * time),
                    goodPos.x,
                    goodP
                ),
                THREE.MathUtils.lerp(
                    orbitRadius * Math.cos(phi),
                    goodPos.y,
                    goodP
                ),
                THREE.MathUtils.lerp(
                    orbitRadius * Math.sin(phi) * Math.sin(theta + orbitSpeed * time),
                    goodPos.z,
                    goodP
                )
            );

            if (isReturningRef.current) {
                finalPosition.current.lerpVectors(impactStates.current[i].position, targetOrbitPos.current, 1 - p);
            } else {
                const currentRadius = orbitRadius + (shieldRadius - orbitRadius) * p;
                basePos.current.set(
                    currentRadius * Math.sin(currentPhi) * Math.cos(orbitTheta),
                    currentRadius * Math.cos(currentPhi),
                    currentRadius * Math.sin(currentPhi) * Math.sin(orbitTheta)
                );
                finalPosition.current.copy(basePos.current);

                if (line.visible) {
                    shieldSurfacePoint.current.copy(basePos.current).normalize().multiplyScalar(shieldRadius);
                    // Add twitching to the lightning origin on the shield
                    twitchOffset.current.set(
                        (Math.random() - 0.5) * SHIELD_TWITCH_AMOUNT,
                        (Math.random() - 0.5) * SHIELD_TWITCH_AMOUNT,
                        (Math.random() - 0.5) * SHIELD_TWITCH_AMOUNT
                    );
                    shieldSurfacePoint.current.add(twitchOffset.current);

                    // Use pre-generated lightning path for better performance
                    const pathIndex = lightningPathIndex.current[i];
                    let path = lightningPaths.current[i][pathIndex];

                    // Regenerate path if empty or cycle to next one
                    if (path.length === 0 || Math.random() < 0.1) { // 10% chance to regenerate
                        path = generateLightningPath(basePos.current, shieldSurfacePoint.current, LIGHTNING_SEGMENTS, LIGHTNING_CHAOS);
                        lightningPaths.current[i][pathIndex] = path;
                        lightningPathIndex.current[i] = (pathIndex + 1) % 5;
                    }

                    line.geometry.setFromPoints(path);
                }

                if (p >= 1) {
                    if (!impactStates.current[i].captured) {
                        impactStates.current[i].position.copy(finalPosition.current);
                        impactStates.current[i].captured = true;
                    }

                    // Jerk logic, scaled by (1 - goodP)
                    const jerkAmount = 1 - goodP;
                    if (jerkAmount > 0.001) {
                        up.current.copy(finalPosition.current).normalize();
                        tangent1.current.set(-up.current.z, 0, up.current.x).normalize();
                        if (tangent1.current.length() < 0.1) tangent1.current.set(0, 1, 0);
                        tangent2.current.crossVectors(up.current, tangent1.current).normalize();
                        const j1 = (Math.sin(time * 7.3) + Math.random() * 0.5) * JERK_MAG * jerkAmount;
                        const j2 = (Math.cos(time * 5.1) + Math.random() * 0.5) * JERK_MAG * jerkAmount;
                        finalPosition.current.add(tangent1.current.multiplyScalar(j1).add(tangent2.current.multiplyScalar(j2)));
                        finalRotation.current.set(
                            (Math.sin(time * 6.1) + Math.random() * 0.5) * JERK_ROT * jerkAmount,
                            (Math.cos(time * 8.2) + Math.random() * 0.5) * JERK_ROT * jerkAmount,
                            (Math.sin(time * 4.7) + Math.random() * 0.5) * JERK_ROT * jerkAmount
                        );
                    }
                }
            }
            evilRock.position.copy(finalPosition.current);
            goodRock.position.copy(finalPosition.current);
            evilRock.rotation.copy(finalRotation.current);
            goodRock.rotation.copy(finalRotation.current);
        }

        if (lightningDidJolt && shieldRef.current && currentOverallOpacity > 0.5) {
            if (shieldFlashTl.current) {
                shieldFlashTl.current.kill();
            }
            shieldRef.current.visible = true;

            shieldFlashTl.current = gsap.timeline({
                onComplete: () => {
                    if (shieldRef.current) {
                        shieldRef.current.visible = false;
                    }
                }
            }).to(shieldRef.current.material, {
                opacity: SHIELD_OPACITY,
                duration: 0.1,
            }).to(shieldRef.current.material, {
                opacity: 0,
                duration: 0.4,
                delay: 0.1
            });
        }
    });

    const goodP = goodModeProgress.current?.value || 0;
    const ringRotationX = THREE.MathUtils.lerp(0, SATURN_TILT, goodP) + Math.PI / 2.95255;

    // Compute faded configs for SaturnRing
    const fadedRingConfigs = RING_CONFIGS.map(cfg => ({
        ...cfg,
        opacity: (cfg.opacity ?? 1) * ringFade
    }));

    return (
        <group ref={groupRef} {...props}>
            {/* Saturn-style rainbow ring, fade in/out */}
            {ringFade > 0.001 && (
                <SaturnRing configs={fadedRingConfigs} position={RING_POSITION} scale={RING_SCALE} rotation={[ringRotationX, 0, 0]} />
            )}
            <Shield ref={shieldRef} radius={shieldRadius} color={shieldColor} />
            {Array.from({ length: NUM_ROCKS }).map((_, i) => (
                <Fragment key={i}>
                    <mesh
                        ref={rocksRefs.current[i]}
                        geometry={dodecahedronGeometry}
                        material={evilRockMaterial}
                        castShadow
                        receiveShadow
                        renderOrder={3}
                    />
                    <mesh
                        ref={goodRocksRefs.current[i]}
                        geometry={sphereGeometry}
                        material={rockMaterials.current[i]}
                        castShadow
                        receiveShadow
                        renderOrder={3}
                    >
                        {/* Inner glow sphere for good mode, now as a child */}
                        <mesh
                            visible={goodModeProgress.current.value > 0.5}
                            scale={glowParams.size}
                        >
                            <sphereGeometry args={[ROCK_SIZE, 16, 16]} />
                            <meshBasicMaterial
                                color={goodRockColors.current[i].clone().lerp(new THREE.Color(0xffffff), 0.5)}
                                transparent
                                opacity={glowParams.opacity}
                                blending={THREE.AdditiveBlending}
                            />
                        </mesh>
                    </mesh>
                </Fragment>
            ))}
            {Array.from({ length: NUM_ROCKS }).map((_, i) => (
                <line key={`line-${i}`} ref={linesRef.current[i]} visible={false}>
                    <bufferGeometry />
                    <primitive object={lineMaterial} />
                </line>
            ))}
        </group>
    );
});

export { Rocks };
export default Rocks; 