// https://cydstumpel.nl/

import * as THREE from "three";
// Import useEffect
import {
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  useEffect,
} from "react";
// Import useThree
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Image,
  Environment,
  ScrollControls,
  useScroll,
  useTexture,
} from "@react-three/drei";
import { easing } from "maath";
import "../utils/caroselUtil";
import { gsap } from "gsap";

function Carousel({ radius = 4.4, count = 8 }) {
  return Array.from({ length: count }, (_, i) => (
    <Card
      key={i}
      //   url={`/img${Math.floor(i % 10) + 1}_.jpg`}
      url={"https://picsum.photos/600"}
      position={[
        Math.sin((i / count) * Math.PI * 2) * radius,
        0,
        Math.cos((i / count) * Math.PI * 2) * radius,
      ]}
      rotation={[0, Math.PI + (i / count) * Math.PI * 2, 0]}
    />
  ));
}

function Card({ url, ...props }) {
  const ref = useRef();
  const [hovered, hover] = useState(false);
  const pointerOver = (e) => (e.stopPropagation(), hover(true));
  const pointerOut = () => hover(false);
  useFrame((state, delta) => {
    easing.damp3(ref.current.scale, hovered ? 1.5 : 1.3, 0.1, delta);
    easing.damp(
      ref.current.material,
      "radius",
      hovered ? 0.25 : 0.1,
      0.2,
      delta
    );
    easing.damp(ref.current.material, "zoom", hovered ? 1 : 1.5, 0.2, delta);
  });
  return (
    <Image
      ref={ref}
      url={url}
      transparent
      side={THREE.DoubleSide}
      onPointerOver={pointerOver}
      onPointerOut={pointerOut}
      {...props}
    >
      <bentPlaneGeometry args={[0.1, 1.5, 1.5, 20, 20]} />
    </Image>
  );
}

export const Rotator = forwardRef((props, ref) => {
  const carouselRef = useRef();
  const isDraggingRef = useRef(false); // Use ref to avoid issues with stale state in listeners
  const prevXRef = useRef(0);
  const { gl } = useThree(); // Get the WebGL renderer instance

  // Expose methods to parent components via ref
  useImperativeHandle(ref, () => ({
    // Move the carousel to a specific Y position
    moveY: (y, options = {}) => {
      if (carouselRef.current) {
        return gsap.to(carouselRef.current.position, {
          y,
          duration: options.duration || 0.5,
          ease: options.ease || "power1.out",
          onStart: options.onStart,
          onComplete: options.onComplete,
        });
      }
    },

    // Get current Y position
    getY: () => carouselRef.current?.position.y,

    // Original methods (keep or modify as needed)
    rotate: (targetRotationY, options = {}) => {
      if (carouselRef.current) {
        // Example: Animate rotation to a specific angle
        return gsap.to(carouselRef.current.rotation, {
          y: targetRotationY,
          duration: options.duration || 0.5,
          ease: options.ease || "power1.out",
        });
      }
    },
    getObject: () => carouselRef.current,
  }));

  // Renamed handler for clarity
  const handleWindowPointerMove = (e) => {
    if (!isDraggingRef.current) return;
    // No stopPropagation needed for window events generally
    const currentX = e.clientX;
    const deltaX = currentX - prevXRef.current;
    console.log(
      `Rotator: Window Pointer Move - DeltaX: ${deltaX}, PrevX: ${prevXRef.current}, CurrentX: ${currentX}`
    );
    // Decrease sensitivity for slower rotation
    const rotationSensitivity = 0.001; // Adjust this value (e.g., decrease from 0.005)
    // Invert direction by subtracting
    carouselRef.current.rotation.y -= deltaX * rotationSensitivity;
    prevXRef.current = currentX; // Update ref
  };

  // Renamed handler for clarity
  const handleWindowPointerUp = (e) => {
    if (isDraggingRef.current) {
      console.log("Rotator: Window Pointer Up");
      isDraggingRef.current = false; // Update ref
      gl.domElement.style.cursor = "grab"; // Restore cursor

      // Remove listeners from window
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
    }
  };

  const handlePointerDown = (e) => {
    e.stopPropagation(); // Prevent interfering with other interactions ON the element
    console.log("Rotator: Pointer Down on Group", e.clientX);
    isDraggingRef.current = true; // Update ref
    prevXRef.current = e.clientX; // Update ref
    gl.domElement.style.cursor = "grabbing"; // Change cursor

    // Add listeners to window
    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
  };

  // Cleanup listeners if component unmounts while dragging
  useEffect(() => {
    return () => {
      if (isDraggingRef.current) {
        // Just in case
        window.removeEventListener("pointermove", handleWindowPointerMove);
        window.removeEventListener("pointerup", handleWindowPointerUp);
        gl.domElement.style.cursor = "grab"; // Ensure cursor is reset
      }
    };
  }, [gl.domElement]); // Dependency array includes gl.domElement

  // Remove handlePointerMove, handlePointerUp, handlePointerLeave as separate functions

  return (
    <group
      ref={carouselRef}
      {...props}
      onPointerDown={handlePointerDown} // Only pointer down is needed here
      // Remove onPointerMove, onPointerUp, onPointerLeave
    >
      <Carousel />
    </group>
  );
});
