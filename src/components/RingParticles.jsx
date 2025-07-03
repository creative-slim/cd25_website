import React, { useRef, useImperativeHandle, useEffect, useMemo, forwardRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import { distributedRingPoints, randomColor } from "../utils/particleUtils";

// Performance tiers for LOD system
const PERFORMANCE_TIERS = {
    LOW: { particleCount: 100, updateRate: 2 }, // Update every 2 frames
    MEDIUM: { particleCount: 200, updateRate: 1 }, // Update every frame
    HIGH: { particleCount: 300, updateRate: 1 }, // Update every frame
};

const RING_RADIUS = 3.5;
const PARTICLE_LENGTH = 0.15;
const PARTICLE_WIDTH = 0.01;
const PARTICLE_SPEED = 20.0; // units per second
const EXPAND_DISTANCE = 30.5; // how far particles travel outward
const FADE_OUT_DURATION = 0.5; // seconds
const Y_JITTER = 0.1;

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

const RingParticles = forwardRef(function RingParticles({ center = new THREE.Vector3(0, 0, 0) }, ref) {
    const meshRef = useRef();
    const particles = useRef([]); // {start, dir, color}
    const progress = useRef(0); // 0 to 1
    const globalOpacity = useRef({ value: 0 });
    const running = useRef(false);
    const fadeTween = useRef(null);
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

    // Precompute ring positions and directions
    const ringData = useMemo(() => {
        const particleCount = performanceTier.particleCount;
        const starts = distributedRingPoints(particleCount, RING_RADIUS, Y_JITTER);
        const dirs = starts.map(pt => pt.clone().normalize());
        const colors = Array.from({ length: particleCount }, () => randomColor());
        return { starts, dirs, colors };
    }, [performanceTier.particleCount]);

    // Set up per-instance color attribute
    useEffect(() => {
        if (!meshRef.current) return;
        const particleCount = performanceTier.particleCount;
        const colors = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
            const color = new THREE.Color(ringData.colors[i]);
            colors[i * 3 + 0] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }
        meshRef.current.geometry.setAttribute("color", new THREE.InstancedBufferAttribute(colors, 3));
    }, [ringData, performanceTier.particleCount]);

    // Reusable THREE objects to prevent garbage collection
    const reusableObjects = useMemo(() => ({
        pos: new THREE.Vector3(),
        mat: new THREE.Matrix4(),
        up: new THREE.Vector3(0, 1, 0),
        quat: new THREE.Quaternion(),
        rotMat: new THREE.Matrix4(),
        scaleMat: new THREE.Matrix4(),
    }), []);

    // Animation loop
    useFrame((_, delta) => {
        if (!running.current || !meshRef.current) return;

        // LOD: Skip updates based on performance tier
        frameCount.current++;
        if (frameCount.current % performanceTier.updateRate !== 0) return;

        progress.current += (delta * PARTICLE_SPEED) / EXPAND_DISTANCE;
        if (progress.current > 1) progress.current = 1;

        const particleCount = performanceTier.particleCount;
        for (let i = 0; i < particleCount; i++) {
            // Position = start + dir * (progress * EXPAND_DISTANCE)
            reusableObjects.pos.copy(ringData.starts[i]).add(
                ringData.dirs[i].clone().multiplyScalar(progress.current * EXPAND_DISTANCE)
            );

            // Matrix math using reusable objects
            reusableObjects.mat.makeTranslation(
                reusableObjects.pos.x + center.x,
                reusableObjects.pos.y + center.y,
                reusableObjects.pos.z + center.z
            );

            // Orient outward
            const look = ringData.dirs[i];
            reusableObjects.quat.setFromUnitVectors(reusableObjects.up, look);
            reusableObjects.rotMat.makeRotationFromQuaternion(reusableObjects.quat);
            reusableObjects.scaleMat.makeScale(PARTICLE_WIDTH, PARTICLE_LENGTH, PARTICLE_WIDTH);

            reusableObjects.mat.multiply(reusableObjects.rotMat);
            reusableObjects.mat.multiply(reusableObjects.scaleMat);

            meshRef.current.setMatrixAt(i, reusableObjects.mat);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
        // Update opacity uniform
        if (meshRef.current.material && meshRef.current.material.uniforms) {
            meshRef.current.material.uniforms.globalOpacity.value = globalOpacity.current.value;
        }
    });

    // Expose triggerExplosion via ref
    useImperativeHandle(ref, () => ({
        triggerExplosion: () => {
            if (!meshRef.current) return;
            // Reset
            progress.current = 0;
            globalOpacity.current.value = 1;
            running.current = true;
            meshRef.current.visible = true;
            // Fade out after expansion
            if (fadeTween.current) fadeTween.current.kill();
            fadeTween.current = gsap.to(globalOpacity.current, {
                value: 0,
                delay: FADE_OUT_DURATION, // Wait for expansion to finish
                duration: FADE_OUT_DURATION,
                ease: "power2.out",
                onUpdate: () => {
                    if (meshRef.current.material && meshRef.current.material.uniforms) {
                        meshRef.current.material.uniforms.globalOpacity.value = globalOpacity.current.value;
                    }
                },
                onComplete: () => {
                    running.current = false;
                    meshRef.current.visible = false;
                }
            });
        },
        getObject: () => meshRef.current,
    }));

    // Hide by default
    useEffect(() => {
        if (meshRef.current) meshRef.current.visible = false;
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // Kill any GSAP tweens
            if (fadeTween.current) {
                fadeTween.current.kill();
            }

            // Dispose of material if it exists
            if (meshRef.current && meshRef.current.material) {
                meshRef.current.material.dispose();
            }
        };
    }, []);

    return (
        <instancedMesh
            ref={meshRef}
            args={[null, null, performanceTier.particleCount]}
            visible={false}
            renderOrder={2}
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
                onBeforeCompile={shader => {
                    shader.uniforms.globalOpacity = { value: 1 };
                }}
            />
        </instancedMesh>
    );
});

export default RingParticles; 