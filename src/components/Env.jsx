import { useTexture, Environment, Stars } from "@react-three/drei";
import { EquirectangularReflectionMapping, SRGBColorSpace } from "three";
import { useRef, useCallback, useMemo, Suspense } from "react";
import { useFrame } from "@react-three/fiber";

const isDevelopment = import.meta.env.DEV;
const backgroundTextureLocalUrl = "/sci-fi-nebula-space-planet_4K.webp";
const lightingTextureLocalUrl = "/artist_workshop_100.hdr";
const lightingTextureRemoteUrl = "https://files.creative-directors.com/creative-website/creative25/hdr/artist_workshop_100.hdr";
const backgroundTextureRemoteUrl =
    "https://files.creative-directors.com/creative-website/creative25/background/sci-fi-nebula-space-planet_4K.webp";
const backgroundTextureUrl = isDevelopment ? backgroundTextureLocalUrl : backgroundTextureRemoteUrl;

// AnimatedStars component moved from SceneCanvas
function AnimatedStars(props) {
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

export default function Env() {
    const lightingTextureUrl = isDevelopment ? lightingTextureLocalUrl : lightingTextureRemoteUrl;

    const backgroundTexture = useTexture(backgroundTextureUrl);

    backgroundTexture.mapping = EquirectangularReflectionMapping;
    backgroundTexture.colorSpace = SRGBColorSpace;

    // Memoize AnimatedStars props to prevent unnecessary re-renders
    const starsProps = useMemo(() => ({
        radius: 100,
        depth: 50,
        count: 2000 // Reduced from 5000 for better performance
    }), []);



    return (
        <>
            <Suspense name="AnimatedStars" fallback={null}>
                <AnimatedStars {...starsProps} />
            </Suspense>

            <primitive object={backgroundTexture} attach="background" />

            <Environment
                files={lightingTextureUrl}
            />
        </>
    );
}