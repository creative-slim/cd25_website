import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Stars, Center } from "@react-three/drei";
import { Suspense } from "react";
import { AnimationManager } from "./AnimationManager";
import { useRef } from "react";
import { Perf } from "r3f-perf";
import { useControls, Leva, folder } from "leva";

import {
  Bloom,
  DepthOfField,
  EffectComposer,
  LensFlare,
  Noise,
  SMAA,
  SSAO,
  Vignette,
  ChromaticAberration,
  ColorAverage,
  Glitch,
  HueSaturation,
  Pixelation,
  ToneMapping,
} from "@react-three/postprocessing";

import { Physics } from "@react-three/cannon";
import * as THREE from "three";
import { Rotator } from "./Carosel";
import { Clump } from "./Clump";
import { Kreaton } from "./Kreaton_A";
import { Earth2 } from "./Earthv4_UV";
import { PointingFinger } from "./PointingFinger";
import { CDtext } from "./Site-headings";
import { NewFont } from "./FontWorkWebpage";
import { Header_v1 } from "./CD_header_v1_untransformed";

const isDevelopment = import.meta.env.DEV;
const localModelUrl = "/artist_workshop_4k.hdr";
const remoteModelUrl =
  "https://files.creative-directors.com/creative-website/creative25/glbs/artist_workshop_4k.hdr";
const modelUrl = isDevelopment ? localModelUrl : remoteModelUrl;
console.log(`Loading model from: ${modelUrl}`);

export function SceneCanvas({ scrollContainerRef }) {
  const kreatonRef = useRef();
  const earthRef = useRef();
  const rotatorRef = useRef();
  const clumpRef = useRef();
  const pointingFingerRef = useRef();
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

  return (
    <Suspense fallback={<div>Loading 3D scene...</div>}>
      <Leva collapsed={false} />
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

          <Stars
            radius={100} // Radius of the inner sphere (default=100)
            depth={50} // Depth of area where stars should form (default=50)
            count={5000} // Amount of stars (default=5000)
          />

          {/* <OrbitControls /> */}

          <Environment files={modelUrl} />
          <ambientLight intensity={0.1} />
          <Earth2 ref={earthRef} position={[0, -1.86, 0]} />
          <Kreaton ref={kreatonRef} position={[0, 0.02, 0.5]} />
          <Rotator ref={rotatorRef} position={[0, -10, 0]} />
          <PointingFinger
            ref={pointingFingerRef}
            position={[-0.2, -0.7, 2.4]}
            rotation={[0, 0, 0]}
            visible={false}
          />

          <Center position={[0, 2, 0]}>
            <Header_v1
              ref={cdTextRef}
              scale={10}
            // rotation={[Math.PI / 2, 0, 0]}
            />
          </Center>

          <Physics>
            <Clump
              ref={clumpRef}
              position={[0, 0, 0]}
              shieldColor="blue"
              shieldRadius={7}
            />
          </Physics>
        </Suspense>

        <AnimationManager
          kreatonRef={kreatonRef}
          earthRef={earthRef}
          rotatorRef={rotatorRef}
          clumpRef={clumpRef}
          pointingFingerRef={pointingFingerRef}
          cdTextRef={cdTextRef}
          scrollContainerRef={scrollContainerRef}
        />

        <EffectComposer>
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

        {/* Postprocessing */}
        {/* <EffectComposer disableNormalPass>
          <Bloom luminanceThreshold={0} mipmapBlur luminanceSmoothing={0.0} intensity={5} />
          <DepthOfField target={[0, 0, 13]} focalLength={0.3} bokehScale={15} height={700} />
        </EffectComposer> */}
      </Canvas>
    </Suspense>
  );
}
