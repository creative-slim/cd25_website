import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, useTexture } from "@react-three/drei";
// Uncomment the physics imports when ready to use them
import { Physics, RigidBody, useRapier, BallCollider } from "@react-three/rapier";
import {
  useRef,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  createRef,
} from "react";
import React from "react";
import { gsap } from "gsap";

// === TWEAKABLE CONSTANTS ===
const NUM_INSTANCES = 10;           // Number of rocks
const INSTANCE_SIZE = 0.2;           // Size of each rock
const ORBIT_RADIUS = 5.0;            // Distance of rocks from center (increase for further away)
const ORBIT_SPEED = 0.5;             // Radians/sec (speed of orbit)
const SHIELD_RADIUS = 3.5;           // Radius of the shield (increase for bigger shield)
const SHIELD_COLOR = "blue";         // Shield color
const SHIELD_OPACITY = 0.3;          // Shield opacity
const TRANSITION_DURATION = 1.0;     // Seconds for orbit-to-fall transition
const LOG_POS_INTERVAL = 1.0;        // Seconds between position logs
// ===========================

const sphereGeometry = new THREE.DodecahedronGeometry(INSTANCE_SIZE, 0);
const baubleMaterial = new THREE.MeshStandardMaterial({
  color: "white",
  roughness: 1,
  envMapIntensity: 0.2,
});

// Convert Shield to use forwardRef
const Shield = forwardRef(
  ({ radius, color = SHIELD_COLOR, opacity = SHIELD_OPACITY, ...props }, ref) => {
    return (
      <RigidBody type="fixed" colliders={false} position={[0, 0, 0]} {...props}>
        <BallCollider args={[radius]} />
        <mesh ref={ref}>
          <sphereGeometry args={[radius, 32, 32]} />
          <meshStandardMaterial
            color={color}
            transparent
            opacity={opacity}
            roughness={0.1}
            metalness={0.8}
          />
        </mesh>
      </RigidBody>
    );
  }
);

// Convert Clump to use forwardRef for AnimationManager control
export const Clump = forwardRef(
  (
    {
      mat = new THREE.Matrix4(),
      vec = new THREE.Vector3(),
      shieldRadius = SHIELD_RADIUS,
      shieldColor = SHIELD_COLOR,
      shieldOpacity = SHIELD_OPACITY,
      ...props
    },
    ref
  ) => {
    const [active, setActive] = useState(false);
    const [transition, setTransition] = useState(0); // 0 = idle, 1 = active
    const transitionRef = useRef(0);
    const transitionStart = useRef(null);
    const [visible, setVisible] = useState(true);
    const [shimmer, setShimmer] = useState(1);
    // Store type for each particle
    const [types, setTypes] = useState(Array(NUM_INSTANCES).fill("kinematicPosition"));
    const particleRefs = useRef(Array.from({ length: NUM_INSTANCES }, () => createRef()));
    const shieldRef = useRef();
    const initialAngles = useRef(
      Array.from({ length: NUM_INSTANCES }, (_, i) => {
        // Distribute points on a sphere using the Golden Section Spiral
        const phi = Math.acos(1 - 2 * (i + 0.5) / NUM_INSTANCES);
        const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
        return { phi, theta };
      })
    );
    const initialPositions = useRef(
      initialAngles.current.map(({ phi, theta }) => [
        ORBIT_RADIUS * Math.sin(phi) * Math.cos(theta),
        ORBIT_RADIUS * Math.cos(phi),
        ORBIT_RADIUS * Math.sin(phi) * Math.sin(theta),
      ])
    );

    const internalRef = useRef();
    const [isPermanentlyExploded, setPermanentlyExploded] = useState(false); // Track permanent explosion state
    const opacityObj = useRef({ value: 1 }); // Use object for GSAP
    const shimmerObj = useRef({ value: 0 }); // Use object for GSAP
    // Add a ref to track last log time
    const lastLogTime = useRef(0);

    // Expose methods to AnimationManager via ref
    useImperativeHandle(ref, () => ({
      cluster: () => {
        for (let i = 0; i < NUM_INSTANCES; i++) {
          const body = particleRefs.current[i].current;
          if (body) {
            const pos = body.translation();
            if (Array.isArray(pos)) {
              const toCenter = new THREE.Vector3(-pos[0], -pos[1], -pos[2]);
              toCenter.normalize().multiplyScalar(10);
              body.applyImpulse([toCenter.x, toCenter.y, toCenter.z], true);
            }
          }
        }
      },
      explode: () => {
        for (let i = 0; i < NUM_INSTANCES; i++) {
          const body = particleRefs.current[i].current;
          if (body) {
            const pos = body.translation();
            if (Array.isArray(pos)) {
              const fromCenter = new THREE.Vector3(pos[0], pos[1], pos[2]);
              fromCenter.normalize().multiplyScalar(15);
              body.applyImpulse([fromCenter.x, fromCenter.y, fromCenter.z], true);
            }
          }
        }
      },
      reset: () => {
        setActive(false);
        setTransition(0);
        transitionRef.current = 0;
        setTypes(Array(NUM_INSTANCES).fill("kinematicPosition"));
        for (let i = 0; i < NUM_INSTANCES; i++) {
          const body = particleRefs.current[i].current;
          if (body) {
            body.setTranslation(initialPositions.current[i], true);
            body.setLinvel([0, 0, 0], true);
            body.setAngvel([0, 0, 0], true);
          }
        }
        setVisible(true);
        setShimmer(1);
      },
      setShieldProperties: (properties = {}) => {
        if (properties.radius !== undefined) shieldRadius = properties.radius;
        if (properties.color !== undefined) shieldColor = properties.color;
        if (properties.opacity !== undefined) shieldOpacity = properties.opacity;
        return { shieldRadius, shieldColor, shieldOpacity };
      },
      toggleShield: (show = true) => {
        setVisible(show);
        setShimmer(show ? 1 : 0);
      },
      setActive: (isActive) => {
        if (isActive === active) return;
        setActive(isActive);
        transitionStart.current = performance.now();
      },
      getObject: () => internalRef.current,
      getShield: () => shieldRef.current,
    }));

    useEffect(() => {
      // Log when rocks are created
      for (let i = 0; i < NUM_INSTANCES; i++) {
        console.log(`[Clump] Rock #${i} initial position:`, initialPositions.current[i]);
      }
    }, []);

    useFrame((state) => {
      if (isPermanentlyExploded) return;
      // Handle transition animation
      if (transitionStart.current !== null) {
        const elapsed = (performance.now() - transitionStart.current) / 1000;
        let t = Math.min(elapsed / TRANSITION_DURATION, 1);
        if (!active) t = 1 - t;
        setTransition(t);
        transitionRef.current = t;
        if (elapsed >= TRANSITION_DURATION) {
          setTransition(active ? 1 : 0);
          transitionRef.current = active ? 1 : 0;
          transitionStart.current = null;
          // Switch all types at the end of transition
          if (active) {
            setTypes(Array(NUM_INSTANCES).fill("dynamic"));
          } else {
            setTypes(Array(NUM_INSTANCES).fill("kinematicPosition"));
          }
          console.log("[Clump] Transition complete. Active:", active, "Transition:", transitionRef.current);
        }
      }
      // For each particle
      for (let i = 0; i < NUM_INSTANCES; i++) {
        const body = particleRefs.current[i].current;
        if (!body) continue;
        const { phi, theta } = initialAngles.current[i];
        const time = state.clock.getElapsedTime();
        const orbitTheta = theta + ORBIT_SPEED * time;
        const target = new THREE.Vector3(
          ORBIT_RADIUS * Math.sin(phi) * Math.cos(orbitTheta),
          ORBIT_RADIUS * Math.cos(phi),
          ORBIT_RADIUS * Math.sin(phi) * Math.sin(orbitTheta)
        );
        // Defensive: log before setting kinematic position
        if (types[i] === "kinematicPosition") {
          if ([target.x, target.y, target.z].some((v) => !Number.isFinite(v))) {
            console.warn(`[Clump][DEFENSE] NaN detected in orbit target for rock #${i}:`, target.toArray());
          }
          // Log current position before update
          const posBefore = body.translation && body.translation();
          if (Array.isArray(posBefore) && posBefore.some((v) => !Number.isFinite(v))) {
            console.warn(`[Clump][DEFENSE] NaN detected in current position BEFORE setNextKinematicTranslation for rock #${i}:`, posBefore);
          }
          body.setNextKinematicTranslation([target.x, target.y, target.z]);
          // Log after update
          const posAfter = body.translation && body.translation();
          if (Array.isArray(posAfter) && posAfter.some((v) => !Number.isFinite(v))) {
            console.warn(`[Clump][DEFENSE] NaN detected in current position AFTER setNextKinematicTranslation for rock #${i}:`, posAfter);
          }
        }
        // Defensive: log for dynamic type as well
        if (types[i] === "dynamic") {
          const pos = body.translation && body.translation();
          if (Array.isArray(pos) && pos.some((v) => !Number.isFinite(v))) {
            console.warn(`[Clump][DEFENSE] NaN detected in dynamic position for rock #${i}:`, pos);
          }
        }
      }
      // Log the current position of the first 5 rocks every LOG_POS_INTERVAL seconds
      const now = state.clock.getElapsedTime();
      if (now - lastLogTime.current > LOG_POS_INTERVAL) {
        for (let i = 0; i < Math.min(5, NUM_INSTANCES); i++) {
          const body = particleRefs.current[i].current;
          if (body) {
            const pos = body.translation && body.translation();
            if (Array.isArray(pos) && pos.some((v) => !Number.isFinite(v))) {
              console.warn(`[Clump][DEFENSE] NaN detected in periodic log for rock #${i}:`, pos);
            }
            console.log(`[Clump] Rock #${i} current position:`, Array.isArray(pos) ? pos : pos);
          }
        }
        lastLogTime.current = now;
      }
    });

    useEffect(() => {
      // In transition logic, log when types are switched
      if (transition === 1) {
        console.log("[Clump] All rocks set to dynamic");
      } else if (transition === 0) {
        console.log("[Clump] All rocks set to kinematicPosition");
      }
    }, [transition]);

    return (
      <group ref={internalRef} {...props}>
        {visible && (
          <Shield
            ref={shieldRef}
            radius={shieldRadius}
            color={shieldColor}
            opacity={shieldOpacity * shimmer}
            metalness={shimmer * 0.8}
            renderOrder={1}
          />
        )}
        {Array.from({ length: NUM_INSTANCES }).map((_, i) => {
          console.log(`[Clump][DEFENSE] Creating RigidBody #${i} at`, initialPositions.current[i], 'type:', types[i]);
          return (
            <RigidBody
              key={i}
              ref={particleRefs.current[i]}
              type={types[i]}
              position={initialPositions.current[i]}
              colliders="ball"
              mass={1}
              restitution={0.7}
              friction={0.5}
              linearDamping={0.1}
              angularDamping={0.1}
            >
              <mesh castShadow receiveShadow geometry={sphereGeometry} material={baubleMaterial} />
            </RigidBody>
          );
        })}
      </group>
    );
  }
);

// Update Pointer component as needed or keep as-is
export function Pointer() {
  const viewport = useThree((state) => state.viewport);
  const [ref, api] = useRigidBody(() => ({
    type: "Kinematic",
    args: [10],
    position: [0, 0, 0],
  }));
  useFrame((state) =>
    api.position.set(
      (state.mouse.x * viewport.width) / 2,
      (state.mouse.y * viewport.height) / 2,
      0
    )
  );
  return (
    <mesh ref={ref} scale={0.02}>
      <sphereGeometry />
      <meshBasicMaterial color={[4, 4, 4]} toneMapped={false} />
    </mesh>
  );
}
