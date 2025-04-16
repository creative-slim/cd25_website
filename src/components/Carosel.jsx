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

// Define the number of cards to display
const NUM_CARDS_TO_DISPLAY = 6;
// Define the radius of the circle for card placement
const radius = 5; // Add this line to define the radius

const fetchImageData = async (webhookUrl) => {
  try {
    const response = await fetch(webhookUrl);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch image data: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching image data:", error);
    // Return empty array as fallback
    return [];
  }
};

const url =
  "https://webhook.creative-directors.com/webhook/7bd04d17-2d35-49e1-a2aa-10b5c8ee3429";

// Wrap the Carousel component with React.memo to optimize rendering
function Carousel({
  data = [],
  onHoverStart,
  onHoverEnd,
  onViewChange,
  ...props
}) {
  const count = data.length; // Use data length for count
  if (count === 0) return null; // Don't render if no data

  return data.map((item, i) => {
    // Use the first image from the item's images array, or a fallback
    const imageUrl = item.images?.[0] || "https://picsum.photos/600"; // Fallback if no images

    return (
      <Card
        key={item.slug || i} // Use slug as key if available
        index={i}
        data={item} // Pass the full item data to the card
        url={imageUrl}
        position={[
          Math.sin((i / count) * Math.PI * 2) * radius,
          0,
          Math.cos((i / count) * Math.PI * 2) * radius,
        ]}
        rotation={[0, Math.PI + (i / count) * Math.PI * 2, 0]}
        onHoverStart={onHoverStart} // Pass down
        onHoverEnd={onHoverEnd} // Pass down
        onViewChange={onViewChange} // Pass down view change handler
      />
    );
  });
}

// Accept and call hover handlers
function Card({
  url,
  index,
  data,
  onHoverStart,
  onHoverEnd,
  onViewChange,
  ...props
}) {
  const ref = useRef();
  const [hovered, hover] = useState(false);
  const pointerOver = (e) => {
    e.stopPropagation();
    hover(true);
    onHoverStart?.(); // Call handler if provided
  };
  const pointerOut = () => {
    // No stopPropagation needed on pointerOut usually
    hover(false);
    onHoverEnd?.(); // Call handler if provided
  };
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
      userData={{ index, data }} // Store index and data in userData for easy access
      {...props}
    >
      <bentPlaneGeometry args={[0.1, 1.618, 1, 20, 20]} />
    </Image>
  );
}

export const Rotator = forwardRef(({ ...props }, ref) => {
  const [carouselData, setCarouselData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const carouselRef = useRef();
  const isDraggingRef = useRef(false);
  const prevXRef = useRef(0);
  const velocityRef = useRef(0); // Ref to store rotation velocity
  const pointerHistoryRef = useRef([]); // Ref to store recent pointer positions and times
  const hoveredCardCountRef = useRef(0); // Ref to count hovered cards
  const lastVisibleCardRef = useRef(null); // Track the last visible card index
  const { gl, camera } = useThree();
  const [currentCardData, setCurrentCardData] = useState(null);
  // Constants for damping
  const rotationSensitivity = 0.001; // Keep the sensitivity for direct drag
  const dampingFactor = 0.92; // How quickly the velocity decays (0.9 = faster decay, 0.99 = slower decay)
  const minVelocity = 0.0001; // Threshold to stop the rotation completely
  const autoRotateSpeed = 0.0005; // Speed for default rotation

  // Fetch the data when the component mounts
  useEffect(() => {
    async function fetchData() {
      try {
        const endpointResponse = await fetchImageData(url);
        setCarouselData(endpointResponse.slice(0, NUM_CARDS_TO_DISPLAY));
      } catch (error) {
        console.error("Error fetching carousel data:", error);
        // Provide some fallback data in case of failure
        setCarouselData([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Function to calculate which card the camera is looking at
  const determineVisibleCard = useCallback(() => {
    if (!carouselRef.current) return null;

    // Get all card objects (Image components)
    const cards = carouselRef.current.children.filter(
      (child) => child.type === "Mesh" && child.userData.data
    );

    if (cards.length === 0) return null;

    // Camera position and direction
    const cameraPosition = new THREE.Vector3();
    camera.getWorldPosition(cameraPosition);
    const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(
      camera.quaternion
    );

    // Raycasting approach - find which card is most directly in the camera's line of sight
    let closestCard = null;
    let closestDistance = Infinity;
    let smallestAngle = Infinity;

    cards.forEach((card) => {
      // Get card position in world space
      const cardPosition = new THREE.Vector3();
      card.getWorldPosition(cardPosition);

      // Direction from camera to card
      const toCameraVector = new THREE.Vector3().subVectors(
        cardPosition,
        cameraPosition
      );
      const distance = toCameraVector.length();
      toCameraVector.normalize();

      // Calculate angle between camera direction and direction to card
      // Smaller angle means the card is more directly in front of the camera
      const angle = cameraDirection.angleTo(toCameraVector);

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
    console.log("Clearing active project classes");
    const allProjectElements = document.querySelectorAll("[data-projects]");
    allProjectElements.forEach((el) => {
      el.classList.remove("active");
    });
    console.log("Cleared active project classes");
  }, []);

  // Function to update DOM elements based on the current card
  const updateActiveElements = useCallback(
    (cardData) => {
      if (!cardData?.slug) {
        clearActiveProjectClasses();
        return;
      }

      const targetSelector = `[data-projects="${cardData.slug}"]`;
      const targetElement = document.querySelector(targetSelector);

      if (targetElement) {
        console.log("Found target element for slug:", cardData.slug);

        // Remove 'active' class from all elements with data-projects attribute
        const allProjectElements = document.querySelectorAll("[data-projects]");
        allProjectElements.forEach((el) => {
          el.classList.remove("active");
        });

        // Add 'active' class to the element matching the current card
        targetElement.classList.add("active");

        // Optional: Scroll to the target element
        // targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        console.warn(
          `Element with data-projects="${cardData.slug}" not found.`
        );
        clearActiveProjectClasses();
      }
    },
    [clearActiveProjectClasses]
  );

  // Handler for card view changes with improved logging
  const handleCardViewChange = useCallback(
    (cardData) => {
      if (!cardData) {
        clearActiveProjectClasses();
        return;
      }

      // Check if card data has actually changed before updating
      if (!currentCardData || currentCardData.slug !== cardData.slug) {
        console.log("Card in view changed to:", cardData.name);
        setCurrentCardData(cardData);

        // Update DOM elements with active class
        updateActiveElements(cardData);

        // Provide an option for parent components to subscribe to this event
        props.onCardViewChange?.(cardData);
      }
    },
    [props, currentCardData, updateActiveElements, clearActiveProjectClasses]
  );

  // Add this useEffect to log current card data whenever it changes
  useEffect(() => {
    if (currentCardData) {
      console.log("Current Card Details:", {
        name: currentCardData.name,
        slug: currentCardData.slug,
        imageCount: currentCardData.images?.length || 0,
      });
    }
  }, [currentCardData]);

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

    // New method to get the current visible card data
    getCurrentCardData: () => currentCardData,
  }));

  // Apply damping and auto-rotation in the render loop with enhanced view detection
  useFrame(() => {
    if (!carouselRef.current) return;

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
        handleCardViewChange(visibleCardData.data);
      }
    } else {
      // No card is in view, clear the active classes
      if (lastVisibleCardRef.current) {
        clearActiveProjectClasses();
        lastVisibleCardRef.current = null;
      }
    }
  });

  // Remove useEffect for canvas hover state

  // Handlers for card hover events
  const handleCardHoverStart = () => {
    hoveredCardCountRef.current++;
    console.log(
      "Rotator: Card Hover Start, Count:",
      hoveredCardCountRef.current
    );
  };

  const handleCardHoverEnd = () => {
    hoveredCardCountRef.current = Math.max(0, hoveredCardCountRef.current - 1); // Prevent negative count
    console.log("Rotator: Card Hover End, Count:", hoveredCardCountRef.current);
  };

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

    // console.log(
    //   `Rotator: Window Pointer Move - DeltaX: ${deltaX}, PrevX: ${prevXRef.current}, CurrentX: ${currentX}`
    // );
    prevXRef.current = currentX; // Update ref
  };

  // Renamed handler for clarity
  const handleWindowPointerUp = (e) => {
    if (isDraggingRef.current) {
      console.log("Rotator: Window Pointer Up");
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
          console.log(
            `Calculated Velocity: ${velocityRef.current} (from ${pixelsPerMs} px/ms)`
          );
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
    console.log("Rotator: Pointer Down on Group", e.clientX);
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
    // This will run once after the component has mounted and cards are loaded
    const initialCard = determineVisibleCard();
    if (initialCard?.data) {
      updateActiveElements(initialCard.data);
    }
  }, [determineVisibleCard, updateActiveElements]);

  return (
    <group
      ref={carouselRef}
      {...props}
      onPointerDown={handlePointerDown} // Only pointer down is needed here
    >
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
