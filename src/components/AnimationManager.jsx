import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

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
  scrollContainerRef,
}) {
  const { camera } = useThree();
  const mainTimelineRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
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
  const scrollTriggersRef = useRef([]);
  const pointCycleTimeoutRef = useRef(null); // Ref for the POINT/IDLE cycle timeout

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
  const startEarthRotation = () => {
    logRef.current("system", "Starting Earth rotation");
    setIsEarthRotating(true);
  };

  const stopEarthRotation = () => {
    logRef.current("system", "Stopping Earth rotation");
    setIsEarthRotating(false);
  };

  // Simplified rotator function
  const rotatorX = (x) => {
    logRef.current("system", "Moving rotator up");
    if (rotatorRef.current?.moveY) {
      rotatorRef.current.moveY(x, {
        duration: 1,
        ease: "power2.out",
        onStart: () => logRef.current("animation", "Rotator animation started"),
        onComplete: () =>
          logRef.current("animation", "Rotator animation completed"),
      });
    } else {
      logRef.current("error", "Rotator ref or moveY method not available");
    }
  };

  // Refactored camera target function using LERP
  const setCameraTarget = (targetPosition, options = {}) => {
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
        logRef.current("animation", "Starting direct camera target animation");
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
  };

  // New function to consistently handle camera position animations
  const setCameraPosition = (position, options = {}) => {
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
          )}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)}]`
        );
      },
    });
  };

  // Function to smoothly change camera FOV
  const setFOV = (fov, options = {}) => {
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
  };

  // Helper function to create ScrollTrigger sections
  //? checked
  const createSectionTimeline = (sectionId, options = {}) => {
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

    // Store the ScrollTrigger for cleanup
    scrollTriggersRef.current.push(timeline.scrollTrigger);

    return timeline;
  };

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
  }, [kreatonRef.current]);

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
    }

    return () => {
      if (earthRotationRef.current) {
        gsap.ticker.remove(earthRotationRef.current);
      }
    };
  }, [earthRef.current, isEarthRotating]);

  // Cleanup function
  const cleanupTimeline = () => {
    // Kill all ScrollTrigger instances
    scrollTriggersRef.current.forEach((trigger) => trigger.kill());
    scrollTriggersRef.current = [];

    // Kill main timeline
    if (mainTimelineRef.current) {
      mainTimelineRef.current.kill();
      mainTimelineRef.current = null;
    }

    // Clear explosion timeout
    if (explosionTimeoutRef.current) {
      clearTimeout(explosionTimeoutRef.current);
      explosionTimeoutRef.current = null;
    }
    // Clear point cycle timeout
    if (pointCycleTimeoutRef.current) {
      clearTimeout(pointCycleTimeoutRef.current);
      pointCycleTimeoutRef.current = null;
    }

    // Kill any other ScrollTriggers
    ScrollTrigger.getAll().forEach((st) => st.kill());
  };

  // Setup animation timeline with ScrollTrigger
  useEffect(() => {
    // Add pointingFingerRef.current to the dependency check
    if (!modelReady) return;

    cleanupTimeline();

    // Create the main timeline
    const mainTimeline = gsap.timeline({
      smoothChildTiming: true,
      autoRemoveChildren: false,
      paused: true,
    });

    mainTimelineRef.current = mainTimeline;
    updateLogger(mainTimeline);

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

    // Reset camera target for proper initialization
    // cameraTargetRef.current.set(0, 1.5, 0);
    // camera.lookAt(cameraTargetRef.current);
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
      setTimeout(() => startEarthRotation(), 2400);
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
        // Revert state from Section 1 when scrolling up past Section 0 bottom
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
        // Ensure camera position matches end of Section 0 animation
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
        // Reset camera target to original position
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

      // // Add the camera animation directly here
      // animations: [
      //   {
      //     target: camera.position,
      //     vars: {
      //       z: 2.2,
      //       y: 1.2,
      //       x: 0,
      //       duration: 1,
      //       ease: "sine.inOut",
      //     },
      //     position: 0, // Start at the beginning of the timeline
      //   },
      // ],
    });

    /*
    Section 1 - Salute Animation
    */
    createSectionTimeline("section-1", {
      onEnter: () => {
        // Add CDtext animation play

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
        // Reset camera target to original position
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
      // Create and play camera sequence immediately
      if (bottomUp) {
        setCameraPosition(
          { x: 0, y: 1, z: 2 },
          { duration: 1, ease: "power3.inOut" }
        );
      } else {
        const cameraSequence = gsap.timeline();
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
      // Move camera target to focus on carousel
      setCameraTarget(
        { x: 0, y: 1, z: 5 },
        { duration: 1.0, ease: "power2.inOut" }
      );

      setFOV(WIDE_FOV);
    }

    // Make sure clump starts inactive until we reach farview
    if (clumpRef.current) {
      clumpRef.current.setActive(false);
    }

    /*
    Section 2 - Rotation Sequence
    */
    createSectionTimeline("section-2", {
      onEnter: () => {
        // Smooth transition from the circular path to carousel view
        logRef.current("scrollTrigger", "Transitioning to carousel view");
        console.log("YOOOOOOOOOOo");
        rotatorX(1);

        rotatorCameraSetup();

        if (clumpRef.current) {
          logRef.current("animation", "Activating clump particles");
          clumpRef.current.setActive(true);
          clumpRef.current.toggleShield(true);
        }

        // Hide CDtext when entering this section
        if (cdTextRef.current) {
          cdTextRef.current.hide();
        }
      },
      onLeaveBack: () => {
        // Create and play camera sequence immediately
        const cameraSequence = gsap.timeline();
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
        cameraSequence.play();

        rotatorX(20);
        setFOV(DEFAULT_FOV);

        // Reset camera target to original position
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
        stopEarthRotation(); // Ensure earth is stopped as in Section 1

        // Show CDtext when leaving this section backwards
        // if (cdTextRef.current) {
        //   cdTextRef.current.show();
        // }
      },
      onEnterBack: () => {
        // setFOV(55);
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
        // Deactivate clump when scrolling back up through this section
        if (clumpRef.current && clumpRef.current.isActive) {
          logRef.current(
            "animation",
            "Deactivating clump particles (leaving Section 3 backwards)"
          );
          clumpRef.current.setActive(false);
          clumpRef.current.toggleShield(false);
        }
        // Revert camera target from Section 4's wide view back to Section 2's carousel focus
        // setCameraTarget(
        //   { x: 0, y: 1, z: 0 },
        //   { duration: 1.0, ease: "power2.inOut" }
        // );
        // Revert camera position from Section 4's wide view back to Section 2's end position (approx 0, y, z)
        // setCameraPosition(
        //   { x: 0, y: 1.2, z: 2.2 },
        //   { duration: 1, ease: "power3.inOut" }
        // );
        // Revert animation state if needed (e.g., back to IDLE or SALUTE depending on Section 2 logic)
        // Assuming Section 2 ends with IDLE or SALUTE
        logRef.current(
          "model",
          "REVERSE: Reverting animation state (leaving Section 3 backwards)"
        );
        kreatonRef.current.transitionFromCurrentToAnimation("SALUTE", {
          // Or IDLE? Check Section 2 logic
          crossFadeTime: 0.5,
          fadeInDuration: 0.5,
        });
      },
      onLeave: () => {
        // setFOV(DEFAULT_FOV);

        // Deactivate clump when leaving this section
        if (clumpRef.current && clumpRef.current.isActive) {
          clumpRef.current.setActive(false);
          clumpRef.current.toggleShield(false);
        }
      },
      onEnterBack: () => {
        rotatorCameraSetup(true); // Move camera to bottom-up view
        // Re-activate clump when scrolling back up through this section
        if (clumpRef.current && !clumpRef.current.isActive) {
          clumpRef.current.setActive(false);
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
        // Move camera to a wider view
        setCameraPosition(
          { x: 10, y: 10, z: 10 },
          { duration: 1, ease: "power3.inOut" }
        );

        // Reset camera target to focus on Kreaton
        setCameraTarget(
          { x: 0, y: 1.5, z: 0 },
          { duration: 1, ease: "power2.inOut" }
        );

        // Handle PUSH animation and explosion
        if (kreatonRef.current && !hasPushedRef.current) {
          logRef.current("model", "PLAYING ANIMATION PUSH (first time only)");

          // Mark as played immediately
          hasPushedRef.current = true;

          const animations = kreatonRef.current.getAnimationNames();
          if (animations.includes("PUSH")) {
            // Play the animation
            kreatonRef.current.transitionFromCurrentToAnimation("PUSH", {
              crossFadeTime: 0.5,
              fadeInDuration: 0.3,
              loopOnce: true,
              onComplete: () => {
                logRef.current("model", "PUSH animation completed");
              },
            });

            // Get animation duration
            const pushAction = kreatonRef.current.actions["PUSH"];
            const animationDuration = pushAction
              ? pushAction.getClip().duration
              : 1.5;

            logRef.current(
              "system",
              `PUSH animation duration: ${animationDuration}s`
            );

            // Schedule explosion
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

              if (animations.includes("IDLE")) {
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
            // Fallback
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
          logRef.current("model", "PUSH animation  already played, skipping");
        }
      },
      onLeaveBack: () => {
        logRef.current("scrollTrigger", "Leaving Section 4 Backwards");
        // Revert camera position from Section 5 back to Section 4's wide view
        setCameraPosition(
          { x: 10, y: 10, z: 10 },
          { duration: 1, ease: "power3.inOut" }
        );
        // Revert camera target from Section 5 back to Section 4's target
        setCameraTarget(
          { x: 0, y: 1.5, z: 0 },
          { duration: 1, ease: "power2.inOut" }
        );
        // Revert rotator state if changed in Section 5
        rotatorX(1); // Assuming Section 5 used rotatorX(20) and Section 4 needs it back at 1 (or initial state)

        // Revert animation state (likely back to IDLE after PUSH)
        if (kreatonRef.current && animations.includes("IDLE")) {
          logRef.current(
            "model",
            "REVERSE: Reverting to IDLE (leaving Section 4 backwards)"
          );
          kreatonRef.current.transitionFromCurrentToAnimation("IDLE", {
            crossFadeTime: 0.5,
            fadeInDuration: 0.5,
          });
        }
        // Ensure clump is active as it should be at the end of Section 3 / start of Section 4
        if (clumpRef.current && !clumpRef.current.isActive) {
          logRef.current(
            "animation",
            "Re-activating clump particles (leaving Section 4 backwards)"
          );
          clumpRef.current.setActive(true);
          clumpRef.current.toggleShield(true); // Assuming shield was on
        }
      },
    });

    /*
    Section 5 - back to Kreaton face
    */
    createSectionTimeline("section-5", {
      onEnter: () => {
        // Move camera to a wider view
        setCameraPosition(
          { x: 0, y: 0.5, z: 4 },
          { duration: 1, ease: "power3.inOut" }
        );

        // Reset camera target to focus on Kreaton
        setCameraTarget(
          { x: 0, y: 1.5, z: 0 },
          { duration: 1, ease: "power2.inOut" }
        );

        rotatorX(20);
      },
      onLeaveBack: () => {
        logRef.current("scrollTrigger", "Leaving Section 5 Backwards");
        // Revert camera position from Section 6 back to Section 5's position
        setCameraPosition(
          { x: 0, y: 0.5, z: 4 },
          { duration: 1, ease: "power3.inOut" }
        );
        // Revert camera target from Section 6 back to Section 5's target
        setCameraTarget(
          { x: 0, y: 1.5, z: 0 },
          { duration: 1, ease: "power2.inOut" }
        );
        // Stop the POINT/IDLE cycle from Section 6
        if (pointCycleTimeoutRef.current) {
          clearTimeout(pointCycleTimeoutRef.current);
          pointCycleTimeoutRef.current = null;
          logRef.current(
            "model",
            "Cleared POINT/IDLE cycle timeout (leaving Section 5 backwards)"
          );
        }
        // Revert animation state (likely back to IDLE)
        if (kreatonRef.current && animations.includes("IDLE")) {
          logRef.current(
            "model",
            "REVERSE: Reverting to IDLE (leaving Section 5 backwards)"
          );
          kreatonRef.current.transitionFromCurrentToAnimation("IDLE", {
            crossFadeTime: 0.5,
            fadeInDuration: 0.5,
          });
        }
        // Revert rotator state (should be 20 as set in Section 5 onEnter)
        rotatorX(20);
        // Ensure earth rotation is stopped (as it was in Section 4/5)
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
        // Move camera to close-up position
        setCameraPosition(
          { x: 1.5, y: 1.5, z: 5.5 },
          { duration: 1, ease: "power2.inOut" }
        );

        // Set camera target
        setCameraTarget(
          { x: -1.5, y: 1.5, z: 0 },
          { duration: 1, ease: "power2.inOut" }
        );

        // stop earth rotation
        stopEarthRotation();

        // --- POINT/IDLE Cycle Logic ---
        if (kreatonRef.current) {
          const animations = kreatonRef.current.getAnimationNames();
          logRef.current("model", "Available animations:", animations);

          // Clear any previous cycle timeout
          if (pointCycleTimeoutRef.current) {
            clearTimeout(pointCycleTimeoutRef.current);
            pointCycleTimeoutRef.current = null;
          }

          const playPointCycle = () => {
            if (!kreatonRef.current) return; // Guard against component unmount

            logRef.current("model", "Starting POINT animation in cycle");
            // Use slightly longer fade times for smoother transition
            kreatonRef.current.transitionFromCurrentToAnimation("POINT", {
              crossFadeTime: 0.5, // Duration for the previous animation to fade out
              fadeInDuration: 0.5, // Duration for POINT to fade in
              loopOnce: true,
              onComplete: () => {
                if (!kreatonRef.current) return; // Guard against component unmount

                logRef.current(
                  "model",
                  "POINT completed, switching to IDLE for 5s"
                );
                // set the current animation to POINT before the next one
                kreatonRef.current.playAnimation("POINT");
                // Use slightly longer fade times for smoother transition
                kreatonRef.current.transitionFromCurrentToAnimation("IDLE", {
                  crossFadeTime: 0.5, // Duration for POINT to fade out
                  fadeInDuration: 0.5, // Duration for IDLE to fade in
                });

                // Clear existing timeout before setting a new one
                if (pointCycleTimeoutRef.current) {
                  clearTimeout(pointCycleTimeoutRef.current);
                }

                // Set timeout to restart the cycle
                pointCycleTimeoutRef.current = setTimeout(() => {
                  logRef.current(
                    "model",
                    "IDLE timeout finished, restarting POINT cycle"
                  );
                  playPointCycle(); // Call recursively to loop
                }, 5000); // 5 seconds delay
              },
            });
          };

          // Start the cycle if POINT and IDLE animations exist
          if (animations.includes("POINT") && animations.includes("IDLE")) {
            playPointCycle();
          } else {
            logRef.current(
              "error",
              "POINT or IDLE animation not found, cannot start cycle. Playing IDLE."
            );
            // Fallback to IDLE if animations are missing
            kreatonRef.current.transitionFromCurrentToAnimation("IDLE", {
              crossFadeTime: 0.5,
              fadeInDuration: 0.5, // Match fade duration
            });
          }
        }
      },
      onLeave: () => {
        logRef.current("scrollTrigger", "Leaving Section 6");
        // Clear the cycle timeout when leaving the section
        if (pointCycleTimeoutRef.current) {
          clearTimeout(pointCycleTimeoutRef.current);
          pointCycleTimeoutRef.current = null;
          logRef.current("model", "Cleared POINT/IDLE cycle timeout");
        }
        // Optionally transition to a specific animation when leaving downwards

        /* disabled for now because section 7 is not implemented yet */
        /* -- -- */
        // if (kreatonRef.current) {
        //   kreatonRef.current.transitionFromCurrentToAnimation("IDLE", {
        //     crossFadeTime: 0.5, // Consistent fade time
        //     fadeInDuration: 0.5,
        //   });
        // }
      },
      onLeaveBack: () => {
        logRef.current("scrollTrigger", "Leaving Section 6 Backwards");
        // Clear the cycle timeout when leaving the section backwards
        if (pointCycleTimeoutRef.current) {
          clearTimeout(pointCycleTimeoutRef.current);
          pointCycleTimeoutRef.current = null;
          logRef.current("model", "Cleared POINT/IDLE cycle timeout");
        }
        // Transition back to the previous section's state (e.g., IDLE)
        if (kreatonRef.current) {
          kreatonRef.current.transitionFromCurrentToAnimation("IDLE", {
            crossFadeTime: 0.5, // Consistent fade time
            fadeInDuration: 0.5,
          });
        }

        // Revert camera/target to Section 5 state
        setCameraPosition(
          { x: 0, y: 0.5, z: 4 },
          { duration: 1, ease: "power3.inOut" }
        );
        setCameraTarget(
          { x: 0, y: 1.5, z: 0 },
          { duration: 1, ease: "power2.inOut" }
        );
        // Revert rotator state
        rotatorX(20);
      },
      onEnterBack: () => {
        logRef.current("scrollTrigger", "Re-entering Section 6");
        // The onEnter logic will handle restarting the cycle automatically
      },
    });

    /*
    Section 7 - Final Reset
    */
    createSectionTimeline("section-7", {
      onEnter: () => {
        // setCameraTarget({ x: 0, y: 0, z: 0 }, { duration: 0.5 });
      },
      onLeaveBack: () => {
        logRef.current(
          "scrollTrigger",
          "Leaving Section 7 Backwards (Re-entering Section 6)"
        );
        // Revert any state changes made by Section 7 onEnter (currently none)
        // Ensure state matches the end of Section 6 when scrolling back up into it.
        // This involves restarting the POINT/IDLE cycle, which is handled by Section 6 onEnterBack -> onEnter.
        // We just need to ensure camera/target/rotator match Section 6's onEnter state.

        setCameraPosition(
          { x: 1.5, y: 1.5, z: 5.5 },
          { duration: 1, ease: "power2.inOut" }
        );
        setCameraTarget(
          { x: -1.5, y: 1.5, z: 0 },
          { duration: 1, ease: "power2.inOut" }
        );
        // Rotator state in Section 6 is not explicitly set onEnter, assuming it remains 20 from Section 5?
        // rotatorX(20); // Or whatever state Section 6 expects

        // Stop earth rotation (as done in Section 6 onEnter)
        stopEarthRotation();

        // Animation cycle is handled by Section 6 onEnter
      },
    });

    // setIsInitialized(true);

    // return () => cleanupTimeline();
  }, [
    camera,
    modelReady,
    scrollContainerRef.current,
    pointingFingerRef.current,
    cdTextRef.current, // Add cdTextRef to dependency array
  ]);

  return (
    <>
      {isInitialized ? null : (
        <mesh visible={false}>
          {/* Trigger to ensure component updates when isInitialized changes */}
        </mesh>
      )}
    </>
  );
}
