import { Canvas } from "@react-three/fiber";
import { Center, Float, useDetectGPU, AdaptiveEvents, Loader } from "@react-three/drei";
import { Suspense, lazy, useMemo, useRef, useState, useCallback } from "react";
import { AnimationManager } from "./AnimationManager";
import { Perf } from "r3f-perf";
import { useControls, Leva, folder } from "leva";
import ErrorBoundary from "./ErrorBoundary";
import { OrbitControls } from "@react-three/drei";
import { CubeTextureLoader } from "three";
import {
  Bloom,
  DepthOfField,
  EffectComposer,
  Noise,
  Vignette,
  ChromaticAberration,
  Glitch,
  Pixelation,
} from "@react-three/postprocessing";

import { Physics } from "@react-three/rapier";
import * as THREE from "three";
import { Rotator } from "./Carosel";
import Env from "./Env";
import EnergyParticles from "./EnergyParticles";
import RingParticles from "./RingParticles";
import FloatingBGImages from "./FloatingBGImages";
const Header_v1 = lazy(() => import("./CD_header_v1_untransformed"));
const Kreaton = lazy(() => import("./Kreaton_A"));
const Earth2 = lazy(() => import("./Earthv4_UV"));
const Rocks = lazy(() => import("./Rocks"));
// const PointingFinger = lazy(() => import("./PointingFinger").then(module => ({ default: module.PointingFinger })));
// import { CDtext } from "./Site-headings";
// import { NewFont } from "./FontWorkWebpage";

// import ShootingStars from "./unused/ShootingStars";
// import { PhysicsDemo } from "./unused/PhysicsDemo";

const isDevelopment = false && import.meta.env.DEV;


// Separate component for Leva controls to prevent re-renders
function PostProcessingControls() {
  // Only show controls in development
  if (!isDevelopment) {
    return {
      bloomEnabled: true,
      bloomIntensity: 0.4,
      bloomLuminanceThreshold: 1,
      bloomLuminanceSmoothing: 0.04,
      dofEnabled: false,
      mipmapBlur: true,
      dofFocusDistance: 0,
      dofFocalLength: 0.024,
      dofBokehScale: 2,
      noiseEnabled: false,
      noiseOpacity: 0.02,
      vignetteEnabled: false,
      vignetteEskil: false,
      vignetteOffset: 0.5,
      vignetteDarkness: 0.5,
      chromaticEnabled: false,
      chromaticOffset: 0.003,
      glitchEnabled: false,
      glitchMode: "constant",
      glitchStrength: 0.3,
      pixelationEnabled: false,
      pixelationGranularity: 1,
    };
  }

  const controls = useControls({
    "Post Processing": folder(
      {
        bloomEnabled: {
          value: true,
          label: "Bloom Enabled",
        },
        bloomIntensity: {
          value: 0.4,
          min: 0,
          max: 10,
          step: 0.1,
          label: "Bloom Intensity",
        },
        bloomLuminanceThreshold: {
          value: 1,
          min: 0,
          max: 2,
          step: 0.1,
          label: "Bloom Threshold",
        },
        bloomLuminanceSmoothing: {
          value: 0.04,
          min: 0,
          max: 1,
          step: 0.001,
          label: "Bloom Smoothing",
        },
        dofEnabled: {
          value: false,
          label: "Depth of Field Enabled",
        },
        mipmapBlur: {
          value: true,
          label: "Bloom Mipmap Blur",
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
      },
      { collapsed: true }
    ),
  });

  return controls;
}

// Separate component for lighting controls
function LightingControls() {
  // Only show controls in development
  if (!isDevelopment) {
    return {
      ambientLightEnabled: true,
      ambientLightIntensity: 1,
      ambientLightColor: "#ffffff",
      spotLightEnabled: true,
      spotLightIntensity: 500,
      spotLightColor: "#ffffff",
      spotLightPosition: { x: 10, y: 10, z: 5 },
      spotLightScale: 1,
      spotLightAngle: 0.3,
      spotLightPenumbra: 0,
      spotLightDistance: 0,
      spotLightDecay: 2,
      pointLightEnabled: true,
      pointLightIntensity: 5,
      pointLightColor: "#ffffff",
      pointLightPosition: { x: -10, y: -10, z: -10 },
      pointLightDistance: 0,
      pointLightDecay: 2,
    };
  }

  const controls = useControls({
    "Lighting": folder(
      {
        // Ambient Light Controls
        ambientLightEnabled: {
          value: true,
          label: "Ambient Light Enabled",
        },
        ambientLightIntensity: {
          value: 1,
          min: 0,
          max: 5,
          step: 0.1,
          label: "Ambient Light Intensity",
        },
        ambientLightColor: {
          value: "#ffffff",
          label: "Ambient Light Color",
        },
        // Spot Light Controls
        spotLightEnabled: {
          value: true,
          label: "Spot Light Enabled",
        },
        spotLightIntensity: {
          value: 500,
          min: 0,
          max: 1000,
          step: 10,
          label: "Spot Light Intensity",
        },
        spotLightColor: {
          value: "#ffffff",
          label: "Spot Light Color",
        },
        spotLightPosition: {
          value: { x: 10, y: 10, z: 5 },
          label: "Spot Light Position",
        },
        spotLightScale: {
          value: 1,
          min: 0.1,
          max: 5,
          step: 0.1,
          label: "Spot Light Scale",
        },
        spotLightAngle: {
          value: 0.3,
          min: 0,
          max: Math.PI / 2,
          step: 0.01,
          label: "Spot Light Angle",
        },
        spotLightPenumbra: {
          value: 0,
          min: 0,
          max: 1,
          step: 0.01,
          label: "Spot Light Penumbra",
        },
        spotLightDistance: {
          value: 0,
          min: 0,
          max: 100,
          step: 1,
          label: "Spot Light Distance",
        },
        spotLightDecay: {
          value: 2,
          min: 0,
          max: 5,
          step: 0.1,
          label: "Spot Light Decay",
        },
        // Point Light Controls
        pointLightEnabled: {
          value: true,
          label: "Point Light Enabled",
        },
        pointLightIntensity: {
          value: 5,
          min: 0,
          max: 100,
          step: 0.5,
          label: "Point Light Intensity",
        },
        pointLightColor: {
          value: "#ffffff",
          label: "Point Light Color",
        },
        pointLightPosition: {
          value: { x: -10, y: -10, z: -10 },
          label: "Point Light Position",
        },
        pointLightDistance: {
          value: 0,
          min: 0,
          max: 100,
          step: 1,
          label: "Point Light Distance",
        },
        pointLightDecay: {
          value: 2,
          min: 0,
          max: 5,
          step: 0.1,
          label: "Point Light Decay",
        },
      },
      { collapsed: true }
    ),
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
  const energyParticlesRef = useRef();
  const ringParticlesRef = useRef();

  // Energy particles state - starts hidden by default
  const [energyParticlesActive, setEnergyParticlesActive] = useState(false);

  // Helper to get Kreaton's position (center)
  const getKreatonCenter = useCallback(() => {
    if (kreatonRef.current && kreatonRef.current.getObject) {
      const obj = kreatonRef.current.getObject();
      if (obj) {
        // World position
        const pos = new THREE.Vector3();
        obj.getWorldPosition(pos);
        pos.y += 1; // Move up to chest
        return pos;
      }
    }
    // Default fallback
    const fallback = new THREE.Vector3(0, 0.02, 0.5);
    fallback.y += 1;
    return fallback;
  }, []);

  // Get post-processing controls from separate component
  const postProcessingControls = PostProcessingControls();

  // Get lighting controls from separate component
  const lightingControls = LightingControls();

  // Leva control for rocks active state - only in development
  if (isDevelopment) {
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
  }

  return (
    <>
      {/* {isDevelopment && <Leva collapsed={true} />} */}
      <Canvas
        gl={{
          alpha: true,
          antialias: false, // Disable antialiasing for better performance
          powerPreference: "high-performance", // Prefer dedicated GPU
          stencil: false, // Disable stencil buffer if not needed
          depth: true,
        }}
        performance={{ min: 0.5, max: 60 }} // Cap at 60 FPS
        dpr={1}
        // dpr={Math.min(window.devicePixelRatio, 2)} // Cap DPR for performance
        camera={{
          fov: 55,
          near: 0.1,
          far: 1000,
          position: [0, 0.5, 4],
        }}
      >
        <AdaptiveEvents />

        <Suspense name="Environment" fallback={null}>
          <Env />
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
          <Center position={[-1, 2.2, 0]}>
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
        <Suspense name="EnergyParticles" fallback={null}>
          <EnergyParticles
            ref={energyParticlesRef}
            active={energyParticlesActive}
            center={getKreatonCenter()}
          />
        </Suspense>
        <Suspense name="RingParticles" fallback={null}>
          <RingParticles ref={ringParticlesRef} center={getKreatonCenter()} />
        </Suspense>
        <Suspense name="AnimationManager" fallback={null}>
          <AnimationManager
            kreatonRef={kreatonRef}
            earthRef={earthRef}
            rotatorRef={rotatorRef}
            clumpRef={rocksRef}
            cdTextRef={cdTextRef}
            scrollContainerRef={scrollContainerRef}
            setEnergyParticlesActive={setEnergyParticlesActive}
            ringParticlesRef={ringParticlesRef}
          />
        </Suspense>
        {/* <Suspense name="FloatingBGImages" fallback={null}>
          <FloatingBGImages />
        </Suspense> */}

        <group name="commented-out">
          {/* <Suspense fallback={null}> */}
          {/* <Perf position="top-left" /> */}
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
      <Loader
        dataInterpolation={(p) => alert("----------- Loader progress: " + p.toFixed(2))} // Text 
      />
      {/* TEMP: Test button to trigger ring explosion */}
      {isDevelopment && (
        <button
          style={{ position: "absolute", top: 10, right: 10, zIndex: 1000 }}
          onClick={() => ringParticlesRef.current?.triggerExplosion()}
        >
          Trigger Ring Explosion
        </button>
      )}

    </>
  );
}
