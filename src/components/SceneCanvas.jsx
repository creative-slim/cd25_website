import { Canvas } from "@react-three/fiber";
import { Environment, Center, Float, useDetectGPU, AdaptiveEvents } from "@react-three/drei";
import { Suspense, lazy, useMemo } from "react";
import { AnimationManager } from "./AnimationManager";
import { useRef } from "react";
import { Perf } from "r3f-perf";
import { useControls, Leva } from "leva";
import ErrorBoundary from "./ErrorBoundary";

import {
  Bloom,
  DepthOfField,
  EffectComposer,
  // LensFlare,
  Noise,
  // SMAA,
  // SSAO,
  Vignette,
  ChromaticAberration,
  // ColorAverage,
  Glitch,
  Pixelation,
  // ToneMapping,
  // Selection,
  // Select,
} from "@react-three/postprocessing";

import { Physics } from "@react-three/rapier";
// import * as THREE from "three";
import { Rotator } from "./Carosel";
const Header_v1 = lazy(() => import("./CD_header_v1_untransformed"));
const Kreaton = lazy(() => import("./Kreaton_A"));
const Earth2 = lazy(() => import("./Earthv4_UV"));
const Rocks = lazy(() => import("./Rocks"));
// const PointingFinger = lazy(() => import("./PointingFinger").then(module => ({ default: module.PointingFinger })));
// import { CDtext } from "./Site-headings";
// import { NewFont } from "./FontWorkWebpage";
import AnimatedStars from "./AnimatedStars";
// import ShootingStars from "./unused/ShootingStars";
// import { PhysicsDemo } from "./unused/PhysicsDemo";

const isDevelopment = import.meta.env.DEV;
const localModelUrl = "/artist_workshop_100.hdr";
const remoteModelUrl =
  "https://files.creative-directors.com/creative-website/creative25/hdr/artist_workshop_100.hdr";
const modelUrl = isDevelopment ? localModelUrl : remoteModelUrl;

// Separate component for Leva controls to prevent re-renders
function PostProcessingControls() {
  const controls = useControls({
    "Post Processing": {
      collapsed: true,
    },
    bloomEnabled: {
      value: true,
      label: "Bloom Enabled",
    },
    bloomIntensity: {
      value: 1,
      min: 0,
      max: 10,
      step: 0.1,
      label: "Bloom Intensity",
    },
    bloomLuminanceThreshold: {
      value: 0.9,
      min: 0,
      max: 2,
      step: 0.1,
      label: "Bloom Threshold",
    },
    bloomLuminanceSmoothing: {
      value: 0.025,
      min: 0,
      max: 1,
      step: 0.001,
      label: "Bloom Smoothing",
    },
    dofEnabled: {
      value: false,
      label: "Depth of Field Enabled",
    },
    dofFocusDistance: {
      value: 0,
      min: 0,
      max: 1,
      step: 0.01,
      label: "DOF Focus Distance",
    },
    dofFocalLength: {
      value: 0.024,
      min: 0,
      max: 1,
      step: 0.001,
      label: "DOF Focal Length",
    },
    dofBokehScale: {
      value: 2,
      min: 0,
      max: 10,
      step: 0.1,
      label: "DOF Bokeh Scale",
    },
    noiseEnabled: {
      value: false,
      label: "Noise Enabled",
    },
    noiseOpacity: {
      value: 0.02,
      min: 0,
      max: 1,
      step: 0.01,
      label: "Noise Opacity",
    },
    vignetteEnabled: {
      value: false,
      label: "Vignette Enabled",
    },
    vignetteEskil: {
      value: false,
      label: "Vignette Eskil",
    },
    vignetteOffset: {
      value: 0.5,
      min: 0,
      max: 1,
      step: 0.01,
      label: "Vignette Offset",
    },
    vignetteDarkness: {
      value: 0.5,
      min: 0,
      max: 1,
      step: 0.01,
      label: "Vignette Darkness",
    },
    chromaticEnabled: {
      value: false,
      label: "Chromatic Aberration Enabled",
    },
    chromaticOffset: {
      value: 0.003,
      min: 0,
      max: 0.01,
      step: 0.001,
      label: "Chromatic Offset",
    },
    glitchEnabled: {
      value: false,
      label: "Glitch Enabled",
    },
    glitchMode: {
      options: ["constant", "wild"],
      value: "constant",
      label: "Glitch Mode",
    },
    glitchStrength: {
      value: 0.3,
      min: 0,
      max: 1,
      step: 0.01,
      label: "Glitch Strength",
    },
    pixelationEnabled: {
      value: false,
      label: "Pixelation Enabled",
    },
    pixelationGranularity: {
      value: 1,
      min: 1,
      max: 10,
      step: 1,
      label: "Pixelation Granularity",
    },
  });

  return controls;
}

// Separate component for post-processing effects
function PostProcessingEffects({ controls, GPUTier }) {
  // Disable post-processing for low-end GPUs or mobile devices
  if (GPUTier.tier === 0 || GPUTier.isMobile) {
    console.log("Post-processing disabled due to low GPU tier or mobile device");
    return null;
  }

  return (
    <EffectComposer autoClear={false}>
      {controls.bloomEnabled && (
        <Bloom
          intensity={controls.bloomIntensity}
          luminanceThreshold={controls.bloomLuminanceThreshold}
          luminanceSmoothing={controls.bloomLuminanceSmoothing}
        />
      )}

      {controls.dofEnabled && (
        <DepthOfField
          focusDistance={controls.dofFocusDistance}
          focalLength={controls.dofFocalLength}
          bokehScale={controls.dofBokehScale}
        />
      )}

      {controls.noiseEnabled && <Noise opacity={controls.noiseOpacity} />}

      {controls.vignetteEnabled && (
        <Vignette
          eskil={controls.vignetteEskil}
          offset={controls.vignetteOffset}
          darkness={controls.vignetteDarkness}
        />
      )}

      {controls.chromaticEnabled && <ChromaticAberration offset={controls.chromaticOffset} />}

      {controls.glitchEnabled && (
        <Glitch mode={controls.glitchMode} strength={controls.glitchStrength} />
      )}

      {controls.pixelationEnabled && (
        <Pixelation granularity={controls.pixelationGranularity} />
      )}
    </EffectComposer>
  );
}

export function SceneCanvas({ scrollContainerRef }) {
  const GPUTier = useDetectGPU();
  console.log("GPU Tier: ", GPUTier);
  const kreatonRef = useRef();
  const earthRef = useRef();
  const rotatorRef = useRef();
  const rocksRef = useRef();
  // const pointingFingerRef = useRef();
  const cdTextRef = useRef();

  // Get post-processing controls from separate component
  const postProcessingControls = PostProcessingControls();

  // Memoize the model URL to prevent unnecessary recalculations
  const memoizedModelUrl = useMemo(() => {
    console.log(`Loading model from: ${modelUrl}`);
    return modelUrl;
  }, []);

  // Leva control for rocks active state
  useControls({
    "Rocks: Fall to Shield": {
      value: false,
      onChange: (v) => {
        if (rocksRef.current && rocksRef.current.setActive) {
          rocksRef.current.setActive(v);
        }
      },
      label: "Rocks: Fall to Shield",
    },
  });

  // Memoize AnimatedStars props to prevent unnecessary re-renders
  const starsProps = useMemo(() => ({
    radius: 100,
    depth: 50,
    count: 2000 // Reduced from 5000 for better performance
  }), []);

  return (
    <>
      <Suspense fallback={<div>Loading 3D scene...</div>}>
        {isDevelopment && <Leva collapsed={true} />}
        <Canvas
          gl={{
            alpha: true,
            antialias: false, // Disable antialiasing for better performance
            powerPreference: "high-performance", // Prefer dedicated GPU
            stencil: false, // Disable stencil buffer if not needed
            depth: true,
          }}
          dpr={1}
          // dpr={Math.min(window.devicePixelRatio, 2)} // Cap DPR for performance
          // frameloop="demand" // Only render when needed
          performance={{ min: 0.5 }} // Allow frame drops for better performance
          camera={{
            fov: 55,
            near: 0.1,
            far: 1000,
            position: [0, 0.5, 4],
          }}
        >
          <AdaptiveEvents />

          <Suspense name="AnimatedStars" fallback={null}>
            <AnimatedStars {...starsProps} />
          </Suspense>
          <Suspense name="Environment" fallback={null}>
            <Environment files={memoizedModelUrl} />
          </Suspense>
          <Suspense name="Earth2" fallback={null}>
            <ErrorBoundary name="Earth2">
              <Earth2 ref={earthRef} position={[0, -1.86, 0]} />
            </ErrorBoundary>
          </Suspense>
          <Suspense name="Kreaton" fallback={null}>
            <ErrorBoundary name="Kreaton">
              <Kreaton ref={kreatonRef} position={[0, 0.02, 0.5]} />
            </ErrorBoundary>
          </Suspense>
          <Suspense name="Header_v1" fallback={null}>
            <Center position={[0, 2, 0]}>
              <Float speed={1} rotationIntensity={0.5} floatIntensity={2}>
                <ErrorBoundary name="Header_v1">
                  <Header_v1
                    ref={cdTextRef}
                    scale={10}
                  />
                </ErrorBoundary>
              </Float>
            </Center>
          </Suspense>
          <Suspense name="Rocks" fallback={null}>
            <Physics>
              <ErrorBoundary name="Rocks">
                <Rocks
                  ref={rocksRef}
                  position={[0, 0, 0]}

                />
              </ErrorBoundary>
            </Physics>
          </Suspense>
          <Suspense name="Rotator" fallback={null}>
            <ErrorBoundary name="Rotator">
              <Rotator ref={rotatorRef} position={[0, -10, 0]} />
            </ErrorBoundary>
          </Suspense>
          <Suspense name="PostProcessingEffects" fallback={null}>
            <PostProcessingEffects controls={postProcessingControls} GPUTier={GPUTier} />
          </Suspense>
          <Suspense name="AnimationManager" fallback={null}>
            <AnimationManager
              kreatonRef={kreatonRef}
              earthRef={earthRef}
              rotatorRef={rotatorRef}
              clumpRef={rocksRef}
              cdTextRef={cdTextRef}
              scrollContainerRef={scrollContainerRef}
            />
          </Suspense>

          <group name="commented-out">
            {/* <Suspense fallback={null}> */}
            <Perf position="top-left" />
            {/* <Selection> */}
            {/* <Select enabled={true}> */}
            {/* <OrbitControls /> */}
            {/* <primitive object={new THREE.AxesHelper(5)} /> */}
            {/* <ambientLight intensity={0.1} /> */}
            {/* <ErrorBoundary name="PointingFinger">
            <PointingFinger
              ref={pointingFingerRef}
              position={[-0.2, -0.7, 2.4]}
              rotation={[0, 0, 0]}
              visible={false}
            />
          </ErrorBoundary> */}


            {/* Postprocessing */}
            {/* <EffectComposer disableNormalPass>
          <Bloom luminanceThreshold={0} mipmapBlur luminanceSmoothing={0.0} intensity={5} />
          <DepthOfField target={[0, 0, 13]} focalLength={0.3} bokehScale={15} height={700} />
        </EffectComposer> */}
          </group>

        </Canvas>
      </Suspense>
    </>
  );
}
