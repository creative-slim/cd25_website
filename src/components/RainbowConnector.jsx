import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Updated shaders for waving effect
const vertexShader = `
    uniform float time;
    uniform float waveFrequency;
    uniform float waveAmplitude;
    varying vec3 vPos;
    varying float vAngle;

    void main() {
      vPos = position;
      float angle = atan(position.y, position.x);
      vAngle = angle;
      
      vec3 pos = position;
      pos.z += sin(angle * waveFrequency + time * 0.5) * waveAmplitude;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

const fragmentShader = `
    uniform float time;
    uniform float speed;
    uniform float saturation;
    uniform float opacity;
    uniform float hueShift;
    varying float vAngle;

    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    void main() {
      float t = mod((vAngle / (2.0 * 3.14159)) + time * speed + hueShift, 1.0);
      vec3 color = hsv2rgb(vec3(t, saturation, 1.0));
      
      gl_FragColor = vec4(color, opacity);
    }
  `;

// A single wavy ring
const WavyRing = ({
    radius,
    tube,
    speed,
    saturation,
    opacity,
    hueShift,
    waveFrequency,
    waveAmplitude
}) => {
    const meshRef = useRef();

    const shader = {
        uniforms: {
            time: { value: 0 },
            speed: { value: speed },
            saturation: { value: saturation },
            opacity: { value: opacity },
            hueShift: { value: hueShift },
            waveFrequency: { value: waveFrequency },
            waveAmplitude: { value: waveAmplitude }
        },
        vertexShader,
        fragmentShader,
    };

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.material.uniforms.time.value = state.clock.elapsedTime;
        }
    });

    return (
        <mesh ref={meshRef} rotation-x={Math.PI / 2} raycast={() => null}>
            <torusGeometry args={[radius, tube, 16, 200]} />
            <shaderMaterial
                args={[shader]}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}

// The main component that creates multiple wavy stripes
export default function RainbowConnector({ radius }) {
    const ringConfigs = [
        { tube: 0.015, speed: 0.05, saturation: 1.0, opacity: 0.8, hueShift: 0.0, waveFrequency: 15.0, waveAmplitude: 0.15 },
        { tube: 0.02, speed: -0.04, saturation: 1.0, opacity: 0.7, hueShift: 0.1, waveFrequency: 12.0, waveAmplitude: 0.2 },
        { tube: 0.01, speed: 0.08, saturation: 1.0, opacity: 0.9, hueShift: 0.2, waveFrequency: 18.0, waveAmplitude: 0.12 },
        { tube: 0.025, speed: -0.06, saturation: 1.0, opacity: 0.6, hueShift: 0.3, waveFrequency: 10.0, waveAmplitude: 0.25 },
        { tube: 0.012, speed: 0.1, saturation: 1.0, opacity: 0.8, hueShift: 0.4, waveFrequency: 22.0, waveAmplitude: 0.1 }
    ];

    return (
        <group>
            {ringConfigs.map((config, index) => (
                <WavyRing
                    key={index}
                    radius={radius}
                    tube={config.tube}
                    speed={config.speed}
                    saturation={config.saturation}
                    opacity={config.opacity}
                    hueShift={config.hueShift}
                    waveFrequency={config.waveFrequency}
                    waveAmplitude={config.waveAmplitude}
                />
            ))}
        </group>
    );
} 