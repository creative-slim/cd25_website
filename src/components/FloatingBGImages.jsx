import React, { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Image } from '@react-three/drei';
import * as THREE from 'three';

// Dynamically import all web-friendly images from the bg-floating folder
const imageModules = import.meta.glob('../assets/bg-floating/*.{png,jpg,jpeg,webp,svg}', { eager: true });

// Extract URLs for use as textures
const imageUrls = Object.values(imageModules).map((mod) => mod.default).filter(Boolean);

/**
 * FloatingBGImages
 * Renders all images in src/assets/bg-floating/ as floating, animated, non-interactive background elements.
 * Drop PNG, JPG, JPEG, WEBP, or SVG files into the folder and they will appear automatically.
 */
const NUM_IMAGES = imageUrls.length;
const SPREAD = 15; // Controls how far apart images are spread

function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

const FloatingBGImages = () => {
    // Memoize initial random positions, scales, and animation params
    const configs = useMemo(() =>
        imageUrls.map(() => ({
            position: [getRandom(-SPREAD, SPREAD), getRandom(-SPREAD, SPREAD), getRandom(-SPREAD, SPREAD * 0.5) - 10],
            scale: getRandom(0.8, 2.2),
            floatSpeed: getRandom(0.1, 0.4),
            floatAmplitude: getRandom(0.3, 1.2),
            floatPhase: getRandom(0, Math.PI * 2),
            rotSpeed: getRandom(-0.2, 0.2),
        })),
        []
    );

    // Animate floating effect
    useFrame(({ clock }, delta) => {
        // No global animation state needed; handled per image below
    });

    return (
        <group>
            {imageUrls.map((url, i) => (
                <FloatingImage key={url} url={url} config={configs[i]} />
            ))}
        </group>
    );
};

/**
 * FloatingImage
 * Renders a single floating, animated image plane.
 */
function FloatingImage({ url, config }) {
    const ref = React.useRef();
    useFrame(({ clock }) => {
        if (ref.current) {
            // Floating animation
            const t = clock.getElapsedTime();
            ref.current.position.y = config.position[1] + Math.sin(t * config.floatSpeed + config.floatPhase) * config.floatAmplitude;
            ref.current.rotation.z += config.rotSpeed * 0.01;
        }
    });
    return (
        <Image
            ref={ref}
            url={url}
            scale={[config.scale, config.scale, 1]}
            position={config.position}
            transparent
            toneMapped={false}
        // No interaction handlers
        />
    );
}

export default FloatingBGImages; 