import { Canvas } from "@react-three/fiber";
import {
  ScrollControls,
  Scroll,
  OrbitControls,
  Environment,
  Stars,
} from "@react-three/drei";
import { NodeToyTick } from "@nodetoy/react-nodetoy";
import { Earth2 } from "./Earthv4_UV";
import { Sniker } from "./Seen_low_2K";
import { Suspense } from "react";
import { Armchair } from "./Armchair";
// import { Kreaton } from "./Kreaton_2";
import { AnimationManager } from "./AnimationManager";
import { useRef } from "react";
import { Kreaton } from "./Kreaton_A";
import {
  Bloom,
  DepthOfField,
  EffectComposer,
  Noise,
  Vignette,
} from "@react-three/postprocessing";
import { Physics } from "@react-three/cannon";
import * as THREE from "three";
import { Rotator } from "./Carosel";
import { Clump } from "./Clump";

export function SceneCanvas() {
  const kreatonRef = useRef();
  const earthRef = useRef();
  const rotatorRef = useRef();
  const clumpRef = useRef(); // Add ref for Clump

  return (
    <Canvas
      // shadows
      // dpr={[1, 2]}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.LinearToneMapping;
        gl.toneMappingExposure = 1.0;
      }}
      // flat
      // linear
      gl={{ alpha: true, antialias: true }}
      camera={{
        type: "OrthographicCamera",
        fov: 75,
        near: 0.1,
        far: 1000,
        position: [0, 0.5, 4],
      }}
    >
      <Environment files="/artist_workshop_4k.hdr" />
      {/* <color attach="background" args={["black"]} /> */}
      {/* <Stars saturation={0} count={400} speed={0.5} /> */}
      <ambientLight intensity={0.3} />
      {/* <directionalLight position={[10, 10, -5]} intensity={1} /> */}
      <Suspense fallback={null}>
        <Earth2 ref={earthRef} position={[0, -1.86, 0]} />
        {/* <Armchair position={[0, -1.5, 0]} /> */}
        {/* <Model /> */}

        <Kreaton ref={kreatonRef} position={[0, 0, 0]} />

        <Rotator ref={rotatorRef} position={[0, -10, 0]} />

        {/* Add Clump component */}
        <Physics>
          <Clump
            ref={clumpRef}
            position={[0, 0, 0]}
            shieldColor="blue"
            shieldRadius={3}
          />
        </Physics>
        {/* <Sniker position={[4, 0, 0]} /> */}
      </Suspense>
      <OrbitControls />
      <NodeToyTick />

      <AnimationManager
        kreatonRef={kreatonRef}
        earthRef={earthRef}
        rotatorRef={rotatorRef}
        clumpRef={clumpRef} // Pass the ref to AnimationManager
      />

      {/* <EffectComposer>
        <DepthOfField
          focusDistance={0}
          focalLength={0.02}
          bokehScale={2}
          height={480}
        />
        <Bloom luminanceThreshold={0} luminanceSmoothing={0.9} height={300} />
        <Noise opacity={0.02} />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer> */}
    </Canvas>
  );
}
