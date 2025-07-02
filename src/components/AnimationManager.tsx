import { useEffect, useRef, useState, useCallback, RefObject, useMemo } from "react";
import gsap from "gsap";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGSAP } from "@gsap/react"; // Import useGSAP
import { OBSERVER_CONFIG, SECTION_ANIMATIONS } from '../config/observerConfig';

/// <reference types="vite/client" />

// Observer-based animation system - no ScrollTrigger needed

// Debug flag to control all console logs
const DEBUG_LOGS = process.env.NODE_ENV === 'development';

// FOV Constants
const DEFAULT_FOV = 55;
const WIDE_FOV = 70;
const ZOOM_FOV = 40;

// Enhanced logging with color coding
const logStyles = {
  sequence: "color: #4287f5; font-weight: bold;",
  animation: "color: #42f584; font-weight: bold;",
  timeline: "color: #c142f5; font-weight: bold;",
  system: "color: #f58c42; font-weight: bold;",
  error: "color: #f54242; font-weight: bold;",
  model: "color: #f5d742; font-weight: bold;",
  time: "color: #42c9f5; font-style: italic;",
  observer: "color: #f542c8; font-weight: bold;",
};

// Simplified logging system with performance optimization
const createLogger = (mainTimeline) => {
  // Function to get formatted timeline time
  const getTimeInfo = () => {
    if (!mainTimeline) return "";
    const time = mainTimeline.time().toFixed(2);
    const totalTime = mainTimeline.totalDuration().toFixed(2);
    return `[T:${time}s/${totalTime}s]`;
  };

  // Generic log function with throttling for performance
  let lastLogTime = 0;
  const LOG_THROTTLE = 100; // ms

  return (type, msg, ...args) => {
    if (!DEBUG_LOGS && type !== "error") return;

    // Throttle frequent logs to improve performance
    const now = Date.now();
    if (type !== "error" && now - lastLogTime < LOG_THROTTLE) return;
    lastLogTime = now;

    const mainTime = getTimeInfo();
    const style = logStyles[type] || "";
    const timeStyle = logStyles.time;

    const method = type === "error" ? console.error : console.log;
    method(
      `%c[${type.toUpperCase()}]%c${mainTime} %c${msg}`,
      style,
      timeStyle,
      style,
      ...args
    );
  };
};

// Types for model refs (replace 'any' with more specific types if available)
interface AnimationManagerProps {
  kreatonRef: RefObject<any>;
  earthRef: RefObject<any>;
  rotatorRef: RefObject<any>;
  clumpRef: RefObject<any>;
  pointingFingerRef?: RefObject<any>;
  cdTextRef?: RefObject<any>;
}

// Animation options type for camera and FOV transitions
interface AnimationOptions {
  duration?: number;
  ease?: string;
  onStart?: () => void;
  onComplete?: () => void;
}

// Section timeline options for createSectionTimeline
interface SectionTimelineOptions {
  onEnter?: () => void;
  onLeave?: () => void;
  onEnterBack?: () => void;
  onLeaveBack?: () => void;
  onUpdate?: (self: any) => void;
  start?: string;
  end?: string;
  scrub?: boolean | number;
  markers?: boolean;
  toggleActions?: string;
  animations?: Array<{ target: gsap.TweenTarget; vars: gsap.TweenVars; position?: number }>;
}

export function AnimationManager({
  kreatonRef,
  earthRef,
  rotatorRef,
  clumpRef,
  pointingFingerRef,
  cdTextRef,
  currentSection = 0,
  onSectionChange,
}: AnimationManagerProps & {
  currentSection?: number;
  onSectionChange?: (sectionIndex: number, direction: 'up' | 'down', previousSection: number) => void
}) {
  const { camera } = useThree(); // camera is always PerspectiveCamera in this app
  const mainTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const [modelReady, setModelReady] = useState<boolean>(false);
  const earthRotationRef = useRef<(() => void) | null>(null);
  const [isEarthRotating, setIsEarthRotating] = useState<boolean>(false);
  const [sectionDirection, setSectionDirection] = useState<'up' | 'down'>('down');
  const [previousSection, setPreviousSection] = useState<number>(0);
  const logRef = useRef<(type: string, msg: string, ...args: any[]) => void>((type, msg, ...args) => {
    if (type === "error") console.error(msg, ...args);
    else if (DEBUG_LOGS) console.log(msg, ...args);
  });
  const cameraTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1, 0));
  const hasPushedRef = useRef<boolean>(false);
  const explosionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pointCycleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef<boolean>(false);
  const initialAnimationPlayedRef = useRef<boolean>(false);

  // Memoize refs to prevent unnecessary re-renders
  const memoizedRefs = useMemo(() => ({
    kreatonRef,
    earthRef,
    rotatorRef,
    clumpRef,
    pointingFingerRef,
    cdTextRef,
  }), [kreatonRef, earthRef, rotatorRef, clumpRef, pointingFingerRef, cdTextRef]);

  // Reset state when component mounts
  useEffect(() => {
    hasPushedRef.current = false;
    initialAnimationPlayedRef.current = false;
    if (DEBUG_LOGS) {
      logRef.current(
        "system",
        "🚀 ANIMATION MANAGER MOUNTED - PUSH state reset:",
        {
          hasPushedRef: hasPushedRef.current,
          initialAnimationPlayed: initialAnimationPlayedRef.current
        }
      );
    }
  }, []);

  // Initialize logger when timeline is created
  const updateLogger = useCallback((timeline) => {
    logRef.current = createLogger(timeline);
  }, []);

  // Functions to control Earth rotation
  const startEarthRotation = useCallback(() => {
    if (DEBUG_LOGS) logRef.current("system", "Starting Earth rotation");
    setIsEarthRotating(true);
  }, []);

  const stopEarthRotation = useCallback(() => {
    if (DEBUG_LOGS) logRef.current("system", "Stopping Earth rotation");
    setIsEarthRotating(false);
  }, []);

  // Earth rotation setup - optimized with useCallback
  const rotateEarth = useCallback(() => {
    if (earthRef.current && isEarthRotating) {
      const rotationSpeed = (Math.PI * 2) / 60;
      earthRef.current.rotation.x -= rotationSpeed / 60;
    }
  }, [earthRef, isEarthRotating]);

  useEffect(() => {
    if (earthRef.current) {
      earthRotationRef.current = rotateEarth;
      gsap.ticker.add(rotateEarth);
      return () => {
        if (earthRotationRef.current) {
          gsap.ticker.remove(earthRotationRef.current);
          earthRotationRef.current = null;
        }
      };
    }
  }, [rotateEarth]);

  // Simplified rotator function
  const rotatorX = useCallback(
    (x) => {
      if (DEBUG_LOGS) logRef.current("system", "Moving rotator up");
      if (rotatorRef.current?.moveY) {
        rotatorRef.current.moveY(x, {
          duration: 1,
          ease: "power2.out",
          onStart: () => {
            if (DEBUG_LOGS) logRef.current("animation", "Rotator animation started");
          },
          onComplete: () => {
            if (DEBUG_LOGS) logRef.current("animation", "Rotator animation completed");
          },
        });
      } else {
        logRef.current("error", "Rotator ref or moveY method not available");
      }
    },
    [rotatorRef]
  );

  // Refactored camera target function using LERP
  const setCameraTarget = useCallback(
    (targetPosition: THREE.Vector3 | { x: number; y: number; z: number }, options: AnimationOptions = {}) => {
      const {
        duration = 1,
        ease = "power2.inOut",
        onStart,
        onComplete,
      } = options;

      // Kill any existing tweens targeting the camera target ref to prevent conflicts
      gsap.killTweensOf(cameraTargetRef.current);

      logRef.current(
        "system",
        `Setting camera target from [${cameraTargetRef.current.x.toFixed(
          2
        )}, ${cameraTargetRef.current.y.toFixed(
          2
        )}, ${cameraTargetRef.current.z.toFixed(2)}] to [${targetPosition.x}, ${targetPosition.y
        }, ${targetPosition.z}] using direct GSAP tween`
      );

      // Always use direct GSAP animation
      gsap.to(cameraTargetRef.current, {
        x: targetPosition.x,
        y: targetPosition.y,
        z: targetPosition.z,
        duration,
        ease,
        onStart: () => {
          logRef.current(
            "animation",
            "Starting direct camera target animation"
          );
          if (onStart) onStart();
        },
        onUpdate: () => {
          // Ensure camera always looks at the animating target during the tween
          camera.lookAt(cameraTargetRef.current.x, cameraTargetRef.current.y, cameraTargetRef.current.z);
        },
        onComplete: () => {
          // Ensure final lookAt is correct
          camera.lookAt(cameraTargetRef.current.x, cameraTargetRef.current.y, cameraTargetRef.current.z);
          if (onComplete) onComplete();
          logRef.current(
            "system",
            `Direct camera target animation complete: [${cameraTargetRef.current.x.toFixed(
              2
            )}, ${cameraTargetRef.current.y.toFixed(
              2
            )}, ${cameraTargetRef.current.z.toFixed(2)}]`
          );
        },
      });
    },
    [camera]
  );

  // New function to consistently handle camera position animations
  const setCameraPosition = useCallback(
    (position: THREE.Vector3 | { x: number; y: number; z: number }, options: AnimationOptions = {}) => {
      const {
        duration = 1,
        ease = "power2.inOut",
        onStart,
        onComplete,
      } = options;

      // Kill any existing tweens targeting the camera position to prevent conflicts
      gsap.killTweensOf(camera.position);

      logRef.current(
        "system",
        `Setting camera position from [${camera.position.x.toFixed(
          2
        )}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(
          2
        )}] to [${position.x}, ${position.y}, ${position.z}] using GSAP tween`
      );

      gsap.to(camera.position, {
        x: position.x,
        y: position.y,
        z: position.z,
        duration,
        ease,
        onStart: () => {
          logRef.current("animation", "Starting camera position animation");
          if (onStart) onStart();
        },
        onComplete: () => {
          if (onComplete) onComplete();
          logRef.current(
            "system",
            `Camera position animation complete: [${camera.position.x.toFixed(
              2
            )}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(
              2
            )}]`
          );
        },
      });
    },
    [camera]
  );

  // Function to smoothly change camera FOV
  const setFOV = useCallback(
    (fov: number, options: AnimationOptions = {}) => {
      const {
        duration = 1,
        ease = "power2.inOut",
        onStart,
        onComplete,
      } = options;

      // Kill any existing tweens targeting the camera FOV to prevent conflicts
      gsap.killTweensOf(camera, "fov");

      logRef.current(
        "system",
        `Setting camera FOV from ${(camera as unknown as THREE.PerspectiveCamera).fov.toFixed(
          1
        )} to ${fov} using GSAP tween`
      );

      gsap.to(camera, {
        fov,
        duration,
        ease,
        onStart: () => {
          logRef.current("animation", "Starting camera FOV animation");
          if (onStart) onStart();
        },
        onUpdate: () => {
          // IMPORTANT: Update projection matrix on each frame of the tween
          (camera as unknown as THREE.PerspectiveCamera).updateProjectionMatrix();
        },
        onComplete: () => {
          // Ensure final FOV is set and matrix updated
          (camera as unknown as THREE.PerspectiveCamera).updateProjectionMatrix();
          if (onComplete) onComplete();
          logRef.current(
            "system",
            `Camera FOV animation complete: ${(camera as unknown as THREE.PerspectiveCamera).fov.toFixed(1)}`
          );
        },
      });
    },
    [camera]
  );

  // Observer-based section handling - no ScrollTrigger needed

  // Check if all models are ready - optimized with longer interval
  useEffect(() => {
    const areModelsReady =
      kreatonRef.current &&
      kreatonRef.current.getAnimationNames &&
      earthRef.current &&
      rotatorRef.current &&
      clumpRef.current;

    if (areModelsReady) {
      if (DEBUG_LOGS) {
        logRef.current(
          "model",
          "All models are ready. Kreaton actions:",
          kreatonRef.current.getAnimationNames()
        );
      }
      setModelReady(true);
    } else {
      const checkModels = setInterval(() => {
        const allReady =
          kreatonRef.current &&
          kreatonRef.current.getAnimationNames &&
          earthRef.current &&
          rotatorRef.current &&
          clumpRef.current;

        if (allReady) {
          if (DEBUG_LOGS) {
            logRef.current(
              "model",
              "All models initialized. Kreaton actions:",
              kreatonRef.current.getAnimationNames()
            );
          }
          setModelReady(true);
          clearInterval(checkModels);
        }
      }, 250); // Increased from 100ms to 250ms for better performance

      return () => clearInterval(checkModels);
    }
  }, [kreatonRef, earthRef, rotatorRef, clumpRef]);

  // Section change handler with direction support
  const handleSectionChange = useCallback((sectionIndex: number, direction: 'up' | 'down', prevSection: number) => {
    if (!modelReady) return;

    setSectionDirection(direction);
    setPreviousSection(prevSection);

    if (OBSERVER_CONFIG.ENABLE_DEBUG_LOGS) {
      logRef.current(
        "observer",
        `[OBSERVER] Section changed to: ${sectionIndex} (${direction} from ${prevSection})`
      );
    }
    switch (sectionIndex) {
      case 0:
        // Section 0 logic with direction awareness
        if (direction === 'down') {
          // Coming from above (normal flow)
          if (!initialAnimationPlayedRef.current) {
            kreatonRef.current.transitionFromCurrentToAnimation("WALKING", {
              crossFadeTime: SECTION_ANIMATIONS.SECTION_0.modelTransitionDuration,
              fadeInDuration: 0.3,
            });
            startEarthRotation();
            setCameraTarget({ x: 0, y: 1, z: 0 }, { duration: SECTION_ANIMATIONS.SECTION_0.cameraDuration });
            setCameraPosition({ x: 0, y: 0.5, z: 4 }, { duration: SECTION_ANIMATIONS.SECTION_0.cameraDuration });
          }
        } else {
          // Coming from below (reverse flow)
          kreatonRef.current.transitionFromCurrentToAnimation("WALKING", {
            crossFadeTime: SECTION_ANIMATIONS.SECTION_0.modelTransitionDuration,
            fadeInDuration: 0.3,
          });
          startEarthRotation();
          setCameraTarget({ x: 0, y: 1, z: 0 }, { duration: SECTION_ANIMATIONS.SECTION_0.cameraDuration });
          setCameraPosition({ x: 0, y: 0.5, z: 4 }, { duration: SECTION_ANIMATIONS.SECTION_0.cameraDuration });
          if (cdTextRef?.current) {
            cdTextRef.current.resetAnimation();
            cdTextRef.current.moveUp();
            cdTextRef.current.show();
          }
        }
        break;
      case 1:
        if (direction === 'down') {
          // Normal flow: WALKING -> SALUTE
          setCameraPosition({ x: 0, y: 0.5, z: 4 }, { duration: SECTION_ANIMATIONS.SECTION_1.cameraDuration, ease: "sine.inOut" });
          setCameraTarget({ x: 0, y: 1.5, z: 0 }, { duration: SECTION_ANIMATIONS.SECTION_1.cameraDuration, ease: "sine.inOut" });
          setFOV(ZOOM_FOV, { duration: SECTION_ANIMATIONS.SECTION_1.fovChangeDuration });
          kreatonRef.current.transitionFromCurrentToAnimation("SALUTE", {
            crossFadeTime: SECTION_ANIMATIONS.SECTION_1.modelTransitionDuration,
            fadeInDuration: 0.3,
          });
          stopEarthRotation();
        } else {
          // Reverse flow: coming back from section 2
          setCameraPosition({ x: 0, y: 0.5, z: 4 }, { duration: SECTION_ANIMATIONS.SECTION_1.cameraDuration, ease: "sine.inOut" });
          setCameraTarget({ x: 0, y: 1.5, z: 0 }, { duration: SECTION_ANIMATIONS.SECTION_1.cameraDuration, ease: "sine.inOut" });
          setFOV(ZOOM_FOV, { duration: SECTION_ANIMATIONS.SECTION_1.fovChangeDuration });
          kreatonRef.current.transitionFromCurrentToAnimation("SALUTE", {
            crossFadeTime: SECTION_ANIMATIONS.SECTION_1.modelTransitionDuration,
            fadeInDuration: 0.3,
          });
          stopEarthRotation();
        }
        break;
      case 2:
        rotatorX(1);
        rotatorRef.current.setVisibility(true);
        rotatorRef.current.setObserverActive(true);
        setCameraTarget({ x: 0, y: 1, z: 5 }, { duration: SECTION_ANIMATIONS.SECTION_2.cameraDuration });
        setFOV(WIDE_FOV, { duration: SECTION_ANIMATIONS.SECTION_2.fovChangeDuration });
        break;
      case 3:
        if (cdTextRef?.current) cdTextRef.current.hide();
        kreatonRef.current.transitionFromCurrentToAnimation("IDLE");
        setFOV(DEFAULT_FOV);
        setCameraPosition({ x: 0, y: 1.5, z: 10 }, { duration: SECTION_ANIMATIONS.SECTION_3.cameraDuration });
        setCameraTarget({ x: 0, y: 0, z: 0 }, { duration: SECTION_ANIMATIONS.SECTION_3.cameraDuration });
        rotatorRef.current.setVisibility(false);
        if (clumpRef.current) {
          clumpRef.current.fadeIn(SECTION_ANIMATIONS.SECTION_3.clumpFadeDuration);
          clumpRef.current.unleashTheStorm();
        }
        break;
      case 4:
        if (clumpRef.current) clumpRef.current.calmTheStorm();
        setFOV(DEFAULT_FOV);
        setCameraPosition({ x: 0, y: 1.5, z: 10 }, { duration: SECTION_ANIMATIONS.SECTION_4.cameraDuration });
        setCameraTarget({ x: 0, y: 0, z: 0 }, { duration: SECTION_ANIMATIONS.SECTION_4.cameraDuration });
        hasPushedRef.current = false;
        if (kreatonRef.current && !hasPushedRef.current) {
          hasPushedRef.current = true;
          kreatonRef.current.transitionFromCurrentToAnimation("PUSH", {
            crossFadeTime: 0.5,
            fadeInDuration: 0.3,
            loopOnce: true,
            onComplete: () => {
              if (OBSERVER_CONFIG.ENABLE_DEBUG_LOGS) logRef.current("observer", "[OBSERVER] PUSH animation completed");
            },
          });
        }
        break;
      case 5:
        kreatonRef.current.transitionFromCurrentToAnimation("IDLE");
        setCameraPosition({ x: 0, y: 0.5, z: 4 }, { duration: SECTION_ANIMATIONS.SECTION_5.cameraDuration });
        setCameraTarget({ x: 0, y: 1.5, z: 0 }, { duration: SECTION_ANIMATIONS.SECTION_5.cameraDuration });
        rotatorX(20);
        break;
      case 6:
        setCameraPosition({ x: 1.5, y: 1.5, z: 5.5 }, { duration: SECTION_ANIMATIONS.SECTION_6.cameraDuration });
        setCameraTarget({ x: -1.5, y: 1.5, z: 0 }, { duration: SECTION_ANIMATIONS.SECTION_6.cameraDuration });
        stopEarthRotation();
        if (kreatonRef.current) {
          kreatonRef.current.transitionFromCurrentToAnimation("POINT", {
            crossFadeTime: SECTION_ANIMATIONS.SECTION_6.modelTransitionDuration,
            fadeInDuration: 0.5,
            loopOnce: true,
            onComplete: () => {
              kreatonRef.current.transitionFromCurrentToAnimation("IDLE", {
                crossFadeTime: SECTION_ANIMATIONS.SECTION_6.modelTransitionDuration,
                fadeInDuration: 0.5,
              });
            },
          });
        }
        break;
      case 7:
        // Final reset or idle
        break;
      default:
        break;
    }
    if (onSectionChange) onSectionChange(sectionIndex, direction, prevSection);
  }, [modelReady, kreatonRef, earthRef, rotatorRef, clumpRef, cdTextRef, startEarthRotation, stopEarthRotation, setCameraTarget, setCameraPosition, setFOV, rotatorX, onSectionChange]);

  // Watch for currentSection prop changes
  useEffect(() => {
    if (typeof currentSection === 'number' && modelReady) {
      // For prop-based changes, we need to determine direction from previous section
      const direction = currentSection > previousSection ? 'down' : 'up';
      handleSectionChange(currentSection, direction, previousSection);
    }
  }, [currentSection, modelReady, handleSectionChange, previousSection]);

  return null;
}
