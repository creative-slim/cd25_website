import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGSAP } from "@gsap/react"; // Import useGSAP

/// <reference types="vite/client" />

// Register ScrollTrigger with GSAP
gsap.registerPlugin(ScrollTrigger);

// Debug flag to control all console logs
const DEBUG_LOGS = process.env.NODE_ENV === 'development';

// FOV Constants
const DEFAULT_FOV = 55;
const WIDE_FOV = 70;
const ZOOM_FOV = 40;

// --- Energy Particles Fade Timing ---
const ENERGY_FADE_OUT_BEFORE_EXPLOSION = 0.5; // seconds before explosion to fade out energy
const ENERGY_FADE_OUT_DURATION = 0.3; // seconds for EnergyParticles fade-out (should match in EnergyParticles)

// At the top, add:
const KREATON_DEFAULT_EMISSIVE_INTENSITY = 8; // Should match Kreaton_A.jsx

// Enhanced logging with color coding
const logStyles = {
  sequence: "color: #4287f5; font-weight: bold;",
  animation: "color: #42f584; font-weight: bold;",
  timeline: "color: #c142f5; font-weight: bold;",
  system: "color: #f58c42; font-weight: bold;",
  error: "color: #f54242; font-weight: bold;",
  model: "color: #f5d742; font-weight: bold;",
  time: "color: #42c9f5; font-style: italic;",
  scrollTrigger: "color: #f542c8; font-weight: bold;",
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
  kreatonRef: any;
  earthRef: any;
  rotatorRef: any;
  clumpRef: any;
  pointingFingerRef?: any;
  cdTextRef?: any;
  setEnergyParticlesActive?: (active: boolean) => void;
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
  setEnergyParticlesActive,
}: AnimationManagerProps) {
  const { camera } = useThree(); // camera is always PerspectiveCamera in this app
  const mainTimelineRef = useRef(null);
  const [modelReady, setModelReady] = useState(false);
  const earthRotationRef = useRef(null);
  const [isEarthRotating, setIsEarthRotating] = useState(false);
  const logRef = useRef((type: string, msg: string, ...args: any[]) => {
    if (type === "error") console.error(msg, ...args);
    else if (DEBUG_LOGS) console.log(msg, ...args);
  });
  const cameraTargetRef = useRef(new THREE.Vector3(0, 1, 0));
  const hasPushedRef = useRef(false);
  const explosionTimeoutRef = useRef(null);
  const pointCycleTimeoutRef = useRef(null);
  const initializedRef = useRef(false);
  const initialAnimationPlayedRef = useRef(false);

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

  // Helper function to create ScrollTrigger sections
  const createSectionTimeline = useCallback((sectionId: string, options: SectionTimelineOptions = {}) => {
    const {
      onEnter,
      onLeave,
      onEnterBack,
      onLeaveBack,
      onUpdate,
      start = "top top",
      end = "bottom top",
      scrub = 0.5,
      markers = false, // Set to false in production
      toggleActions = "play none none reverse",
      animations = [], // New parameter to accept animations
    } = options;

    const timeline = gsap.timeline({
      smoothChildTiming: true,

      scrollTrigger: {
        trigger: `#${sectionId}`,
        start,
        end,
        scrub,
        markers,
        toggleActions,
        id: sectionId,
        onEnter: () => {
          logRef.current("scrollTrigger", `Entered ${sectionId}`);
          if (onEnter) onEnter();
        },
        onLeave: () => {
          logRef.current("scrollTrigger", `Left ${sectionId}`);
          if (onLeave) onLeave();
        },
        onEnterBack: () => {
          logRef.current("scrollTrigger", `Re-entered ${sectionId}`);
          if (onEnterBack) onEnterBack();
        },
        onLeaveBack: () => {
          logRef.current("scrollTrigger", `backwards-Left ${sectionId}`);
          if (onLeaveBack) onLeaveBack();
        },
        onUpdate: onUpdate ? (self) => onUpdate(self) : undefined,
      },
    });

    // Add animations passed in options
    animations.forEach(({ target, vars, position = 0 }) => {
      timeline.to(target, vars, position);
    });

    return timeline;
  }, []);

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

  // Setup animation timeline with ScrollTrigger using useGSAP
  useGSAP(
    () => {
      // Double-mount guard for dev/StrictMode
      if (initializedRef.current) {
        if (DEBUG_LOGS) console.log("AnimationManager: Already initialized, skipping setup.");
        return;
      }

      if (!modelReady) {
        if (DEBUG_LOGS) console.log("AnimationManager: modelReady is false, skipping setup.");
        return;
      }

      initializedRef.current = true; // Only set after modelReady is true
      if (DEBUG_LOGS) console.log("AnimationManager: useGSAP running, modelReady is true, initializing timeline.");

      function kreatonTransitionFromCurrentToAnimation(animation: string) {
        kreatonRef.current.transitionFromCurrentToAnimation(animation, {
          crossFadeTime: 0.8,
          fadeInDuration: 0.3,
        });
      }

      // Create the main timeline
      const mainTimeline = gsap.timeline({
        smoothChildTiming: true,
        autoRemoveChildren: false,
        paused: false, // Start timeline immediately
        delay: 0.5,
      });
      mainTimelineRef.current = mainTimeline; // Assign to ref
      updateLogger(mainTimeline); // Initialize logger with the timeline

      if (DEBUG_LOGS) {
        logRef.current(
          "system",
          `PUSH animation state: hasPushedRef=${hasPushedRef.current}`
        );
        logRef.current(
          "system",
          "Setting up animation timeline with actions:",
          kreatonRef.current.getAnimationNames()
        );
      }

      const animations = kreatonRef.current.getAnimationNames();
      setCameraTarget({ x: 0, y: 1, z: 0 }, { duration: 1 });
      if (DEBUG_LOGS) {
        logRef.current(
          "system",
          "Initial camera setup - Camera looking at:",
          cameraTargetRef.current.toArray()
        );
      }

      /*
      Initial animation setup - plays without scrolling
      */
      if (animations.includes("JUMP") && animations.includes("WALKING") && !initialAnimationPlayedRef.current) {
        logRef.current("model", "PLAYING ANIMATION JUMP->WALK");
        initialAnimationPlayedRef.current = true;
        kreatonRef.current.transitionAnimation("JUMP", "WALKING", {
          crossFadeTime: 0.8,
          fadeInDuration: 0.3,
        });
        const jumpWalkTimeout = setTimeout(() => startEarthRotation(), 2400);
      }

      function rotatorCameraSetup(bottomUp = false) {
        setCameraTarget(
          { x: 0, y: 1, z: 5 },
          { duration: 1, ease: "power2.inOut" }
        );
        if (bottomUp) {

          const cameraSequence = gsap.timeline(); // This timeline will be cleaned up by useGSAP
          cameraSequence
            .to(camera.position, {
              x: 2,
              y: 1.5,
              z: 2,
              duration: 0.5,
              ease: "power3.inOut",
            })
            .to(camera.position, {
              x: 0,
              y: 1.5,
              z: 2,
              duration: 0.5,
              ease: "power3.inOut",
            });

          cameraSequence.play();

        } else {

          const cameraSequence = gsap.timeline(); // This timeline will be cleaned up by useGSAP
          cameraSequence
            .to(camera.position, {
              x: 2,
              y: 1.5,
              z: 2,
              duration: 0.5,
              ease: "power3.inOut",
            })
            .to(camera.position, {
              x: 0,
              y: 1.5,
              z: 2,
              duration: 0.5,
              ease: "power3.inOut",
            });
          cameraSequence.play();
        }

        setFOV(WIDE_FOV);
      }

      if (clumpRef.current) {
        clumpRef.current.setActive(false);
      }

      /*
      Section 0 - Introduction/Walking
      */
      createSectionTimeline("section-0", {
        end: "bottom 80%",
        onEnter: () => {
          console.log(" --------section 0 onEnter");
          // Removed setActive test call; now controlled via Leva in SceneCanvas.jsx
          // Only start walking if we haven't played the initial animation
          if (!initialAnimationPlayedRef.current) {
            logRef.current("model", "PLAYING ANIMATION current->WALKING");
            initialAnimationPlayedRef.current = true;
            kreatonTransitionFromCurrentToAnimation("WALKING");
            startEarthRotation();
            setCameraTarget({ x: 0, y: 1, z: 0 }, { duration: 1 });
            setCameraPosition({ x: 0, y: 0.5, z: 4 }, { duration: 1 });
          }
        },

        onLeave: () => {
          console.log(" --------section 0 onLeave");
          if (cdTextRef?.current) {
            logRef.current("animation", "Playing CDtext intro animation");
            cdTextRef.current.moveUp(10);
            cdTextRef.current.hide();
          }

        },
        onEnterBack: () => {
          console.log(" -------- section 0 onEnterBack");
          setCameraTarget(
            { x: 0, y: 1.5, z: 0 },
            { duration: 1, ease: "sine.inOut" }
          );
          setCameraPosition(
            { x: 0, y: 0.5, z: 4 },
            { duration: 1, ease: "sine.inOut" }
          );
          if (cdTextRef?.current) {
            logRef.current("animation", "Playing CDtext intro animation");
            cdTextRef.current.resetAnimation();
            cdTextRef.current.moveUp();
            cdTextRef.current.show();
          }
        },

        // onLeaveBack: () => {
        //   logRef.current(
        //     "model",
        //     "REVERSE: Reverting from SALUTE to WALKING (leaving Section 0 backwards)"
        //   );
        //   kreatonRef.current.transitionFromCurrentToAnimation("WALKING", {
        //     crossFadeTime: 0.8,
        //     fadeInDuration: 0.3,
        //   });
        //   startEarthRotation();
        //   setCameraTarget(
        //     { x: 0, y: 1, z: 0 },
        //     { duration: 1, ease: "sine.inOut" }
        //   );
        //   setCameraPosition(
        //     { x: 0, y: 0.5, z: 4 },
        //     { duration: 1, ease: "sine.inOut" }
        //   );
        // },

        onUpdate: (self) => {
          logRef.current(
            "scrollTrigger",
            `Intro progress: ${self.progress.toFixed(2)}`
          );
        },


      });

      /*
      Section 1 - Salute Animation
      */
      createSectionTimeline("section-1", {
        onEnter: () => {
          console.log(" --------section 1 onEnter");
          setCameraPosition(
            { x: 0, y: 0.5, z: 4 },
            { duration: 1, ease: "sine.inOut" }
          );
          setCameraTarget(
            { x: 0, y: 1.5, z: 0 },
            { duration: 1, ease: "sine.inOut" }
          );
          setFOV(ZOOM_FOV);
          logRef.current("model", "PLAYING ANIMATION current->SALUTE");
          kreatonTransitionFromCurrentToAnimation("SALUTE");
          stopEarthRotation();
        },
        onLeaveBack: () => {
          console.log(" --------section 1 onLeaveBack");
          logRef.current("model", "REVERSE: Reverting from SALUTE to WALKING");
          kreatonTransitionFromCurrentToAnimation("WALKING");
          startEarthRotation();
          // setCameraTarget( DELETE
          //   { x: 0, y: 1, z: 0 },
          //   { duration: 1, ease: "sine.inOut" }
          // );
          setFOV(DEFAULT_FOV);
        },
        onEnterBack: () => {
          console.log(" --------section 1 onEnterBack");
          setCameraTarget(
            { x: 0, y: 1.5, z: 0 },
            { duration: 1, ease: "sine.inOut" }
          ); // to be verified

          setCameraPosition(
            { x: 0, y: 0.5, z: 4 },
            { duration: 1, ease: "sine.inOut" }
          );

          // const cameraSequence = gsap.timeline(); // Cleaned up by useGSAP
          // cameraSequence
          //   .to(camera.position, {
          //     x: 2,
          //     y: 0.5,
          //     z: 4,
          //     duration: 0.5,
          //     ease: "power3.inOut",
          //   })
          //   .to(camera.position, {
          //     x: 0,
          //     y: 0.5,
          //     z: 4,
          //     duration: 0.5,
          //     ease: "power3.inOut",
          //   });

          setFOV(ZOOM_FOV);
        },
      });

      /*
      Section 2 - Rotation Sequence
      */
      createSectionTimeline("section-2", {
        onEnter: () => {
          console.log(" --------section 2 onEnter");
          logRef.current("scrollTrigger", "Transitioning to carousel view");
          rotatorX(1);

          rotatorRef.current.setVisibility(true);
          rotatorRef.current.setObserverActive(true); // Enable observer when entering section
          rotatorCameraSetup();
          if (cdTextRef?.current) {
            cdTextRef.current.hide();
          }
        },
        onLeaveBack: () => {
          console.log(" --------section 2 onLeaveBack");
          rotatorRef.current.setVisibility(false);
          rotatorRef.current.setObserverActive(false); // Disable observer when leaving section

          rotatorX(20);

          setFOV(DEFAULT_FOV);
          rotatorCameraSetup(true);
          logRef.current(
            "model",
            "REVERSE: Reverting to SALUTE (leaving Section 2 backwards)"
          );
          kreatonTransitionFromCurrentToAnimation("SALUTE");
          stopEarthRotation();
        },
        onEnterBack: () => {
          console.log(" --------section 2 onEnterBack");
          rotatorX(1);
          rotatorRef.current.setVisibility(true);
          rotatorRef.current.setObserverActive(true); // Enable observer when re-entering section
          rotatorCameraSetup(true);
        },
      });

      /*
      new Section 3 - Activating clump particles
      */
      createSectionTimeline("section-3", {
        onEnter: () => {
          console.log(" --------section 3 onEnter");
          if (cdTextRef?.current) {
            cdTextRef.current.hide();
          }
          if (kreatonRef.current) {
            kreatonTransitionFromCurrentToAnimation("IDLE");
          }

          setFOV(DEFAULT_FOV);
          setCameraPosition(
            { x: 0, y: 1.5, z: 10 },
            { duration: 1, ease: "power3.inOut" }
          );
          setCameraTarget(
            { x: 0, y: 0, z: 0 },
            { duration: 1, ease: "power2.inOut" }
          );
          rotatorRef.current.setVisibility(false);

          // Activate clump in section 3
          if (clumpRef.current) {
            logRef.current("animation", "Fading in and unleashing storm in Section 3");
            clumpRef.current.fadeIn(1.5);
            clumpRef.current.unleashTheStorm();
          }

        },
        onEnterBack: () => {
          console.log(" --------section 3 onEnterBack");
          // Activate clump in section 3

          if (clumpRef.current) {
            logRef.current("animation", "Re-entering Section 3, unleashing storm");

            clumpRef.current.fadeIn(1);
            clumpRef.current.unleashTheStorm();

          }


        },
        onLeaveBack: () => {
          console.log(" --------section 3 onLeaveBack");
          if (clumpRef.current) {
            logRef.current(
              "animation",
              "Fading out rocks (leaving Section 3 backwards)"
            );
            clumpRef.current.fadeOut(1);
          }
          logRef.current(
            "model",
            "REVERSE: Reverting animation state (leaving Section 3 backwards)"
          );
          kreatonRef.current.transitionFromCurrentToAnimation("SALUTE", {
            crossFadeTime: 0.5,
            fadeInDuration: 0.5,
          });
        },
        onLeave: () => {
          console.log(" --------section 3 onLeave");
          console.log("section 3 onLeave empty");
        },

      });

      /*
      Section 4 - Final Explosion Sequence
      */
      createSectionTimeline("section-4", {
        onEnter: () => {
          console.log(" --------section 4 onEnter");

          // Turn on energy particles immediately
          if (setEnergyParticlesActive) setEnergyParticlesActive(true);
          // Bump Kreaton skin emissive intensity for channeling
          if (kreatonRef.current && kreatonRef.current.setSkinEmissiveIntensity) {
            kreatonRef.current.setSkinEmissiveIntensity(KREATON_DEFAULT_EMISSIVE_INTENSITY + 20);
          }

          if (clumpRef.current) {
            logRef.current("animation", "Calming the storm in Section 4");
            clumpRef.current.calmTheStorm();
          }
          // CAMERA SETUP
          setFOV(DEFAULT_FOV);
          setCameraPosition(
            { x: 0, y: 1.5, z: 10 },
            { duration: 1, ease: "power3.inOut" }
          );
          setCameraTarget(
            { x: 0, y: 0, z: 0 },
            { duration: 1, ease: "power2.inOut" }
          );
          // END CAMERA SETUP
          // Reset the hasPushedRef to false // TEMPORARY
          hasPushedRef.current = false;
          // Delay the push animation and explosion
          if (kreatonRef.current && !hasPushedRef.current) {
            logRef.current("model", "Scheduling PUSH animation with delay");
            hasPushedRef.current = true;
            const currentAnimations = kreatonRef.current.getAnimationNames();
            stopEarthRotation();

            if (currentAnimations.includes("PUSH")) {
              logRef.current("model", "Playing PUSH animation");
              kreatonRef.current.transitionFromCurrentToAnimation("PUSH", {
                crossFadeTime: 0.5,
                fadeInDuration: 0.3,
                loopOnce: true,
                onComplete: () => {
                  logRef.current("model", "PUSH animation completed");
                },
              });

              // Delay the explosion to sync with the push animation
              const pushAction = kreatonRef.current.actions["PUSH"];
              const animationDuration = pushAction ? pushAction.getClip().duration : 1.5;

              // Turn off energy particles before explosion
              if (setEnergyParticlesActive) {
                setTimeout(() => {
                  setEnergyParticlesActive(false);
                  // Reset Kreaton skin emissive intensity on explosion
                  if (kreatonRef.current && kreatonRef.current.setSkinEmissiveIntensity) {
                    kreatonRef.current.setSkinEmissiveIntensity(KREATON_DEFAULT_EMISSIVE_INTENSITY);
                  }
                }, (animationDuration * 1000 * 0.7) - (ENERGY_FADE_OUT_BEFORE_EXPLOSION * 1000));
              }

              // Trigger explosion near the end of the push animation
              explosionTimeoutRef.current = setTimeout(() => {
                if (clumpRef.current) {
                  logRef.current("animation", "Triggering permanent explosion");
                  // clumpRef.current.permanentExplosion(1);
                  stopEarthRotation();
                  // Hide clump after explosion
                  // clumpRef.current.setVisibility(false);
                }
                explosionTimeoutRef.current = null;

                // Transition to IDLE after explosion
                if (currentAnimations.includes("IDLE")) {
                  logRef.current("model", "Transitioning to IDLE animation");
                  kreatonTransitionFromCurrentToAnimation("IDLE");
                }
              }, animationDuration * 1000 * 0.7); // Trigger at 70% of push animation
            } else {
              logRef.current("error", "PUSH animation not found! Using fallback.");
              explosionTimeoutRef.current = setTimeout(() => {
                if (clumpRef.current) {
                  logRef.current("animation", "Triggering fallback permanent explosion");
                  // clumpRef.current.permanentExplosion(1);
                  stopEarthRotation();
                  // Hide clump after explosion
                  // clumpRef.current.setVisibility(false);
                }
                explosionTimeoutRef.current = null;
              }, 1000);
            }
          } else if (hasPushedRef.current) {
            logRef.current("model", "PUSH animation already played, skipping");
          }
        },
        onEnterBack: () => {
          console.log(" --------section 4 onEnterBack");
          logRef.current("scrollTrigger", "Re-entering Section 4 from below");
          // Turn on energy particles when re-entering
          // not on enter back
          // if (setEnergyParticlesActive) setEnergyParticlesActive(true);


          // not on enter back
          // if (kreatonRef.current && kreatonRef.current.setSkinEmissiveIntensity) {
          //   kreatonRef.current.setSkinEmissiveIntensity(KREATON_DEFAULT_EMISSIVE_INTENSITY + 10);
          // }
          if (clumpRef.current) {
            logRef.current("animation", "Re-entering Section 4, calming storm");
            clumpRef.current.calmTheStorm();
            clumpRef.current.fadeIn(1);
          }
          setFOV(DEFAULT_FOV);
          setCameraPosition(
            { x: 0, y: 1.5, z: 10 },
            { duration: 1, ease: "power3.inOut" }
          );
          setCameraTarget(
            { x: 0, y: 0, z: 0 },
            { duration: 1, ease: "power2.inOut" }
          );
        },
        onLeave: () => {
          console.log(" --------section 4 onLeave");
          // Turn off energy particles when leaving
          if (setEnergyParticlesActive) setEnergyParticlesActive(false);
          // Reset Kreaton skin emissive intensity
          if (kreatonRef.current && kreatonRef.current.setSkinEmissiveIntensity) {
            kreatonRef.current.setSkinEmissiveIntensity(KREATON_DEFAULT_EMISSIVE_INTENSITY);
          }
          if (clumpRef.current) {
            logRef.current("animation", "Fading out rocks (leaving Section 4)");
            // clumpRef.current.fadeOut(1);
          }
        },
        onLeaveBack: () => {
          // This is handled by onEnterBack of section 3
          console.log(" --------section 4 onLeaveBack");
          // Turn off energy particles when leaving backwards
          if (setEnergyParticlesActive) setEnergyParticlesActive(false);
          // Reset Kreaton skin emissive intensity
          if (kreatonRef.current && kreatonRef.current.setSkinEmissiveIntensity) {
            kreatonRef.current.setSkinEmissiveIntensity(KREATON_DEFAULT_EMISSIVE_INTENSITY);
          }
        },
      });

      /*
      Section 5 - back to Kreaton face
      */
      createSectionTimeline("section-5", {
        onEnter: () => {
          console.log(" --------section 5 onEnter");
          if (kreatonRef.current) {
            kreatonTransitionFromCurrentToAnimation("IDLE");
          }
          setCameraPosition(
            { x: 0, y: 0.5, z: 4 },
            { duration: 1, ease: "power3.inOut" }
          );
          setCameraTarget(
            { x: 0, y: 1.5, z: 0 },
            { duration: 1, ease: "power2.inOut" }
          );
          rotatorX(20);
        },
        onLeaveBack: () => {
          console.log(" --------section 5 onLeaveBack");
          logRef.current("scrollTrigger", "Leaving Section 5 Backwards");
          setCameraPosition(
            { x: 0, y: 0.5, z: 4 },
            { duration: 1, ease: "power3.inOut" }
          );
          setCameraTarget(
            { x: 0, y: 1.5, z: 0 },
            { duration: 1, ease: "power2.inOut" }
          );
          if (pointCycleTimeoutRef.current) {
            clearTimeout(pointCycleTimeoutRef.current);
            pointCycleTimeoutRef.current = null;
            logRef.current(
              "model",
              "Cleared POINT/IDLE cycle timeout (leaving Section 5 backwards)"
            );
          }
          const currentAnimations =
            kreatonRef.current?.getAnimationNames() || [];
          if (kreatonRef.current && currentAnimations.includes("IDLE")) {
            logRef.current(
              "model",
              "REVERSE: Reverting to IDLE (leaving Section 5 backwards)"
            );
            kreatonTransitionFromCurrentToAnimation("IDLE");
          }
          rotatorX(20);
          stopEarthRotation();
        },
      });

      /*
      Section 6 - kreaton side and point
      */
      createSectionTimeline("section-6", {
        onEnter: () => {
          console.log(" --------section 6 onEnter");
          logRef.current(
            "scrollTrigger",
            "Entering Section 6 - POINT/IDLE Cycle"
          );
          setCameraPosition(
            { x: 1.5, y: 1.5, z: 5.5 },
            { duration: 1, ease: "power2.inOut" }
          );
          setCameraTarget(
            { x: -1.5, y: 1.5, z: 0 },
            { duration: 1, ease: "power2.inOut" }
          );
          stopEarthRotation();

          if (kreatonRef.current) {
            const currentAnimations = kreatonRef.current.getAnimationNames();
            logRef.current("model", "Available animations:", currentAnimations);

            if (pointCycleTimeoutRef.current) {
              clearTimeout(pointCycleTimeoutRef.current);
              pointCycleTimeoutRef.current = null;
            }

            const playPointCycle = () => {
              if (!kreatonRef.current) return;
              logRef.current("model", "Starting POINT animation in cycle");
              kreatonRef.current.transitionFromCurrentToAnimation("POINT", {
                crossFadeTime: 0.5,
                fadeInDuration: 0.5,
                loopOnce: true,
                onComplete: () => {
                  if (!kreatonRef.current) return;
                  logRef.current(
                    "model",
                    "POINT completed, switching to IDLE for 5s"
                  );
                  kreatonRef.current.playAnimation("POINT");
                  kreatonRef.current.transitionFromCurrentToAnimation("IDLE", {
                    crossFadeTime: 0.5,
                    fadeInDuration: 0.5,
                  });
                  if (pointCycleTimeoutRef.current) {
                    clearTimeout(pointCycleTimeoutRef.current);
                  }
                  pointCycleTimeoutRef.current = setTimeout(() => {
                    logRef.current(
                      "model",
                      "IDLE timeout finished, restarting POINT cycle"
                    );
                    playPointCycle();
                  }, 5000);
                },
              });
            };

            if (
              currentAnimations.includes("POINT") &&
              currentAnimations.includes("IDLE")
            ) {
              playPointCycle();
            } else {
              logRef.current(
                "error",
                "POINT or IDLE animation not found, cannot start cycle. Playing IDLE."
              );
              kreatonTransitionFromCurrentToAnimation("IDLE");
            }
          }
        },
        onLeave: () => {
          console.log(" --------section 6 onLeave");
          logRef.current("scrollTrigger", "Leaving Section 6");
          if (pointCycleTimeoutRef.current) {
            clearTimeout(pointCycleTimeoutRef.current);
            pointCycleTimeoutRef.current = null;
            logRef.current("model", "Cleared POINT/IDLE cycle timeout");
          }
        },
        onLeaveBack: () => {
          console.log(" --------section 6 onLeaveBack");
          logRef.current("scrollTrigger", "Leaving Section 6 Backwards");
          if (pointCycleTimeoutRef.current) {
            clearTimeout(pointCycleTimeoutRef.current);
            pointCycleTimeoutRef.current = null;
            logRef.current("model", "Cleared POINT/IDLE cycle timeout");
          }
          if (kreatonRef.current) {
            kreatonTransitionFromCurrentToAnimation("IDLE");
          }
          setCameraPosition(
            { x: 0, y: 0.5, z: 4 },
            { duration: 1, ease: "power3.inOut" }
          );
          setCameraTarget(
            { x: 0, y: 1.5, z: 0 },
            { duration: 1, ease: "power2.inOut" }
          );
          rotatorX(20);
        },
        onEnterBack: () => {
          console.log(" --------section 6 onEnterBack");
          logRef.current("scrollTrigger", "Re-entering Section 6");
        },
      });

      /*
      Section 7 - Final Reset
      */
      createSectionTimeline("section-7", {
        onEnter: () => { },
        onLeaveBack: () => {
          console.log(" --------section 7 onLeaveBack");
          logRef.current(
            "scrollTrigger",
            "Leaving Section 7 Backwards (Re-entering Section 6)"
          );
          setCameraPosition(
            { x: 1.5, y: 1.5, z: 5.5 },
            { duration: 1, ease: "power2.inOut" }
          );
          setCameraTarget(
            { x: -1.5, y: 1.5, z: 0 },
            { duration: 1, ease: "power2.inOut" }
          );
          stopEarthRotation();
        },
      });

      // Cleanup logic for GSAP, ScrollTrigger, and timeouts
      return () => {
        initializedRef.current = false;
        if (explosionTimeoutRef.current) {
          clearTimeout(explosionTimeoutRef.current);
          explosionTimeoutRef.current = null;
        }
        if (pointCycleTimeoutRef.current) {
          clearTimeout(pointCycleTimeoutRef.current);
          pointCycleTimeoutRef.current = null;
        }
        // Kill all GSAP timelines and ScrollTriggers to prevent memory leaks
        gsap.globalTimeline.clear();
        if (typeof ScrollTrigger !== 'undefined') {
          ScrollTrigger.getAll().forEach(trigger => trigger.kill());
        }
      };
    },
    {
      dependencies: [
        camera,
        modelReady,
        memoizedRefs, // Use memoized refs instead of individual refs
        startEarthRotation,
        stopEarthRotation,
        rotatorX,
        setCameraTarget,
        setCameraPosition,
        setFOV,
        createSectionTimeline,
      ],
    }
  ); // End of useGSAP

  return null;
}
