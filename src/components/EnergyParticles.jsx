import React, { useRef, useMemo, useEffect } from "react";
import { useFrame, extend } from "@react-three/fiber";
import * as THREE from "three";

const NUM_PARTICLES = 150;
const PARTICLE_RADIUS = 3.5; // Distance from center to spawn
const PARTICLE_LENGTH = 0.15; // Length of streak
const PARTICLE_WIDTH = 0.01; // Width of streak
const PARTICLE_SPEED = 5.2; // Units per second
const FADE_DIST = 1; // Distance from center to start fading
const DELAY_MIN = 0.0;
const DELAY_MAX = 2.2;
const ENERGY_FADE_OUT_DURATION = 0.3; // seconds for fade-out (should match AnimationManager)

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
  void main() {
    vec3 base = vColor;
    vec3 emissive = vColor * emissiveStrength;
    gl_FragColor = vec4(base + emissive, 1.0);
  }
`;

export default React.forwardRef(function EnergyParticles(
    { active, center },
    ref
) {
    const meshRef = useRef();
    const particles = useRef([]);

    // Always re-initialize particles when NUM_PARTICLES or PARTICLE_RADIUS changes
    useEffect(() => {
        particles.current = Array.from({ length: NUM_PARTICLES }, () => ({
            start: randomOnSphere(PARTICLE_RADIUS),
            color: randomColor(),
            delay: Math.random() * (DELAY_MAX - DELAY_MIN) + DELAY_MIN,
            t: 0,
            opacity: 1,
        }));
    }, [NUM_PARTICLES, PARTICLE_RADIUS]);

    useFrame((_, delta) => {
        if (!meshRef.current) return;
        const now = performance.now();

        for (let i = 0; i < NUM_PARTICLES; i++) {
            const p = particles.current[i];
            if (!p) continue; // Defensive: skip if undefined

            // Always animate particles regardless of visibility
            // Staggered start
            if (p.t === 0 && now / 1000 < p.delay) continue;

            // Move particle
            p.t += delta * PARTICLE_SPEED;

            // Calculate position
            const dir = new THREE.Vector3().subVectors(center, p.start).normalize();
            const totalDist = p.start.distanceTo(center);
            const dist = Math.min(p.t, totalDist);
            const pos = new THREE.Vector3().copy(p.start).add(dir.multiplyScalar(dist));

            // Fade as it nears center
            let opacity = 1;
            if (totalDist - dist < FADE_DIST) {
                opacity = Math.max(0, (totalDist - dist) / FADE_DIST);
            }

            p.opacity = opacity;

            // Set matrix and color
            const mat = new THREE.Matrix4();
            mat.makeTranslation(pos.x, pos.y, pos.z);
            // Orient the streak toward the center
            const look = new THREE.Vector3().subVectors(center, pos).normalize();
            const up = new THREE.Vector3(0, 1, 0);
            const quat = new THREE.Quaternion().setFromUnitVectors(up, look);
            mat.multiply(new THREE.Matrix4().makeRotationFromQuaternion(quat));
            mat.multiply(new THREE.Matrix4().makeScale(PARTICLE_WIDTH, PARTICLE_LENGTH, PARTICLE_WIDTH));
            meshRef.current.setMatrixAt(i, mat);

            // Set per-instance color attribute
            if (meshRef.current.geometry.attributes.color) {
                const color = new THREE.Color(p.color);
                meshRef.current.geometry.attributes.color.setXYZ(i, color.r, color.g, color.b);
            }

            // If reached center, respawn
            if (dist >= totalDist || opacity <= 0.01) {
                // Respawn
                p.start = randomOnSphere(PARTICLE_RADIUS);
                p.color = randomColor();
                p.delay = Math.random() * (DELAY_MAX - DELAY_MIN) + DELAY_MIN;
                p.t = 0;
                p.opacity = 1;
            }
        }

        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.geometry.attributes.color) meshRef.current.geometry.attributes.color.needsUpdate = true;
    });

    // Set up per-instance color attribute
    useEffect(() => {
        if (!meshRef.current) return;
        const colors = new Float32Array(NUM_PARTICLES * 3);
        for (let i = 0; i < NUM_PARTICLES; i++) {
            const color = new THREE.Color(particles.current[i]?.color || "#fff");
            colors[i * 3 + 0] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }
        meshRef.current.geometry.setAttribute("color", new THREE.InstancedBufferAttribute(colors, 3));
    }, [NUM_PARTICLES]);

    return (
        <instancedMesh
            ref={meshRef}
            args={[null, null, NUM_PARTICLES]}
            visible={active}
            renderOrder={1}
        >
            <boxGeometry args={[1, 1, 1]} />
            <shaderMaterial
                attach="material"
                args={[{
                    uniforms: {
                        emissiveStrength: { value: 10.5 },
                    },
                    vertexShader,
                    fragmentShader,
                    transparent: true,
                    vertexColors: true,
                    depthWrite: false,
                }]}
            />
        </instancedMesh>
    );
}); 