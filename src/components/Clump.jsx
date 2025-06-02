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
import { gsap } from "gsap";

const rfs = THREE.MathUtils.randFloatSpread;

const NUM_INSTANCES = 500;
const INSTANCES_INITIAL_DISTACE = 300;
const INSTANCE_SIZE = 0.5;

const sphereGeometry = new THREE.DodecahedronGeometry(INSTANCE_SIZE, 0);
const baubleMaterial = new THREE.MeshStandardMaterial({
  color: "gray",
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
      args: [1],
      mass: 0.2,
      angularDamping: 0.5,
      linearDamping: 0.999,
      gravity: [0, 0, 0], // Set gravity to zero
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
    const opacityObj = useRef({ value: 1 }); // Use object for GSAP
    const shimmerObj = useRef({ value: 0 }); // Use object for GSAP

    // Expose methods to AnimationManager via ref
    useImperativeHandle(ref, () => ({
      // Add visibility control method with fade effect
      setVisibility: (visible, options = {}) => {
        const {
          duration = 0.5,
          ease = "power2.inOut",
          delay = 0,
          onStart,
          onComplete
        } = options;

        if (internalRef.current) {
          gsap.to(opacityObj.current, {
            value: visible ? 1 : 0,
            duration,
            delay,
            ease,
            onStart: () => {
              if (onStart) onStart();
              internalRef.current.visible = true; // Keep visible during fade
            },
            onUpdate: () => {
              if (internalRef.current) {
                internalRef.current.traverse((child) => {
                  if (child.isMesh) {
                    child.material.opacity = opacityObj.current.value;
                    child.material.transparent = true;
                  }
                });
              }
            },
            onComplete: () => {
              if (internalRef.current) {
                internalRef.current.visible = visible; // Set final visibility
                if (onComplete) onComplete();
              }
            }
          });
        }
        return visible;
      },

      // Toggle the shield visibility with fade
      toggleShield: (show = true, options = {}) => {
        const {
          duration = 0.5,
          ease = "power2.inOut",
          delay = 0
        } = options;

        // Don't show shield if permanently exploded
        if (isPermanentlyExploded) {
          gsap.to(shimmerObj.current, {
            value: 0,
            duration,
            ease,
            delay,
            onUpdate: () => setShimmer(shimmerObj.current.value),
            onComplete: () => setVisible(false)
          });
          return false;
        }

        if (show) {
          shimmerObj.current.value = 0;
          setShimmer(0);
          gsap.to(shimmerObj.current, {
            value: 1,
            duration,
            ease,
            delay,
            onStart: () => setVisible(true),
            onUpdate: () => setShimmer(shimmerObj.current.value)
          });
        } else {
          gsap.to(shimmerObj.current, {
            value: 0,
            duration,
            ease,
            delay,
            onUpdate: () => setShimmer(shimmerObj.current.value),
            onComplete: () => setVisible(false)
          });
        }
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

      // Fix the permanentExplosion method with delayed visibility changes
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
        setActive(false);

        // Fade out shield with delay
        gsap.to(shimmerObj.current, {
          value: 0,
          duration: 0.5,
          delay: 0.3,
          ease: "power2.inOut",
          onUpdate: () => setShimmer(shimmerObj.current.value),
          onComplete: () => setVisible(false)
        });

        // Fade out entire clump with longer delay
        if (internalRef.current) {
          gsap.to(opacityObj.current, {
            value: 0,
            duration: 1,
            delay: 0.8,
            ease: "power2.inOut",
            onUpdate: () => {
              if (internalRef.current) {
                internalRef.current.traverse((child) => {
                  if (child.isMesh) {
                    child.material.opacity = opacityObj.current.value;
                    child.material.transparent = true;
                  }
                });
              }
            },
            onComplete: () => {
              if (internalRef.current) {
                internalRef.current.visible = false;
              }
            }
          });
        }

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
