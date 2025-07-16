/**
 * SaturnRing Component - Animated Rainbow Rings
 * 
 * A React Three Fiber component that renders multiple animated rainbow rings
 * with custom GLSL shaders for smooth color transitions and performance optimization.
 * 
 * @fileoverview
 * This component creates animated rainbow rings that can be used as decorative
 * elements, portals, or visual effects in 3D scenes. It supports both torus
 * and flat ring geometries with customizable properties.
 * 
 * @example Basic Usage
 * ```jsx
 * import SaturnRing from './SaturnRing';
 * 
 * // Basic usage with default config
 * <SaturnRing />
 * 
 * // Custom configuration
 * <SaturnRing 
 *   configs={[
 *     { type: 'torus', radius: 0.48, tube: 0.045, opacity: 0.7, speed: 0.5, phase: 0 },
 *     { type: 'ring', radius: 0.56, tube: 0.025, opacity: 0.4, speed: 0.7, phase: 1.0 },
 *     { type: 'torus', radius: 0.62, tube: 0.012, opacity: 0.2, speed: 0.3, phase: 2.0 }
 *   ]}
 *   position={[0, 0, 0]}
 *   scale={[1, 1, 1]}
 *   rotation={[Math.PI / 2, 0, 0]}
 * />
 * ```
 * 
 * @example Advanced Usage with Fade Effect
 * ```jsx
 * const [ringFade, setRingFade] = useState(0);
 * 
 * const ringConfigs = [
 *   { type: 'ring', radius: 3.5, tube: 1, opacity: 0.7, speed: 0.5, phase: 0 },
 *   { type: 'ring', radius: 4.6, tube: 0.7, opacity: 0.4, speed: 0.7, phase: 1.0 },
 *   { type: 'ring', radius: 5.4, tube: 1, opacity: 0.2, speed: 0.3, phase: 2.0 }
 * ];
 * 
 * const fadedConfigs = ringConfigs.map(cfg => ({
 *   ...cfg,
 *   opacity: (cfg.opacity ?? 1) * ringFade
 * }));
 * 
 * <SaturnRing 
 *   configs={fadedConfigs} 
 *   position={[0, 0, 0]} 
 *   scale={[1, 1, 1]} 
 *   rotation={[Math.PI / 2, 0, 0]} 
 * />
 * ```
 * 
 * @example Integration Steps
 * 1. Copy this file to your project's components directory
 * 2. Install required dependencies:
 *    npm install @react-three/fiber @react-three/drei three react
 * 3. Import and use in your React Three Fiber scene
 * 
 * @dependencies
 * - @react-three/fiber: ^9.1.2 (for useFrame hook)
 * - @react-three/drei: ^10.0.0 (for Three.js utilities)
 * - three: ^0.177.0 (Three.js core)
 * - react: ^19.1.0 (React core)
 * 
 * @performance
 * - Uses raycast={() => null} to disable raycasting for better performance
 * - Custom shaders are optimized for smooth animation
 * - Additive blending for glowing effects
 * - Render order set to 0 for proper layering
 * 
 * @customization
 * - Colors: Modify HSV values in the fragment shader
 * - Animation: Control speed through config.speed property
 * - Geometry: Choose between 'torus' and 'ring' types
 * - Blending: Currently uses THREE.AdditiveBlending
 * 
 * @props {Object} props - Component props
 * @props {Array} [props.configs] - Array of ring configurations
 * @props {Array} [props.position] - Position of the group [x, y, z]
 * @props {Array} [props.scale] - Scale of the group [x, y, z]
 * @props {Array} [props.rotation] - Rotation of the group [x, y, z]
 * 
 * @config {Object} config - Individual ring configuration
 * @config {'torus'|'ring'} config.type - Geometry type ('torus' or 'ring')
 * @config {number} config.radius - Main radius of the ring
 * @config {number} config.tube - Thickness for torus, width for ring
 * @config {number} [config.innerRadius] - Inner radius (for ring type only)
 * @config {number} [config.outerRadius] - Outer radius (for ring type only)
 * @config {number} config.opacity - Transparency (0-1)
 * @config {number} config.speed - Animation speed multiplier
 * @config {number} config.phase - Animation phase offset
 * @config {Array} [config.scale] - Individual ring scale [x, y, z]
 * 
 * @defaults
 * Default configs create a 3-ring system with:
 * - Inner torus: radius 0.48, tube 0.045, opacity 0.7, speed 0.5
 * - Middle torus: radius 0.56, tube 0.025, opacity 0.4, speed 0.7
 * - Outer torus: radius 0.62, tube 0.012, opacity 0.2, speed 0.3
 */

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Creates a custom GLSL shader for animated rainbow gradient effects
 * @param {number} opacity - Transparency level (0-1)
 * @param {number} speed - Animation speed multiplier
 * @param {number} phase - Animation phase offset
 * @returns {Object} Shader configuration with uniforms, vertex and fragment shaders
 */
const getGradientShader = (opacity = 0.7, speed = 0.5, phase = 0) => ({
    uniforms: {
        time: { value: 0 },        // Current time for animation
        speed: { value: speed },   // Animation speed multiplier
        phase: { value: phase }    // Phase offset for staggered animations
    },
    vertexShader: `
    varying vec3 vPos;
    void main() {
      vPos = position;  // Pass position to fragment shader for angle calculation
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
    fragmentShader: `
    uniform float time;
    uniform float speed;
    uniform float phase;
    varying vec3 vPos;
    
    // HSV to RGB conversion for smooth rainbow colors
    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }
    
    void main() {
      // Calculate angle around the ring for color mapping
      float angle = atan(vPos.y, vPos.x) + time * speed + phase;
      // Normalize to 0-1 range for color interpolation
      float t = mod(angle / (2.0 * 3.14159), 1.0);
      // Generate rainbow color using HSV with full saturation and value
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
    // Store references to all mesh objects for animation updates
    const meshRefs = useRef([]);

    // Animation loop - updates time uniform for all rings
    useFrame((state) => {
        meshRefs.current.forEach((ref, i) => {
            if (ref && ref.material.uniforms) {
                // Update time uniform to drive the rainbow animation
                ref.material.uniforms.time.value = state.clock.elapsedTime;
            }
        });
    });

    return (
        <group position={position} scale={scale} rotation={rotation}>
            {configs.map((cfg, i) => {
                const meshScale = cfg.scale || [1, 1, 1];

                if (cfg.type === 'ring') {
                    // Flat disc ring geometry - good for wide, flat rings
                    const inner = cfg.innerRadius ?? (cfg.radius - (cfg.tube ?? 0.1));
                    const outer = cfg.outerRadius ?? (cfg.radius + (cfg.tube ?? 0.1));
                    return (
                        <mesh
                            key={i}
                            ref={el => meshRefs.current[i] = el}
                            raycast={() => null}  // Disable raycasting for performance
                            scale={meshScale}
                            renderOrder={0}  // Ensure proper layering
                        >
                            <ringGeometry args={[inner, outer, 128, 1]} />
                            <shaderMaterial
                                attach="material"
                                args={[getGradientShader(cfg.opacity, cfg.speed, cfg.phase)]}
                                transparent
                                side={THREE.DoubleSide}  // Render both sides
                                depthWrite={false}       // Allow transparency blending
                                blending={THREE.AdditiveBlending}  // Glowing effect
                            />
                        </mesh>
                    );
                } else {
                    // Default: torus geometry - good for thick, 3D rings
                    return (
                        <mesh
                            key={i}
                            ref={el => meshRefs.current[i] = el}
                            raycast={() => null}  // Disable raycasting for performance
                            scale={meshScale}
                            renderOrder={0}  // Ensure proper layering
                        >
                            <torusGeometry args={[cfg.radius, cfg.tube, 64, 128]} />
                            <shaderMaterial
                                attach="material"
                                args={[getGradientShader(cfg.opacity, cfg.speed, cfg.phase)]}
                                transparent
                                side={THREE.DoubleSide}  // Render both sides
                                depthWrite={false}       // Allow transparency blending
                                blending={THREE.AdditiveBlending}  // Glowing effect
                            />
                        </mesh>
                    );
                }
            })}
        </group>
    );
} 