import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGSAP } from "@gsap/react"; // Import useGSAP

// Register ScrollTrigger with GSAP
gsap.registerPlugin(ScrollTrigger);

// Debug flag to control all console logs
const DEBUG_LOGS = true;

// FOV Constants
const DEFAULT_FOV = 55;
const WIDE_FOV = 70;

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

// Simplified logging system
const createLogger = (mainTimeline) => {
  // Function to get formatted timeline time
  const getTimeInfo = () => {
    if (!mainTimeline) return "";
    const time = mainTimeline.time().toFixed(2);
    const totalTime = mainTimeline.totalDuration().toFixed(2);
    return `[T:${time}s/${totalTime}s]`;
  };

  // Generic log function
  return (type, msg, ...args) => {
    if (!DEBUG_LOGS && type !== "error") return;

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

export function AnimationManager({
  kreatonRef,
  earthRef,
  rotatorRef,
  clumpRef,
  pointingFingerRef, // Accept pointingFingerRef
  cdTextRef, // Accept cdTextRef
}) {
  const { camera } = useThree();
  const mainTimelineRef = useRef(null);
  const [modelReady, setModelReady] = useState(false);
  const earthRotationRef = useRef(null);
  const [isEarthRotating, setIsEarthRotating] = useState(false);
  const logRef = useRef((type, msg, ...args) => {
    if (type === "error") console.error(msg, ...args);
    else if (DEBUG_LOGS) console.log(msg, ...args);
  });
  const cameraTargetRef = useRef(new THREE.Vector3(0, 1, 0));
  const hasPushedRef = useRef(false);
  const explosionTimeoutRef = useRef(null);
  const pointCycleTimeoutRef = useRef(null); // Ref for the POINT/IDLE cycle timeout
  const initializedRef = useRef(false); // Double-mount guard

  // Reset state when component mounts
  useEffect(() => {
    hasPushedRef.current = false;
    logRef.current(
      "system",
      "🚀 ANIMATION MANAGER MOUNTED - PUSH state reset:",
      {
        hasPushedRef: hasPushedRef.current,
      }
    );
  }, []);

  // Initialize logger when timeline is created
  const updateLogger = (timeline) => {
    logRef.current = createLogger(timeline);
  };

  // Functions to control Earth rotation
  const startEarthRotation = useCallback(() => {
    logRef.current("system", "Starting Earth rotation");
    setIsEarthRotating(true);
  }, []);

  const stopEarthRotation = useCallback(() => {
    logRef.current("system", "Stopping Earth rotation");
    setIsEarthRotating(false);
  }, []);

  // Simplified rotator function
  const rotatorX = useCallback(
    (x) => {
      logRef.current("system", "Moving rotator up");
      if (rotatorRef.current?.moveY) {
        rotatorRef.current.moveY(x, {
          duration: 1,
          ease: "power2.out",
          onStart: () =>
            logRef.current("animation", "Rotator animation started"),
          onComplete: () =>
            logRef.current("animation", "Rotator animation completed"),
        });
      } else {
        logRef.current("error", "Rotator ref or moveY method not available");
      }
    },
    [rotatorRef]
  );

  // Refactored camera target function using LERP
  const setCameraTarget = useCallback(
    (targetPosition, options = {}) => {
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
        )}, ${cameraTargetRef.current.z.toFixed(2)}] to [${targetPosition.x}, ${
          targetPosition.y
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
          camera.lookAt(cameraTargetRef.current);
        },
        onComplete: () => {
          // Ensure final lookAt is correct
          camera.lookAt(cameraTargetRef.current);
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
  ); // Added camera to dependencies

  // New function to consistently handle camera position animations
  const setCameraPosition = useCallback(
    (position, options = {}) => {
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
  ); // Added camera to dependencies

  // Function to smoothly change camera FOV
  const setFOV = useCallback(
    (fov, options = {}) => {
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
        `Setting camera FOV from ${camera.fov.toFixed(
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
          camera.updateProjectionMatrix();
        },
        onComplete: () => {
          // Ensure final FOV is set and matrix updated
          camera.updateProjectionMatrix();
          if (onComplete) onComplete();
          logRef.current(
            "system",
            `Camera FOV animation complete: ${camera.fov.toFixed(1)}`
          );
        },
      });
    },
    [camera]
  ); // Added camera to dependencies

  // Helper function to create ScrollTrigger sections
  //? checked
  const createSectionTimeline = useCallback((sectionId, options = {}) => {
    const {
      onEnter,
      onLeave,
      onEnterBack,
      onLeaveBack,
      onUpdate,
      start = "top top",
      end = "bottom top",
      scrub = true,
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
  }, []); // Empty dependency array as it uses logRef (stable) and gsap (global)

  // Check if model is ready
  useEffect(() => {
    if (kreatonRef.current && kreatonRef.current.getAnimationNames) {
      logRef.current(
        "model",
        "Kreaton model is ready with actions:",
        kreatonRef.current.getAnimationNames()
      );
      setModelReady(true);
    } else {
      const checkModel = setInterval(() => {
        if (kreatonRef.current?.getAnimationNames) {
          logRef.current(
            "model",
            "Kreaton model initialized with actions:",
            kreatonRef.current.getAnimationNames()
          );
          setModelReady(true);
          clearInterval(checkModel);
        }
      }, 10);

      return () => clearInterval(checkModel);
    }
  }, [kreatonRef]); // Corrected dependency

  // Earth rotation setup
  useEffect(() => {
    if (earthRef.current) {
      const rotationSpeed = (Math.PI * 2) / 60;

      const rotateEarth = () => {
        if (earthRef.current && isEarthRotating) {
          earthRef.current.rotation.x -= rotationSpeed / 60;
        }
      };

      earthRotationRef.current = rotateEarth;
      gsap.ticker.add(rotateEarth);
      return () => {
        if (earthRotationRef.current) {
          gsap.ticker.remove(earthRotationRef.current);
          earthRotationRef.current = null;
        }
      };
    }
  }, [earthRef, isEarthRotating]); // Corrected dependencies

  // Setup animation timeline with ScrollTrigger using useGSAP
  useGSAP(
    () => {
      // Double-mount guard for dev/StrictMode
      if (initializedRef.current) {
        console.log("AnimationManager: Already initialized, skipping setup.");
        return;
      }

      if (!modelReady) {
        console.log("AnimationManager: modelReady is false, skipping setup.");
        return;
      }

      initializedRef.current = true; // Only set after modelReady is true
      console.log("AnimationManager: useGSAP running, modelReady is true, initializing timeline.");

      // Create the main timeline
      const mainTimeline = gsap.timeline({
        smoothChildTiming: true,
        autoRemoveChildren: false,
      });
      mainTimelineRef.current = mainTimeline; // Assign to ref
      updateLogger(mainTimeline); // Initialize logger with the timeline

      logRef.current(
        "system",
        `PUSH animation state: hasPushedRef=${hasPushedRef.current}`
      );
      logRef.current(
        "system",
        "Setting up animation timeline with actions:",
        kreatonRef.current.getAnimationNames()
      );

      const animations = kreatonRef.current.getAnimationNames();
      setCameraTarget({ x: 0, y: 1, z: 0 }, { duration: 1 });
      logRef.current(
        "system",
        "Initial camera setup - Camera looking at:",
        cameraTargetRef.current.toArray()
      );

      /*
    Initial animation setup - plays without scrolling
    */
      if (animations.includes("JUMP") && animations.includes("WALKING")) {
        logRef.current("model", "PLAYING ANIMATION JUMP->WALK");
        kreatonRef.current.transitionAnimation("JUMP", "WALKING", {
          crossFadeTime: 0.8,
          fadeInDuration: 0.3,
        });
        const jumpWalkTimeout = setTimeout(() => startEarthRotation(), 2400);
      }

      /*
    Section 0 - Introduction/Walking
    */
      createSectionTimeline("section-0", {
        end: "bottom 80%",
        onEnter: () => {
          logRef.current("model", "PLAYING ANIMATION current->WALKING");
          kreatonRef.current.transitionFromCurrentToAnimation("WALKING", {
            crossFadeTime: 0.8,
            fadeInDuration: 0.3,
          });
          startEarthRotation();
          setCameraTarget({ x: 0, y: 1, z: 0 }, { duration: 1 });
        },
        onLeaveBack: () => {
          logRef.current(
            "model",
            "REVERSE: Reverting from SALUTE to WALKING (leaving Section 0 backwards)"
          );
          kreatonRef.current.transitionFromCurrentToAnimation("WALKING", {
            crossFadeTime: 0.8,
            fadeInDuration: 0.3,
          });
          startEarthRotation();
          setCameraTarget(
            { x: 0, y: 1, z: 0 },
            { duration: 1, ease: "sine.inOut" }
          );
          setCameraPosition(
            { x: 0, y: 0.5, z: 4 },
            { duration: 1, ease: "sine.inOut" }
          );
        },
        onUpdate: (self) => {
          logRef.current(
            "scrollTrigger",
            `Intro progress: ${self.progress.toFixed(2)}`
          );
        },
        onEnterBack: () => {
          setCameraTarget(
            { x: 0, y: 1.5, z: 0 },
            { duration: 1, ease: "sine.inOut" }
          );
          setCameraPosition(
            { x: 0, y: 0.5, z: 4 },
            { duration: 1, ease: "sine.inOut" }
          );
          if (cdTextRef.current) {
            logRef.current("animation", "Playing CDtext intro animation");
            cdTextRef.current.moveUp();
            cdTextRef.current.show();
          }
        },
        onLeave: () => {
          if (cdTextRef.current) {
            logRef.current("animation", "Playing CDtext intro animation");
            cdTextRef.current.moveUp(10);
            cdTextRef.current.hide();
          }
        },
      });

      /*
    Section 1 - Salute Animation
    */
      createSectionTimeline("section-1", {
        onEnter: () => {
          setCameraPosition(
            { x: 0, y: 0.5, z: 4 },
            { duration: 1, ease: "sine.inOut" }
          );
          setCameraTarget(
            { x: 0, y: 1.5, z: 0 },
            { duration: 1, ease: "sine.inOut" }
          );
          logRef.current("model", "PLAYING ANIMATION current->SALUTE");
          kreatonRef.current.transitionFromCurrentToAnimation("SALUTE", {
            crossFadeTime: 0.8,
            fadeInDuration: 0.3,
          });
          stopEarthRotation();
        },
        onLeaveBack: () => {
          logRef.current("model", "REVERSE: Reverting from SALUTE to WALKING");
          kreatonRef.current.transitionFromCurrentToAnimation("WALKING", {
            crossFadeTime: 0.8,
            fadeInDuration: 0.3,
          });
          startEarthRotation();
          setCameraTarget(
            { x: 0, y: 1, z: 0 },
            { duration: 1, ease: "sine.inOut" }
          );
        },
        onEnterBack: () => {
          setCameraTarget(
            { x: 0, y: 1.5, z: 0 },
            { duration: 1, ease: "sine.inOut" }
          );
          setCameraPosition(
            { x: 0, y: 0.5, z: 4 },
            { duration: 1, ease: "sine.inOut" }
          );
        },
      });

      function rotatorCameraSetup(bottomUp = false) {
        if (bottomUp) {
          setCameraPosition(
            { x: 0, y: 1, z: 2 },
            { duration: 1, ease: "power3.inOut" }
          );
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
        }
        setCameraTarget(
          { x: 0, y: 1, z: 5 },
          { duration: 1.0, ease: "power2.inOut" }
        );
        setFOV(WIDE_FOV);
      }

      if (clumpRef.current) {
        clumpRef.current.setActive(false);
      }

      /*
    Section 2 - Rotation Sequence
    */
      createSectionTimeline("section-2", {
        onEnter: () => {
          logRef.current("scrollTrigger", "Transitioning to carousel view");
          console.log("YOOOOOOOOOOo");
          rotatorX(1);
          rotatorCameraSetup();
          if (clumpRef.current) {
            logRef.current("animation", "Activating clump particles");
            clumpRef.current.setActive(true);
            clumpRef.current.toggleShield(true);
          }
          if (cdTextRef.current) {
            cdTextRef.current.hide();
          }
        },
        onLeaveBack: () => {
          const cameraSequence = gsap.timeline(); // Cleaned up by useGSAP
          cameraSequence
            .to(camera.position, {
              x: 2,
              duration: 0.5,
              ease: "power3.inOut",
            })
            .to(camera.position, {
              x: 0,
              duration: 0.5,
              ease: "power3.inOut",
            });
          rotatorX(20);
          setFOV(DEFAULT_FOV);
          setCameraTarget(
            { x: 0, y: 1, z: 0 },
            { duration: 1, ease: "power2.inOut" }
          );
          logRef.current(
            "model",
            "REVERSE: Reverting to SALUTE (leaving Section 2 backwards)"
          );
          kreatonRef.current.transitionFromCurrentToAnimation("SALUTE", {
            crossFadeTime: 0.8,
            fadeInDuration: 0.3,
          });
          stopEarthRotation();
        },
        onEnterBack: () => {
          // setFOV(55); // This was commented out, keeping it so
        },
      });

      /*
    new Section 3 - Activating clump particles
    */
      createSectionTimeline("section-3", {
        onEnter: () => {
          if (cdTextRef.current) {
            cdTextRef.current.hide();
          }
        },
        onLeaveBack: () => {
          if (clumpRef.current && clumpRef.current.isActive) {
            logRef.current(
              "animation",
              "Deactivating clump particles (leaving Section 3 backwards)"
            );
            clumpRef.current.setActive(false);
            clumpRef.current.toggleShield(false);
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
          if (clumpRef.current && clumpRef.current.isActive) {
            clumpRef.current.setActive(false);
            clumpRef.current.toggleShield(false);
          }
        },
        onEnterBack: () => {
          rotatorCameraSetup(true);
          if (clumpRef.current && !clumpRef.current.isActive) {
            clumpRef.current.setActive(false); // Should this be true? Original was setActive(false)
            clumpRef.current.toggleShield(false);
          }
        },
      });

      /*
    Section 4 - Final Explosion Sequence
    */
      createSectionTimeline("section-4", {
        onEnter: () => {
          setFOV(DEFAULT_FOV);
          setCameraPosition(
            { x: 10, y: 10, z: 10 },
            { duration: 1, ease: "power3.inOut" }
          );
          setCameraTarget(
            { x: 0, y: 1.5, z: 0 },
            { duration: 1, ease: "power2.inOut" }
          );

          if (kreatonRef.current && !hasPushedRef.current) {
            logRef.current("model", "PLAYING ANIMATION PUSH (first time only)");
            hasPushedRef.current = true;
            const currentAnimations = kreatonRef.current.getAnimationNames(); // Renamed from 'animations' to avoid conflict
            if (currentAnimations.includes("PUSH")) {
              kreatonRef.current.transitionFromCurrentToAnimation("PUSH", {
                crossFadeTime: 0.5,
                fadeInDuration: 0.3,
                loopOnce: true,
                onComplete: () => {
                  logRef.current("model", "PUSH animation completed");
                },
              });
              const pushAction = kreatonRef.current.actions["PUSH"];
              const animationDuration = pushAction
                ? pushAction.getClip().duration
                : 1.5;
              logRef.current(
                "system",
                `PUSH animation duration: ${animationDuration}s`
              );
              explosionTimeoutRef.current = setTimeout(() => {
                if (clumpRef.current) {
                  logRef.current(
                    "animation",
                    "Triggering permanent explosion at end of PUSH animation"
                  );
                  clumpRef.current.permanentExplosion(300);
                  stopEarthRotation();
                }
                explosionTimeoutRef.current = null;
                if (currentAnimations.includes("IDLE")) {
                  logRef.current(
                    "model",
                    "Transitioning from PUSH to IDLE animation"
                  );
                  kreatonRef.current.transitionFromCurrentToAnimation("IDLE", {
                    crossFadeTime: 0.5,
                    fadeInDuration: 0.3,
                  });
                }
              }, 1800);
            } else {
              logRef.current(
                "error",
                "PUSH animation not found! Using fallback."
              );
              explosionTimeoutRef.current = setTimeout(() => {
                if (clumpRef.current) {
                  logRef.current(
                    "animation",
                    "Triggering fallback permanent explosion"
                  );
                  clumpRef.current.permanentExplosion(300);
                  stopEarthRotation();
                }
                explosionTimeoutRef.current = null;
              }, 1500);
            }
          } else if (hasPushedRef.current) {
            logRef.current("model", "PUSH animation already played, skipping");
          }
        },
        onLeaveBack: () => {
          logRef.current("scrollTrigger", "Leaving Section 4 Backwards");
          setCameraPosition(
            { x: 10, y: 10, z: 10 },
            { duration: 1, ease: "power3.inOut" }
          );
          setCameraTarget(
            { x: 0, y: 1.5, z: 0 },
            { duration: 1, ease: "power2.inOut" }
          );
          rotatorX(1);
          const currentAnimations =
            kreatonRef.current?.getAnimationNames() || []; // Ensure kreatonRef.current exists
          if (kreatonRef.current && currentAnimations.includes("IDLE")) {
            logRef.current(
              "model",
              "REVERSE: Reverting to IDLE (leaving Section 4 backwards)"
            );
            kreatonRef.current.transitionFromCurrentToAnimation("IDLE", {
              crossFadeTime: 0.5,
              fadeInDuration: 0.5,
            });
          }
          if (clumpRef.current && !clumpRef.current.isActive) {
            logRef.current(
              "animation",
              "Re-activating clump particles (leaving Section 4 backwards)"
            );
            clumpRef.current.setActive(true);
            clumpRef.current.toggleShield(true);
          }
        },
      });

      /*
    Section 5 - back to Kreaton face
    */
      createSectionTimeline("section-5", {
        onEnter: () => {
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
            kreatonRef.current.transitionFromCurrentToAnimation("IDLE", {
              crossFadeTime: 0.5,
              fadeInDuration: 0.5,
            });
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
              kreatonRef.current.transitionFromCurrentToAnimation("IDLE", {
                crossFadeTime: 0.5,
                fadeInDuration: 0.5,
              });
            }
          }
        },
        onLeave: () => {
          logRef.current("scrollTrigger", "Leaving Section 6");
          if (pointCycleTimeoutRef.current) {
            clearTimeout(pointCycleTimeoutRef.current);
            pointCycleTimeoutRef.current = null;
            logRef.current("model", "Cleared POINT/IDLE cycle timeout");
          }
        },
        onLeaveBack: () => {
          logRef.current("scrollTrigger", "Leaving Section 6 Backwards");
          if (pointCycleTimeoutRef.current) {
            clearTimeout(pointCycleTimeoutRef.current);
            pointCycleTimeoutRef.current = null;
            logRef.current("model", "Cleared POINT/IDLE cycle timeout");
          }
          if (kreatonRef.current) {
            kreatonRef.current.transitionFromCurrentToAnimation("IDLE", {
              crossFadeTime: 0.5,
              fadeInDuration: 0.5,
            });
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
          logRef.current("scrollTrigger", "Re-entering Section 6");
        },
      });

      /*
    Section 7 - Final Reset
    */
      createSectionTimeline("section-7", {
        onEnter: () => {},
        onLeaveBack: () => {
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
        kreatonRef,
        earthRef,
        rotatorRef,
        clumpRef,
        pointingFingerRef,
        cdTextRef,
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
