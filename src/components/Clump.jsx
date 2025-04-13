import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, useTexture } from "@react-three/drei";
// Uncomment the physics imports when ready to use them
import { Physics, useSphere } from "@react-three/cannon";
import {
  useRef,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";

const rfs = THREE.MathUtils.randFloatSpread;

const NUM_INSTANCES = 500;
const INSTANCES_INITIAL_DISTACE = 1000;
const INSTANCE_SIZE = 0.5;

const sphereGeometry = new THREE.DodecahedronGeometry(INSTANCE_SIZE, 0);
const baubleMaterial = new THREE.MeshStandardMaterial({
  color: "black",
  roughness: 1,
  envMapIntensity: 0.2,
});

// Convert Shield to use forwardRef
const Shield = forwardRef(
  ({ radius, color = "pink", opacity = 0.3, ...props }, ref) => {
    return (
      <mesh ref={ref} {...props}>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          roughness={0.1}
          metalness={0.8}
        />
      </mesh>
    );
  }
);

// Convert Clump to use forwardRef for AnimationManager control
export const Clump = forwardRef(
  (
    {
      mat = new THREE.Matrix4(),
      vec = new THREE.Vector3(),
      shieldRadius = 3,
      shieldColor = "blue",
      shieldOpacity = 0.3,
      ...props
    },
    ref
  ) => {
    const [sphereRef, sphereApi] = useSphere(() => ({
      args: [0.8],
      mass: 0.5,
      angularDamping: 0.1,
      linearDamping: 0.8,
      position: [
        rfs(INSTANCES_INITIAL_DISTACE),
        rfs(INSTANCES_INITIAL_DISTACE),
        rfs(INSTANCES_INITIAL_DISTACE),
      ],
    }));

    const internalRef = useRef();
    const shieldRef = useRef();
    const [visible, setVisible] = useState(false);
    const [shimmer, setShimmer] = useState(0);
    const [active, setActive] = useState(false); // Start inactive until triggered
    const [isPermanentlyExploded, setPermanentlyExploded] = useState(false); // Track permanent explosion state

    // Expose methods to AnimationManager via ref
    useImperativeHandle(ref, () => ({
      // Toggle the shield visibility
      toggleShield: (show = true) => {
        setVisible(show);
        if (show) setShimmer(0); // Reset shimmer when showing
        return show;
      },

      // Explode the particles outward
      explode: (force = 100, permanent = false) => {
        if (!sphereRef.current) return false;

        for (let i = 0; i < NUM_INSTANCES; i++) {
          sphereRef.current.getMatrixAt(i, mat);
          const position = vec.setFromMatrixPosition(mat);
          const randomForce = THREE.MathUtils.randFloat(
            force * 0.5,
            force * 1.5
          );
          sphereApi
            .at(i)
            .applyImpulse(
              position.normalize().multiplyScalar(randomForce).toArray(),
              [0, 0, 0]
            );
        }

        // If permanent, deactivate the physics and mark as exploded
        if (permanent) {
          setPermanentlyExploded(true);
          setActive(false); // Turn off normal physics
        }

        return true;
      },

      // Fix the permanentExplosion method by not using 'this'
      permanentExplosion: (force = 200) => {
        if (!sphereRef.current) return false;

        // Instead of using this.explode, directly implement the explosion logic
        for (let i = 0; i < NUM_INSTANCES; i++) {
          sphereRef.current.getMatrixAt(i, mat);
          const position = vec.setFromMatrixPosition(mat);
          const randomForce = THREE.MathUtils.randFloat(
            force * 0.5,
            force * 1.5
          );
          sphereApi
            .at(i)
            .applyImpulse(
              position.normalize().multiplyScalar(randomForce).toArray(),
              [0, 0, 0]
            );
        }

        // Mark as permanently exploded
        setPermanentlyExploded(true);
        setActive(false); // Turn off normal physics

        // Hide shield
        setVisible(false);

        return true;
      },

      // Implode the particles inward
      implode: (force = 100) => {
        if (isPermanentlyExploded || !active || !sphereRef.current)
          return false;

        for (let i = 0; i < NUM_INSTANCES; i++) {
          sphereRef.current.getMatrixAt(i, mat);
          const position = vec.setFromMatrixPosition(mat);
          const randomForce = THREE.MathUtils.randFloat(
            force * 0.5,
            force * 1.5
          );
          sphereApi
            .at(i)
            .applyImpulse(
              position.normalize().multiplyScalar(-randomForce).toArray(),
              [0, 0, 0]
            );
        }
        return true;
      },

      // Change shield properties
      setShieldProperties: (properties = {}) => {
        if (properties.radius !== undefined) shieldRadius = properties.radius;
        if (properties.color !== undefined) shieldColor = properties.color;
        if (properties.opacity !== undefined)
          shieldOpacity = properties.opacity;
        return { shieldRadius, shieldColor, shieldOpacity };
      },

      // Activate/deactivate the whole component
      setActive: (isActive) => {
        // Don't re-activate if permanently exploded
        if (isPermanentlyExploded && isActive) return false;

        setActive(isActive);
        return isActive;
      },

      // Check if permanently exploded
      isPermanentlyExploded: () => isPermanentlyExploded,

      // Get references to internal objects
      getObject: () => internalRef.current,
      getShield: () => shieldRef.current,
    }));

    useFrame(() => {
      if (visible && shimmer < 1) {
        setShimmer((s) => Math.min(1, s + 0.02));
      }
    });

    const handleClick = () => {
      // Use the exposed method
      ref.current?.explode(150);
    };

    useFrame((state) => {
      // Skip all physics if permanently exploded or inactive
      if (isPermanentlyExploded || !active || !sphereRef.current) return;

      let minDistance = Infinity;

      for (let i = 0; i < NUM_INSTANCES; i++) {
        sphereRef.current.getMatrixAt(i, mat);
        const position = vec.setFromMatrixPosition(mat);
        const distance = position.length();
        minDistance = Math.min(minDistance, distance);

        if (distance < shieldRadius + 0.4) {
          sphereApi
            .at(i)
            .applyForce(
              position.normalize().multiplyScalar(80).toArray(),
              [0, 0, 0]
            );
        } else {
          sphereApi
            .at(i)
            .applyForce(
              position.normalize().multiplyScalar(-80).toArray(),
              [0, 0, 0]
            );
        }
      }

      // Auto-shield visibility based on particle positions
      if (active && !isPermanentlyExploded) {
        if (minDistance < shieldRadius * 2 && !visible) {
          setVisible(true);
          setShimmer(0);
        } else if (minDistance > shieldRadius * 2 && visible) {
          setVisible(false);
        }
      }
    });

    return (
      <group ref={internalRef} {...props}>
        {visible && (
          <Shield
            ref={shieldRef}
            radius={shieldRadius}
            color={shieldColor}
            opacity={shieldOpacity * shimmer}
            metalness={shimmer * 0.8}
            onClick={handleClick}
            renderOrder={1}
          />
        )}
        <instancedMesh
          ref={sphereRef}
          castShadow
          receiveShadow
          args={[sphereGeometry, baubleMaterial, NUM_INSTANCES]}
        />
      </group>
    );
  }
);

// Update Pointer component as needed or keep as-is
export function Pointer() {
  const viewport = useThree((state) => state.viewport);
  const [ref, api] = useSphere(() => ({
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
