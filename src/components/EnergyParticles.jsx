import React, { useRef, useMemo, useEffect, useCallback } from "react";
import { useFrame, extend } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";

const NUM_PARTICLES = 150;
const PARTICLE_RADIUS = 3.5; // Distance from center to spawn
const PARTICLE_LENGTH = 0.15; // Length of streak
const PARTICLE_WIDTH = 0.01; // Width of streak
const PARTICLE_SPEED = 5.2; // Units per second
const FADE_DIST = 1; // Distance from center to start fading
const DELAY_MIN = 0.0;
const DELAY_MAX = 2.2;
const ENERGY_FADE_OUT_DURATION = 0.3; // seconds for fade-out (should match AnimationManager)

// Performance tiers for LOD system
const PERFORMANCE_TIERS = {
    LOW: { particleCount: 50, updateRate: 2 }, // Update every 2 frames
    MEDIUM: { particleCount: 100, updateRate: 1 }, // Update every frame
    HIGH: { particleCount: 150, updateRate: 1 }, // Update every frame
};

// Gold/blue-based palette
const COLORS = [
    "#FFD700", // Gold
    "#00BFFF", // Blue
    "#FFFACD", // Lemon
    "#87CEEB", // Sky blue
    "#F5DEB3", // Wheat
    "#1E90FF", // Dodger blue
    "#FFEC8B", // Light gold
    "#4682B4", // Steel blue
];

function randomColor() {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function randomOnSphere(radius) {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
}

const vertexShader = `
  varying vec3 vColor;
  void main() {
    vColor = color;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  uniform float emissiveStrength;
  uniform float globalOpacity;
  void main() {
    vec3 base = vColor;
    vec3 emissive = vColor * emissiveStrength;
    gl_FragColor = vec4(base + emissive, globalOpacity);
  }
`;

export default React.forwardRef(function EnergyParticles(
    { active, center },
    ref
) {
    const meshRef = useRef();
    const particles = useRef([]);
    const fadeOutTween = useRef(null);
    const globalOpacity = useRef({ value: 1 });
    const frameCount = useRef(0);

    // Performance detection and LOD
    const performanceTier = useMemo(() => {
        // Simple performance detection based on device capabilities
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isLowEnd = navigator.hardwareConcurrency <= 4;

        if (isMobile || isLowEnd) return PERFORMANCE_TIERS.LOW;
        if (window.devicePixelRatio > 2) return PERFORMANCE_TIERS.MEDIUM;
        return PERFORMANCE_TIERS.HIGH;
    }, []);

    // Reusable THREE objects to prevent garbage collection
    const reusableObjects = useMemo(() => ({
        dir: new THREE.Vector3(),
        pos: new THREE.Vector3(),
        look: new THREE.Vector3(),
        up: new THREE.Vector3(0, 1, 0),
        quat: new THREE.Quaternion(),
        mat: new THREE.Matrix4(),
        rotMat: new THREE.Matrix4(),
        scaleMat: new THREE.Matrix4(),
        color: new THREE.Color(),
    }), []);

    // Initialize particles with performance tier
    useEffect(() => {
        const particleCount = performanceTier.particleCount;
        particles.current = Array.from({ length: particleCount }, () => ({
            start: randomOnSphere(PARTICLE_RADIUS),
            color: randomColor(),
            delay: Math.random() * (DELAY_MAX - DELAY_MIN) + DELAY_MIN,
            t: 0,
            opacity: 1,
        }));
    }, [performanceTier.particleCount]);

    // Fade out animation when deactivating
    const fadeOut = useCallback(() => {
        if (fadeOutTween.current) {
            fadeOutTween.current.kill();
        }
        fadeOutTween.current = gsap.to(globalOpacity.current, {
            value: 0,
            duration: ENERGY_FADE_OUT_DURATION,
            ease: "power2.out",
            onComplete: () => {
                if (meshRef.current) {
                    meshRef.current.visible = false;
                }
            }
        });
    }, []);

    // Fade in animation when activating
    const fadeIn = useCallback(() => {
        if (fadeOutTween.current) {
            fadeOutTween.current.kill();
        }
        if (meshRef.current) {
            meshRef.current.visible = true;
        }
        fadeOutTween.current = gsap.to(globalOpacity.current, {
            value: 1,
            duration: 0.2,
            ease: "power2.out"
        });
    }, []);

    // Handle active state changes
    useEffect(() => {
        if (active) {
            fadeIn();
        } else {
            fadeOut();
        }
    }, [active, fadeIn, fadeOut]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (fadeOutTween.current) {
                fadeOutTween.current.kill();
            }
        };
    }, []);

    useFrame((_, delta) => {
        if (!meshRef.current) return;

        // LOD: Skip updates based on performance tier
        frameCount.current++;
        if (frameCount.current % performanceTier.updateRate !== 0) return;

        const now = performance.now();
        const currentOpacity = globalOpacity.current.value;

        for (let i = 0; i < particles.current.length; i++) {
            const p = particles.current[i];
            if (!p) continue;

            // Staggered start
            if (p.t === 0 && now / 1000 < p.delay) continue;

            // Move particle
            p.t += delta * PARTICLE_SPEED;

            // Calculate position using reusable objects
            reusableObjects.dir.subVectors(center, p.start).normalize();
            const totalDist = p.start.distanceTo(center);
            const dist = Math.min(p.t, totalDist);
            reusableObjects.pos.copy(p.start).add(reusableObjects.dir.multiplyScalar(dist));

            // Fade as it nears center
            let opacity = 1;
            if (totalDist - dist < FADE_DIST) {
                opacity = Math.max(0, (totalDist - dist) / FADE_DIST);
            }

            p.opacity = opacity * currentOpacity;

            // Optimized matrix operations using reusable objects
            reusableObjects.mat.makeTranslation(reusableObjects.pos.x, reusableObjects.pos.y, reusableObjects.pos.z);

            // Orient the streak toward the center
            reusableObjects.look.subVectors(center, reusableObjects.pos).normalize();
            reusableObjects.quat.setFromUnitVectors(reusableObjects.up, reusableObjects.look);
            reusableObjects.rotMat.makeRotationFromQuaternion(reusableObjects.quat);
            reusableObjects.scaleMat.makeScale(PARTICLE_WIDTH, PARTICLE_LENGTH, PARTICLE_WIDTH);

            reusableObjects.mat.multiply(reusableObjects.rotMat);
            reusableObjects.mat.multiply(reusableObjects.scaleMat);

            meshRef.current.setMatrixAt(i, reusableObjects.mat);

            // Set per-instance color attribute
            if (meshRef.current.geometry.attributes.color) {
                reusableObjects.color.set(p.color);
                meshRef.current.geometry.attributes.color.setXYZ(i, reusableObjects.color.r, reusableObjects.color.g, reusableObjects.color.b);
            }

            // If reached center, respawn
            if (dist >= totalDist || opacity <= 0.01) {
                p.start = randomOnSphere(PARTICLE_RADIUS);
                p.color = randomColor();
                p.delay = Math.random() * (DELAY_MAX - DELAY_MIN) + DELAY_MIN;
                p.t = 0;
                p.opacity = 1;
            }
        }

        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.geometry.attributes.color) {
            meshRef.current.geometry.attributes.color.needsUpdate = true;
        }

        // Update shader uniform for global opacity
        if (meshRef.current.material && meshRef.current.material.uniforms) {
            meshRef.current.material.uniforms.globalOpacity.value = currentOpacity;
        }
    });

    // Set up per-instance color attribute
    useEffect(() => {
        if (!meshRef.current) return;
        const colors = new Float32Array(particles.current.length * 3);
        for (let i = 0; i < particles.current.length; i++) {
            const color = new THREE.Color(particles.current[i]?.color || "#fff");
            colors[i * 3 + 0] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }
        meshRef.current.geometry.setAttribute("color", new THREE.InstancedBufferAttribute(colors, 3));
    }, [particles.current.length]);

    // Expose methods via ref
    React.useImperativeHandle(ref, () => ({
        fadeOut,
        fadeIn,
        getObject: () => meshRef.current,
    }));

    return (
        <instancedMesh
            ref={meshRef}
            args={[null, null, particles.current.length]}
            visible={active}
            renderOrder={1}
        >
            <boxGeometry args={[1, 1, 1]} />
            <shaderMaterial
                attach="material"
                args={[{
                    uniforms: {
                        emissiveStrength: { value: 10.5 },
                        globalOpacity: { value: 1 },
                    },
                    vertexShader,
                    fragmentShader,
                    transparent: true,
                    vertexColors: true,
                    depthWrite: false,
                }]}
                onBeforeCompile={(shader) => {
                    // Update globalOpacity uniform in the shader
                    shader.uniforms.globalOpacity = { value: 1 };
                }}
            />
        </instancedMesh>
    );
}); 