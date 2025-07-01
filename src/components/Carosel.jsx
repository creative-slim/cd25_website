// https://cydstumpel.nl/

import * as THREE from "three";
// Import useEffect and useState
import {
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  useEffect,
  useCallback,
  memo,
} from "react";
// Import useThree
import { Canvas, useFrame, useThree } from "@react-three/fiber";
// import { Image, Environment, ScrollControls, useScroll, useTexture } from "@react-three/drei";
import { useTexture } from "@react-three/drei";
// import { easing } from "maath";
import "../utils/caroselUtil";
import { gsap } from "gsap";
import Portal from './Portal';
import RainbowConnector from './RainbowConnector';
// import { Select } from "@react-three/postprocessing";

// Define the number of cards to display
const NUM_CARDS_TO_DISPLAY = 6;
// Define the radius of the circle for card placement
const radius = 4;
// Debug flag
const DEBUG_LOGS = process.env.NODE_ENV === 'development';

// Utility to extract carousel data from DOM
const extractCarouselDataFromDOM = () => {
  const wrappers = Array.from(document.querySelectorAll('div[data-three="thumbnail"].project-links-item'));
  const data = wrappers.slice(0, NUM_CARDS_TO_DISPLAY).map((wrapper, idx) => {
    // Find the first <img> inside
    const img = wrapper.querySelector('img');
    let imageUrl = img ? img.getAttribute('src') : null;
    if (!imageUrl && img && img.getAttribute('srcset')) {
      // Try to find 720w in srcset
      const srcset = img.getAttribute('srcset');
      const match = srcset.match(/([^\s]+)\s+720w/);
      if (match) imageUrl = match[1];
      else imageUrl = srcset.split(',')[0].split(' ')[0]; // fallback to first
    }
    // Assign data-carousel-index for easier matching
    wrapper.setAttribute('data-carousel-index', idx);
    if (img) img.setAttribute('data-carousel-index', idx);
    return { imgEl: img, wrapperEl: wrapper, imageUrl, index: idx };
  });
  console.log('[CAROUSEL] Extracted carousel data:', data);
  return data;
};

// Wrap the Carousel component with React.memo to optimize rendering
function Carousel({
  data = [],
  onHoverStart,
  onHoverEnd,
  ...props
}) {
  const count = data.length; // Use data length for count
  if (count === 0) return null; // Don't render if no data

  return data.map((item, i) => {
    // Use the imageUrl from the DOM extraction
    const imageUrl = item.imageUrl; // No fallback, trust DOM extraction

    return (
      <Card
        key={item.index}
        index={i}
        data={item}
        url={imageUrl}
        position={[
          Math.sin((i / count) * Math.PI * 2) * radius,
          0,
          Math.cos((i / count) * Math.PI * 2) * radius,
        ]}
        rotation={[0, Math.PI + (i / count) * Math.PI * 2, 0]}
        onHoverStart={onHoverStart}
        onHoverEnd={onHoverEnd}
      />
    );
  });
}

// Accept and call hover handlers
const Card = memo(({
  url,
  index,
  data,
  onHoverStart,
  onHoverEnd,
  ...props
}) => {
  const ref = useRef();
  const [hovered, hover] = useState(false);
  const texture = useTexture(url);

  const pointerOver = useCallback((e) => {
    e.stopPropagation();
    hover(true);
    onHoverStart?.();
    // Animate to circle
    gsap.to(ref.current.scale, {
      x: 1.5,
      y: 1.5,
      z: 1.5,
      duration: 1,
      ease: "power2.out"
    });
  }, [onHoverStart]);

  const pointerOut = useCallback(() => {
    hover(false);
    onHoverEnd?.();
    // Animate back to square
    gsap.to(ref.current.scale, {
      x: 1.3,
      y: 1.3,
      z: 1.3,
      duration: 1,
      ease: "power2.out"
    });
  }, [onHoverEnd]);

  return (
    <group {...props}>
      {/* New Rainbow Portal */}
      <Portal
        position={[0, 0, -0.01]}
        scale={[2, 2, 2]}
        configs={[
          { radius: 0.48, tube: 0.045, opacity: hovered ? 0.7 : 0.4, speed: 0.5, phase: 0 },
          { radius: 0.56, tube: 0.025, opacity: hovered ? 0.4 : 0.2, speed: 0.7, phase: 1.0 },
          { radius: 0.62, tube: 0.012, opacity: hovered ? 0.2 : 0.1, speed: 0.3, phase: 2.0 }
        ]}
      />

      {/* Main image with geometry switching */}
      <mesh
        ref={ref}
        onPointerOver={pointerOver}
        onPointerOut={pointerOut}
        userData={{ index, data }}
        scale={[1.3, 1.3, 1.3]}
      >
        <circleGeometry args={[0.65, 64]} />
        <meshBasicMaterial
          map={texture}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
});

export const Rotator = forwardRef(({ ...props }, ref) => {
  const [carouselData, setCarouselData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [isObserverActive, setIsObserverActive] = useState(false); // New state for observer control
  const carouselRef = useRef();
  const frameCountRef = useRef(0);
  const opacityRef = useRef(1);
  const isDraggingRef = useRef(false);
  const prevXRef = useRef(0);
  const velocityRef = useRef(0);
  const pointerHistoryRef = useRef([]);
  const hoveredCardCountRef = useRef(0);
  const lastVisibleCardRef = useRef(null);
  const { gl, camera } = useThree();
  const [currentCardData, setCurrentCardData] = useState(null);
  // Constants for damping
  const rotationSensitivity = 0.001; // Keep the sensitivity for direct drag
  const dampingFactor = 0.92; // How quickly the velocity decays (0.9 = faster decay, 0.99 = slower decay)
  const minVelocity = 0.0001; // Threshold to stop the rotation completely
  const autoRotateSpeed = 0.0005; // Speed for default rotation
  const cameraPosition = useRef(new THREE.Vector3());
  const cameraDirection = useRef(new THREE.Vector3(0, 0, -1));
  const cardPosition = useRef(new THREE.Vector3());
  const toCameraVector = useRef(new THREE.Vector3());

  // Function to calculate which card the camera is looking at
  const determineVisibleCard = useCallback(() => {
    if (!carouselRef.current) {
      return null;
    }

    // Traverse all children recursively to find Meshes with userData.data
    const cards = [];
    carouselRef.current.children.forEach((group) => {
      group.traverse((child) => {
        if (child.type === "Mesh" && child.userData.data) {
          cards.push(child);
        }
      });
    });

    if (cards.length === 0) return null;

    camera.getWorldPosition(cameraPosition.current);
    cameraDirection.current.set(0, 0, -1).applyQuaternion(camera.quaternion);

    // Raycasting approach - find which card is most directly in the camera's line of sight
    let closestCard = null;
    let closestDistance = Infinity;
    let smallestAngle = Infinity;

    cards.forEach((card) => {
      // Get card position in world space
      card.getWorldPosition(cardPosition.current);

      // Direction from camera to card
      toCameraVector.current.subVectors(cardPosition.current, cameraPosition.current);
      const distance = toCameraVector.current.length();
      toCameraVector.current.normalize();

      // Calculate angle between camera direction and direction to card
      // Smaller angle means the card is more directly in front of the camera
      const angle = cameraDirection.current.angleTo(toCameraVector.current);

      // Prioritize cards with smaller angles (more directly in view)
      // If angles are similar (within 0.1 radians), prefer the closer card
      if (
        angle < smallestAngle ||
        (Math.abs(angle - smallestAngle) < 0.1 && distance < closestDistance)
      ) {
        smallestAngle = angle;
        closestDistance = distance;
        closestCard = card;
      }
    });

    return closestCard?.userData;
  }, [camera]);

  // Function to clear active project classes when no card is in view
  const clearActiveProjectClasses = useCallback(() => {
    const allProjectElements = document.querySelectorAll("[data-projects]");
    allProjectElements.forEach((el) => {
      if (el.classList.contains("active")) {
        if (DEBUG_LOGS) console.log("[CAROUSEL] Removing 'active' class from:", el);
      }
      el.classList.remove("active");
    });
  }, []);

  // Function to update DOM elements based on the current card
  const updateActiveElements = useCallback(
    (cardData) => {
      if (cardData?.index === undefined || !isObserverActive) {
        if (DEBUG_LOGS) console.log("[CAROUSEL] updateActiveElements: No cardData or observer inactive, clearing active classes.");
        clearActiveProjectClasses();
        return;
      }
      // Use data-carousel-index to match
      const allWrappers = document.querySelectorAll('.project-links-item');
      allWrappers.forEach((el) => el.classList.remove('active'));
      const target = document.querySelector(`.project-links-item[data-carousel-index="${cardData.index}"]`);
      if (target) {
        target.classList.add('active');
        if (DEBUG_LOGS) console.log(`[CAROUSEL] Set active: index=${cardData.index}, classList=`, target.classList.value, target);
      } else {
        if (DEBUG_LOGS) console.log(`[CAROUSEL] No target found for index=${cardData.index}`);
      }
    },
    [clearActiveProjectClasses, isObserverActive]
  );

  // Handler for card view changes with improved logging
  const handleCardViewChange = useCallback(
    (cardData) => {
      if (cardData?.index === undefined || !isObserverActive) { // Check if observer is active
        clearActiveProjectClasses();
        return;
      }
      // Check if card data has actually changed before updating
      if (!currentCardData || currentCardData.index !== cardData.index) {
        setCurrentCardData(cardData);
        // Update DOM elements with active class
        updateActiveElements(cardData);
        // Provide an option for parent components to subscribe to this event
        props.onCardViewChange?.(cardData);
      }
    },
    [props, currentCardData, updateActiveElements, clearActiveProjectClasses, isObserverActive]
  );

  // Add this useEffect to log current card data whenever it changes
  useEffect(() => {
    if (currentCardData) {
      // ... existing code ...
    }
  }, [currentCardData]);

  // Expose methods to parent components via ref
  useImperativeHandle(ref, () => ({
    // Add visibility control method with fade effect
    setVisibility: (visible, options = {}) => {
      const {
        duration = 0.5,
        ease = "power2.inOut",
        onStart,
        onComplete
      } = options;

      setIsVisible(visible);
      // When hiding, also disable the observer
      if (!visible) {
        setIsObserverActive(false);
        clearActiveProjectClasses();
      }

      if (carouselRef.current) {
        // Kill any existing opacity animations
        gsap.killTweensOf(opacityRef);

        // Animate opacity
        gsap.to(opacityRef, {
          current: visible ? 1 : 0,
          duration,
          ease,
          onStart: () => {
            if (onStart) onStart();
          },
          onUpdate: () => {
            if (carouselRef.current) {
              carouselRef.current.visible = true; // Keep visible during fade
              carouselRef.current.traverse((child) => {
                if (child.isMesh) {
                  child.material.opacity = opacityRef.current;
                  child.material.transparent = true;
                }
              });
            }
          },
          onComplete: () => {
            if (carouselRef.current) {
              carouselRef.current.visible = visible; // Set final visibility
              if (onComplete) onComplete();
            }
          }
        });
      }
    },
    // Add new method to control observer state
    setObserverActive: (active) => {
      setIsObserverActive(active);
      if (!active) {
        clearActiveProjectClasses();
      }
    },
    // Get current visibility state
    isVisible: () => isVisible,
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

    // New method to get the current visible card data
    getCurrentCardData: () => currentCardData,
  }));

  // Apply damping and auto-rotation in the render loop with enhanced view detection
  useFrame(() => {
    if (!carouselRef.current) return;
    frameCountRef.current++;

    // Handle rotation logic
    if (!isDraggingRef.current) {
      if (Math.abs(velocityRef.current) > minVelocity) {
        // Apply damping velocity
        carouselRef.current.rotation.y -= velocityRef.current;
        velocityRef.current *= dampingFactor;
      } else {
        velocityRef.current = 0;
        // Apply auto-rotation only if NO cards are hovered
        if (hoveredCardCountRef.current === 0) {
          carouselRef.current.rotation.y -= autoRotateSpeed;
        }
      }
    }

    // Check which card is currently visible (run on every frame for continuous observation)
    // Throttle the expensive visibility check to run every 10 frames
    if (frameCountRef.current % 10 === 0) {
      const visibleCardData = determineVisibleCard();

      // If we have a visible card, handle the view change
      if (visibleCardData) {
        // Check if the visible card has changed OR if this is initial detection
        if (
          !lastVisibleCardRef.current ||
          lastVisibleCardRef.current.index !== visibleCardData.index
        ) {
          // Update the last visible card reference
          lastVisibleCardRef.current = visibleCardData;
          // Trigger the view change handler
          handleCardViewChange(visibleCardData);
        }
      } else {
        // No card is in view, clear the active classes
        if (lastVisibleCardRef.current) {
          clearActiveProjectClasses();
          lastVisibleCardRef.current = null;
        }
      }
    }
  });

  // Remove useEffect for canvas hover state

  // Handlers for card hover events
  const handleCardHoverStart = useCallback(() => {
    hoveredCardCountRef.current++;
  }, []);

  const handleCardHoverEnd = useCallback(() => {
    hoveredCardCountRef.current = Math.max(0, hoveredCardCountRef.current - 1); // Prevent negative count
  }, []);

  // Renamed handler for clarity
  const handleWindowPointerMove = (e) => {
    if (!isDraggingRef.current) return;
    // No stopPropagation needed for window events generally
    const currentX = e.clientX;
    const deltaX = currentX - prevXRef.current;

    // Apply direct rotation during drag
    carouselRef.current.rotation.y -= deltaX * rotationSensitivity;

    // Store history for velocity calculation (timestamp and position)
    const now = performance.now();
    pointerHistoryRef.current.push({ x: currentX, time: now });
    // Keep only the last few entries (e.g., last 100ms worth)
    pointerHistoryRef.current = pointerHistoryRef.current.filter(
      (entry) => now - entry.time < 100
    );

    prevXRef.current = currentX; // Update ref
  };

  // Renamed handler for clarity
  const handleWindowPointerUp = (e) => {
    if (isDraggingRef.current) {
      if (DEBUG_LOGS) console.log("Rotator: Window Pointer Up");
      isDraggingRef.current = false; // Update ref
      gl.domElement.style.cursor = "grab"; // Restore cursor

      // Calculate velocity based on recent history
      if (pointerHistoryRef.current.length >= 2) {
        const first = pointerHistoryRef.current[0];
        const last =
          pointerHistoryRef.current[pointerHistoryRef.current.length - 1];
        const timeDiff = last.time - first.time;
        const posDiff = last.x - first.x;
        if (timeDiff > 10) {
          // Avoid division by zero or tiny time diffs
          const pixelsPerMs = posDiff / timeDiff;
          velocityRef.current = pixelsPerMs * rotationSensitivity * 16.67; // Scale velocity (adjust multiplier as needed)
        } else {
          velocityRef.current = 0; // Not enough movement or time
        }
      } else {
        velocityRef.current = 0; // Not enough history
      }

      // Clear history
      pointerHistoryRef.current = [];

      // Remove listeners from window
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
    }
  };

  const handlePointerDown = (e) => {
    e.stopPropagation(); // Prevent interfering with other interactions ON the element
    if (DEBUG_LOGS) console.log("Rotator: Pointer Down on Group", e.clientX);
    isDraggingRef.current = true; // Update ref
    prevXRef.current = e.clientX; // Update ref
    velocityRef.current = 0; // Stop any existing damping
    pointerHistoryRef.current = [{ x: e.clientX, time: performance.now() }]; // Start history
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

  // Add an initial update when component mounts to set the first active element
  useEffect(() => {
    // Extract carousel data from DOM on mount
    setIsLoading(true);
    const data = extractCarouselDataFromDOM();
    setCarouselData(data);
    setIsLoading(false);
  }, []);

  return (
    <group
      ref={carouselRef}
      {...props}
      onPointerDown={handlePointerDown} // Only pointer down is needed here
      visible={isVisible} // Add visibility prop
    >
      {/* <Select enabled={false}> */}
      <RainbowConnector radius={radius + 0.5} />
      {/* </Select> */}
      {/* Only render Carousel when data is loaded */}
      {!isLoading && (
        <Carousel
          data={carouselData}
          onHoverStart={handleCardHoverStart}
          onHoverEnd={handleCardHoverEnd}
          onViewChange={handleCardViewChange}
        />
      )}
    </group>
  );
});
