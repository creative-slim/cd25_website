import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Custom shader for animated rainbow gradient
const getGradientShader = (opacity = 0.7, speed = 0.5, phase = 0) => ({
    uniforms: {
        time: { value: 0 },
        speed: { value: speed },
        phase: { value: phase }
    },
    vertexShader: `
    varying vec3 vPos;
    void main() {
      vPos = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
    fragmentShader: `
    uniform float time;
    uniform float speed;
    uniform float phase;
    varying vec3 vPos;
    // HSV to RGB conversion
    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }
    void main() {
      float angle = atan(vPos.y, vPos.x) + time * speed + phase;
      float t = mod(angle / (2.0 * 3.14159), 1.0);
      vec3 color = hsv2rgb(vec3(t, 1.0, 1.0));
      gl_FragColor = vec4(color, OPACITY_PLACEHOLDER);
    }
  `.replace('OPACITY_PLACEHOLDER', opacity.toFixed(2))
});

/**
 * SaturnRing component renders multiple animated rainbow rings (torus or flat ring).
 * @param {Object} props
 * @param {Array} [props.configs] - Array of ring configs: { type, radius, tube, innerRadius, outerRadius, opacity, scale, position }
 * @param {Array} [props.position] - Position of the group
 * @param {Array} [props.scale] - Scale of the group
 * @param {Array} [props.rotation] - Rotation of the group
 */
export default function SaturnRing({
    configs = [
        { type: 'torus', radius: 0.48, tube: 0.045, opacity: 0.7, speed: 0.5, phase: 0 },
        { type: 'torus', radius: 0.56, tube: 0.025, opacity: 0.4, speed: 0.7, phase: 1.0 },
        { type: 'torus', radius: 0.62, tube: 0.012, opacity: 0.2, speed: 0.3, phase: 2.0 }
    ],
    position = [0, 0, 0],
    scale = [1, 1, 1],
    rotation = [0, 0, 0],
}) {
    const meshRefs = useRef([]);

    useFrame((state) => {
        meshRefs.current.forEach((ref, i) => {
            if (ref && ref.material.uniforms) {
                ref.material.uniforms.time.value = state.clock.elapsedTime;
            }
        });
    });

    return (
        <group position={position} scale={scale} rotation={rotation}>
            {configs.map((cfg, i) => {
                const meshScale = cfg.scale || [1, 1, 1];
                if (cfg.type === 'ring') {
                    // Flat disc ring
                    const inner = cfg.innerRadius ?? (cfg.radius - (cfg.tube ?? 0.1));
                    const outer = cfg.outerRadius ?? (cfg.radius + (cfg.tube ?? 0.1));
                    return (
                        <mesh
                            key={i}
                            ref={el => meshRefs.current[i] = el}
                            raycast={() => null}
                            scale={meshScale}
                            renderOrder={0}
                        >
                            <ringGeometry args={[inner, outer, 128, 1]} />
                            <shaderMaterial
                                attach="material"
                                args={[getGradientShader(cfg.opacity, cfg.speed, cfg.phase)]}
                                transparent
                                side={THREE.DoubleSide}
                                depthWrite={false}
                                blending={THREE.AdditiveBlending}
                            />
                        </mesh>
                    );
                } else {
                    // Default: torus
                    return (
                        <mesh
                            key={i}
                            ref={el => meshRefs.current[i] = el}
                            raycast={() => null}
                            scale={meshScale}
                            renderOrder={0}
                        >
                            <torusGeometry args={[cfg.radius, cfg.tube, 64, 128]} />
                            <shaderMaterial
                                attach="material"
                                args={[getGradientShader(cfg.opacity, cfg.speed, cfg.phase)]}
                                transparent
                                side={THREE.DoubleSide}
                                depthWrite={false}
                                blending={THREE.AdditiveBlending}
                            />
                        </mesh>
                    );
                }
            })}
        </group>
    );
} 