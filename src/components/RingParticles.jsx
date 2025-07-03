import React, { useRef, useImperativeHandle, useEffect, useMemo, forwardRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import { distributedRingPoints, randomColor } from "../utils/particleUtils";

const NUM_PARTICLES = 300;
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

    // Precompute ring positions and directions
    const ringData = useMemo(() => {
        const starts = distributedRingPoints(NUM_PARTICLES, RING_RADIUS, Y_JITTER);
        const dirs = starts.map(pt => pt.clone().normalize());
        const colors = Array.from({ length: NUM_PARTICLES }, () => randomColor());
        return { starts, dirs, colors };
    }, []);

    // Set up per-instance color attribute
    useEffect(() => {
        if (!meshRef.current) return;
        const colors = new Float32Array(NUM_PARTICLES * 3);
        for (let i = 0; i < NUM_PARTICLES; i++) {
            const color = new THREE.Color(ringData.colors[i]);
            colors[i * 3 + 0] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }
        meshRef.current.geometry.setAttribute("color", new THREE.InstancedBufferAttribute(colors, 3));
    }, [ringData]);

    // Animation loop
    useFrame((_, delta) => {
        if (!running.current || !meshRef.current) return;
        progress.current += (delta * PARTICLE_SPEED) / EXPAND_DISTANCE;
        if (progress.current > 1) progress.current = 1;

        for (let i = 0; i < NUM_PARTICLES; i++) {
            // Position = start + dir * (progress * EXPAND_DISTANCE)
            const pos = ringData.starts[i].clone().add(
                ringData.dirs[i].clone().multiplyScalar(progress.current * EXPAND_DISTANCE)
            );
            // Matrix math
            const mat = new THREE.Matrix4();
            mat.makeTranslation(pos.x + center.x, pos.y + center.y, pos.z + center.z);
            // Orient outward
            const look = ringData.dirs[i];
            const up = new THREE.Vector3(0, 1, 0);
            const quat = new THREE.Quaternion().setFromUnitVectors(up, look);
            mat.multiply(new THREE.Matrix4().makeRotationFromQuaternion(quat));
            mat.multiply(new THREE.Matrix4().makeScale(PARTICLE_WIDTH, PARTICLE_LENGTH, PARTICLE_WIDTH));
            meshRef.current.setMatrixAt(i, mat);
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

    return (
        <instancedMesh
            ref={meshRef}
            args={[null, null, NUM_PARTICLES]}
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