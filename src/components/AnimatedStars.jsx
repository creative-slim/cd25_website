import { useRef, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";

export default function AnimatedStars(props) {
    const starsRef = useRef();

    // Memoize the animation function to prevent recreation on every render
    const animateStars = useCallback((state, delta) => {
        if (starsRef.current) {
            starsRef.current.rotation.y += delta * 0.01; // Slow rotation
            starsRef.current.rotation.x += delta * 0.002; // Subtle drift
        }
    }, []);

    useFrame(animateStars);

    return (
        <group ref={starsRef}>
            <Stars {...props} />
        </group>
    );
} 