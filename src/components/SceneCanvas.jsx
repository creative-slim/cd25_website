import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Stars, Center, Float } from "@react-three/drei";
import { Suspense, lazy } from "react";
import { AnimationManager } from "./AnimationManager";
import { useRef } from "react";
// import { Perf } from "r3f-perf";
import { useControls, Leva, folder } from "leva";
import ErrorBoundary from "./ErrorBoundary";

import {
  Bloom,
  DepthOfField,
  EffectComposer,
  // LensFlare,
  Noise,
  SMAA,
  SSAO,
  Vignette,
  ChromaticAberration,
  // ColorAverage,
  Glitch,
  HueSaturation,
  Pixelation,
  ToneMapping,
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
console.log(`Loading model from: ${modelUrl}`);

export function SceneCanvas({ scrollContainerRef }) {
  const kreatonRef = useRef();
  const earthRef = useRef();
  const rotatorRef = useRef();
  const rocksRef = useRef();
  // const pointingFingerRef = useRef();
  const cdTextRef = useRef();

  // Post-processing controls (flat, with folder)
  const {
    bloomEnabled,
    bloomIntensity,
    bloomLuminanceThreshold,
    bloomLuminanceSmoothing,
    dofEnabled,
    dofFocusDistance,
    dofFocalLength,
    dofBokehScale,
    noiseEnabled,
    noiseOpacity,
    vignetteEnabled,
    vignetteEskil,
    vignetteOffset,
    vignetteDarkness,
    chromaticEnabled,
    chromaticOffset,
    glitchEnabled,
    glitchMode,
    glitchStrength,
    pixelationEnabled,
    pixelationGranularity,
    toneMappingEnabled,
    toneMappingMode,
    toneMappingExposure,
    hueSaturationEnabled,
    hueSaturationHue,
    hueSaturationSaturation,
  } = useControls({
    "Post Processing": folder(
      {
        bloomEnabled: { value: true, label: "Enable Bloom" },
        bloomIntensity: { value: 1.2, min: 0, max: 5, step: 0.01 },
        bloomLuminanceThreshold: { value: 0.4, min: 0, max: 1, step: 0.01 },
        bloomLuminanceSmoothing: { value: 0.9, min: 0, max: 1, step: 0.01 },
        dofEnabled: { value: false, label: "Enable Depth of Field" },
        dofFocusDistance: { value: 0, min: 0, max: 1, step: 0.001 },
        dofFocalLength: { value: 0.02, min: 0, max: 0.2, step: 0.001 },
        dofBokehScale: { value: 2, min: 0, max: 10, step: 0.1 },
        noiseEnabled: { value: false, label: "Enable Noise" },
        noiseOpacity: { value: 0.02, min: 0, max: 1, step: 0.01 },
        vignetteEnabled: { value: false, label: "Enable Vignette" },
        vignetteEskil: { value: false },
        vignetteOffset: { value: 0.1, min: 0, max: 1, step: 0.01 },
        vignetteDarkness: { value: 1.1, min: 0, max: 5, step: 0.01 },
        chromaticEnabled: {
          value: false,
          label: "Enable Chromatic Aberration",
        },
        chromaticOffset: { value: [0.002, 0.002] },
        glitchEnabled: { value: false, label: "Enable Glitch" },
        glitchMode: { value: "CONSTANT_WILD" },
        glitchStrength: { value: 0.3, min: 0, max: 1, step: 0.01 },
        pixelationEnabled: { value: false, label: "Enable Pixelation" },
        pixelationGranularity: { value: 1, min: 1, max: 16, step: 1 },
        toneMappingEnabled: { value: false, label: "Enable Tone Mapping" },
        toneMappingMode: { value: "ACES_FILMIC" },
        toneMappingExposure: { value: 1, min: 0, max: 5, step: 0.01 },
        hueSaturationEnabled: { value: false, label: "Enable Hue/Saturation" },
        hueSaturationHue: { value: 0, min: -Math.PI, max: Math.PI, step: 0.01 },
        hueSaturationSaturation: { value: 0, min: -1, max: 1, step: 0.01 },
      },
      { collapsed: true }
    ),
  });

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

  return (
    <>
      {/* <Suspense fallback={<div>Loading 3D scene...</div>}> */}
      {isDevelopment && <Leva collapsed={true} />}
      <Canvas
        gl={{
          alpha: true,
          antialias: true,
          background: false,
          toneMapping: false,
        }}
        dpr={1}
        camera={{
          fov: 55,
          near: 0.1,
          far: 1000,
          position: [0, 0.5, 4],
        }}
      >
        <Suspense fallback={null}>
          {/* <Perf position="top-left" /> */}
          {/* <Selection> */}
          {/* <Select enabled={true}> */}
          <AnimatedStars
            radius={100}
            depth={50}
            count={5000}
          />

          {/* <OrbitControls /> */}

          {/* <primitive object={new THREE.AxesHelper(5)} /> */}

          <Environment files={modelUrl} />
          <ambientLight intensity={0.1} />
          <ErrorBoundary name="Earth2">
            <Earth2 ref={earthRef} position={[0, -1.86, 0]} />
          </ErrorBoundary>
          <ErrorBoundary name="Kreaton">
            <Kreaton ref={kreatonRef} position={[0, 0.02, 0.5]} />
          </ErrorBoundary>
          {/* <ErrorBoundary name="PointingFinger">
            <PointingFinger
              ref={pointingFingerRef}
              position={[-0.2, -0.7, 2.4]}
              rotation={[0, 0, 0]}
              visible={false}
            />
          </ErrorBoundary> */}
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
          <Physics>
            <ErrorBoundary name="Rocks">
              <Rocks
                ref={rocksRef}
                position={[0, 0, 0]}

              />
            </ErrorBoundary>
          </Physics>
          <ErrorBoundary name="Rotator">
            <Rotator ref={rotatorRef} position={[0, -10, 0]} />
          </ErrorBoundary>
          {/* </Select> */}

          {/* <Rotator ref={rotatorRef} position={[0, -10, 0]} /> */}

          <EffectComposer autoClear={false}>
            {bloomEnabled && (
              <Bloom
                intensity={bloomIntensity}
                luminanceThreshold={bloomLuminanceThreshold}
                luminanceSmoothing={bloomLuminanceSmoothing}
              />
            )}

            {dofEnabled && (
              <DepthOfField
                focusDistance={dofFocusDistance}
                focalLength={dofFocalLength}
                bokehScale={dofBokehScale}
              />
            )}

            {noiseEnabled && <Noise opacity={noiseOpacity} />}

            {vignetteEnabled && (
              <Vignette
                eskil={vignetteEskil}
                offset={vignetteOffset}
                darkness={vignetteDarkness}
              />
            )}

            {chromaticEnabled && <ChromaticAberration offset={chromaticOffset} />}

            {glitchEnabled && (
              <Glitch mode={glitchMode} strength={glitchStrength} />
            )}

            {pixelationEnabled && (
              <Pixelation granularity={pixelationGranularity} />
            )}

            {toneMappingEnabled && (
              <ToneMapping
                mode={toneMappingMode}
                exposure={toneMappingExposure}
              />
            )}

            {hueSaturationEnabled && (
              <HueSaturation
                hue={hueSaturationHue}
                saturation={hueSaturationSaturation}
              />
            )}

            <SMAA />
          </EffectComposer>
          {/* </Selection> */}
          <AnimationManager
            kreatonRef={kreatonRef}
            earthRef={earthRef}
            rotatorRef={rotatorRef}
            clumpRef={rocksRef}
            cdTextRef={cdTextRef}
            scrollContainerRef={scrollContainerRef}
          />
        </Suspense>

        {/* Postprocessing */}
        {/* <EffectComposer disableNormalPass>
          <Bloom luminanceThreshold={0} mipmapBlur luminanceSmoothing={0.0} intensity={5} />
          <DepthOfField target={[0, 0, 13]} focalLength={0.3} bokehScale={15} height={700} />
        </EffectComposer> */}
      </Canvas>
      {/* </Suspense> */}
    </>
  );
}
