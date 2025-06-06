import * as THREE from "three";
import { useRef, useImperativeHandle, forwardRef, useEffect, useState, Fragment } from "react";
import { useFrame } from "@react-three/fiber";
import { useControls } from "leva";
import { gsap } from "gsap";

const NUM_ROCKS = 100;
const MIN_ORBIT_RADIUS = 4.5;
const MAX_ORBIT_RADIUS = 7.5;
const MIN_ORBIT_SPEED = -1;
const MAX_ORBIT_SPEED = 1;
const ROCK_SIZE = 0.2;
const SHIELD_RADIUS = 4;
const SHIELD_COLOR = "blue";
const SHIELD_OPACITY = 0.3;
const FALL_TIME = 1.2; // seconds to fall
const RETURN_TIME = 1.2; // seconds to return
const LIGHTNING_SEGMENTS = 8;
const LIGHTNING_CHAOS = 0.1;
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
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    linewidth: 1,
});

const Shield = forwardRef(({ radius = SHIELD_RADIUS, color = SHIELD_COLOR }, ref) => (
    <mesh ref={ref} visible={false}>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial color={color} transparent opacity={0} roughness={0.1} metalness={0.8} />
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

export const Rocks = forwardRef(({ shieldRadius = SHIELD_RADIUS, shieldColor = SHIELD_COLOR, ...props }, ref) => {
    const groupRef = useRef();
    const shieldRef = useRef();
    const shieldFlashTl = useRef();
    const rocksRefs = useRef(Array.from({ length: NUM_ROCKS }, () => useRef()));
    const goodRocksRefs = useRef(Array.from({ length: NUM_ROCKS }, () => useRef()));
    const linesRef = useRef(Array.from({ length: NUM_ROCKS }, () => useRef()));
    const overallOpacity = useRef({ value: 0 }); // Start fully transparent
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
    const rockMaterials = useRef(Array.from({ length: NUM_ROCKS }, () => evilRockMaterial.clone()));
    const goodRockColors = useRef(Array.from({ length: NUM_ROCKS }, () => new THREE.Color().setHSL(Math.random(), 0.7, 0.6)));

    const calmTheStorm = () => {
        if (goodModeTimeline.current) {
            goodModeTimeline.current.kill();
        }
        goodModeTimeline.current = gsap.to(goodModeProgress.current, {
            value: 1,
            duration: GOOD_MODE_TRANSITION_TIME,
            ease: "power2.inOut",
        });
    };

    const unleashTheStorm = () => {
        if (goodModeTimeline.current) {
            goodModeTimeline.current.kill();
        }
        goodModeTimeline.current = gsap.to(goodModeProgress.current, {
            value: 0,
            duration: GOOD_MODE_TRANSITION_TIME,
            ease: "power2.inOut",
        });
    };

    // Leva controls for jerk intensity
    const leva = useControls("Rocks Jerk", {
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

    // Leva control for "good mode"
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
    });

    // Per-rock state
    const [progress, setProgress] = useState(Array(NUM_ROCKS).fill(0)); // 0 = orbit, 1 = shield
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

    useFrame((state) => {
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

        // Update progress
        let newProgress = [...progress];
        if (isFalling) {
            const t = Math.min((tNow - startTime.current) / FALL_TIME, 1);
            newProgress = newProgress.map(() => t * t * t);
            if (t >= 1) setIsFalling(false);
        } else if (isReturning) {
            const t = Math.min((tNow - startTime.current) / RETURN_TIME, 1);
            const ease = 1 - Math.pow(1 - t, 3);
            newProgress = newProgress.map(() => 1 - ease);
            if (t >= 1) setIsReturning(false);
        }
        setProgress(newProgress);

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

            // Interpolate material properties for the good rock
            const goodMaterial = goodRock.material;
            goodMaterial.color.lerpColors(evilRockMaterial.color, goodRockColors.current[i], goodP);
            goodMaterial.roughness = THREE.MathUtils.lerp(1.0, 0.1, goodP);
            goodMaterial.metalness = THREE.MathUtils.lerp(0.0, 0.2, goodP);

            const p = newProgress[i];
            const { phi, theta, orbitRadius, orbitSpeed } = rockProperties.current[i];

            // Lightning appears as random jolts, fades out in good mode
            lineMaterial.opacity = (1 - goodP) * 0.8 * currentOverallOpacity;
            const canJolt = p < 1 && !isReturning && goodP < 0.5;
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

            const targetOrbitPos = new THREE.Vector3(
                orbitRadius * Math.sin(currentPhi) * Math.cos(orbitTheta),
                orbitRadius * Math.cos(currentPhi),
                orbitRadius * Math.sin(currentPhi) * Math.sin(orbitTheta)
            );

            const finalPosition = new THREE.Vector3();
            const finalRotation = new THREE.Euler(0, 0, 0);

            if (isReturning) {
                finalPosition.lerpVectors(impactStates.current[i].position, targetOrbitPos, 1 - p);
            } else {
                const currentRadius = orbitRadius + (shieldRadius - orbitRadius) * p;
                const basePos = new THREE.Vector3(
                    currentRadius * Math.sin(currentPhi) * Math.cos(orbitTheta),
                    currentRadius * Math.cos(currentPhi),
                    currentRadius * Math.sin(currentPhi) * Math.sin(orbitTheta)
                );
                finalPosition.copy(basePos);

                if (line.visible) {
                    let shieldSurfacePoint = basePos.clone().normalize().multiplyScalar(shieldRadius);
                    // Add twitching to the lightning origin on the shield
                    const twitchOffset = new THREE.Vector3(
                        (Math.random() - 0.5) * SHIELD_TWITCH_AMOUNT,
                        (Math.random() - 0.5) * SHIELD_TWITCH_AMOUNT,
                        (Math.random() - 0.5) * SHIELD_TWITCH_AMOUNT
                    );
                    shieldSurfacePoint.add(twitchOffset);

                    const path = generateLightningPath(basePos, shieldSurfacePoint, LIGHTNING_SEGMENTS, LIGHTNING_CHAOS);
                    line.geometry.setFromPoints(path);
                }

                if (p >= 1) {
                    if (!impactStates.current[i].captured) {
                        impactStates.current[i].position.copy(finalPosition);
                        impactStates.current[i].captured = true;
                    }

                    // Jerk logic, scaled by (1 - goodP)
                    const jerkAmount = 1 - goodP;
                    if (jerkAmount > 0.001) {
                        const up = finalPosition.clone().normalize();
                        let tangent1 = new THREE.Vector3(-up.z, 0, up.x).normalize();
                        if (tangent1.length() < 0.1) tangent1 = new THREE.Vector3(0, 1, 0);
                        const tangent2 = new THREE.Vector3().crossVectors(up, tangent1).normalize();
                        const j1 = (Math.sin(time * 7.3) + Math.random() * 0.5) * JERK_MAG * jerkAmount;
                        const j2 = (Math.cos(time * 5.1) + Math.random() * 0.5) * JERK_MAG * jerkAmount;
                        finalPosition.add(tangent1.multiplyScalar(j1).add(tangent2.multiplyScalar(j2)));
                        finalRotation.set(
                            (Math.sin(time * 6.1) + Math.random() * 0.5) * JERK_ROT * jerkAmount,
                            (Math.cos(time * 8.2) + Math.random() * 0.5) * JERK_ROT * jerkAmount,
                            (Math.sin(time * 4.7) + Math.random() * 0.5) * JERK_ROT * jerkAmount
                        );
                    }
                }
            }
            evilRock.position.copy(finalPosition);
            goodRock.position.copy(finalPosition);
            evilRock.rotation.copy(finalRotation);
            goodRock.rotation.copy(finalRotation);
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

    return (
        <group ref={groupRef} {...props}>
            <Shield ref={shieldRef} radius={shieldRadius} color={shieldColor} />
            {Array.from({ length: NUM_ROCKS }).map((_, i) => (
                <Fragment key={i}>
                    <mesh
                        ref={rocksRefs.current[i]}
                        geometry={dodecahedronGeometry}
                        material={evilRockMaterial}
                        castShadow
                        receiveShadow
                    />
                    <mesh
                        ref={goodRocksRefs.current[i]}
                        geometry={sphereGeometry}
                        material={rockMaterials.current[i]}
                        castShadow
                        receiveShadow
                    />
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