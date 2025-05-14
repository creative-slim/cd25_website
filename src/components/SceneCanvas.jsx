import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Stars, Center } from "@react-three/drei";
import { Suspense } from "react";
import { AnimationManager } from "./AnimationManager";
import { useRef } from "react";
import { Perf } from 'r3f-perf';

import { Bloom, DepthOfField, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'

import { Physics } from "@react-three/cannon";
import * as THREE from "three";
import { Rotator } from "./Carosel";
import { Clump } from "./Clump";
import { Kreaton } from "./Kreaton_A";
import { Earth2 } from "./Earthv4_UV";
import { PointingFinger } from "./PointingFinger"; // Import PointingFinger
import { CDtext } from "./Site-headings";
import { NewFont } from "./FontWorkWebpage";
import { Header_v1 } from "./CD_header_v1_untransformed";

const isDevelopment = import.meta.env.DEV;
const localModelUrl = "/artist_workshop_4k.hdr";
const remoteModelUrl =
  "https://files.creative-directors.com/creative-website/creative25/glbs/artist_workshop_4k.hdr"; // Corrected remote URL if needed
const modelUrl = isDevelopment ? localModelUrl : remoteModelUrl;
console.log(`Loading model from: ${modelUrl}`); // Log which URL is being used
// const modelUrl =

export function SceneCanvas({ scrollContainerRef }) {
  const kreatonRef = useRef();
  const earthRef = useRef();
  const rotatorRef = useRef();
  const clumpRef = useRef(); // Add ref for Clump
  const pointingFingerRef = useRef(); // Add ref for PointingFinger
  const cdTextRef = useRef(); // Add ref for CDtext

  return (
    <Suspense fallback={<div>Loading 3D scene...</div>}>
      <Canvas
        // shadows
        // dpr={[1, 2]}

        onCreated={({ gl }) => {
          gl.toneMapping = THREE.LinearToneMapping;
          gl.toneMappingExposure = 1.0;
        }}
        // flat
        // linear
        gl={{ alpha: true, antialias: true, background: false }}
        camera={{
          fov: 55,
          near: 0.1,
          far: 1000,
          position: [0, 0.5, 4],
        }}
      >
         <Suspense fallback={null}>
            <Perf position="top-left" />

        {/* <OrbitControls /> */}

        <Environment files={modelUrl} />
        {/* <color attach="background" args={["black"]} /> */}
        {/* <Stars saturation={0} count={400} speed={0.5} /> */}
        <ambientLight intensity={0.1} />
        
        {/* <directionalLight position={[10, 10, -5]} intensity={1} /> */}
       
          <Earth2 ref={earthRef} position={[0, -1.86, 0]} />
          {/* <Kreaton ref={kreatonRef} position={[0, 0.02, 0]} /> */}
          <Kreaton ref={kreatonRef} position={[0, 0.02, 0.5]} />
          {/* <NewFont
            scale={100}
            position={[-20, 2, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          />{" "}
          Added scale prop with value */}
          <Rotator ref={rotatorRef} position={[0, -10, 0]} />
          {/* Add PointingFinger component, initially hidden or positioned off-screen */}
          <PointingFinger
            ref={pointingFingerRef}
            position={[-0.2, -0.7, 2.4]}
            rotation={[0, 0, 0]}
            visible={false}
          />

          {/* CDtext to be removed */}
          <CDtext
            ref={cdTextRef}
            position={[0, 1, 0]}
            scale={0.8}
            rotation={[Math.PI / 2, 0, 0]}
            visible={false}
          />

          {/* <Header_v1 will replace CDTEXT */}
          <Center position={[0, 2, 0]}>
            <Header_v1 scale={10} />
          </Center>
          {/* Add Clump component */}
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
          clumpRef={clumpRef} // Pass the ref to AnimationManager
          pointingFingerRef={pointingFingerRef} // Pass the PointingFinger ref
          cdTextRef={cdTextRef} // Pass the CDtext ref to AnimationManager
          scrollContainerRef={scrollContainerRef}
        />

      {/* <EffectComposer>
        <DepthOfField focusDistance={0} focalLength={0.02} bokehScale={2} height={480} />
        <Bloom luminanceThreshold={0} luminanceSmoothing={0.9} height={300} />
        <Noise opacity={0.02} />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer> */}
      </Canvas>
    </Suspense>
  );
}
