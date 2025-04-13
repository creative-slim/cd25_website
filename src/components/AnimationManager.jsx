import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

// Register ScrollTrigger with GSAP
gsap.registerPlugin(ScrollTrigger);

// Debug flag to control all console logs
const DEBUG_LOGS = true;

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
  const cameraTargetRef = useRef(new THREE.Vector3(0, 1.5, 0));
  const hasPushedRef = useRef(false);
  const explosionTimeoutRef = useRef(null);
  const scrollTriggersRef = useRef([]);

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
        duration: 1.2,
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
      duration = 0.8,
      ease = "power2.inOut",
      onStart,
      onComplete,
      lerpFactor = 0.05, // Default LERP factor for smooth interpolation
      useLerp = true, // Flag to use LERP instead of direct GSAP animation
    } = options;

    logRef.current(
      "system",
      `Setting camera target to [${targetPosition.x}, ${targetPosition.y}, ${
        targetPosition.z
      }]${useLerp ? " using LERP" : ""}`
    );

    // Store target for reference
    const target = new THREE.Vector3(
      targetPosition.x,
      targetPosition.y,
      targetPosition.z
    );

    if (useLerp) {
      // Create a temporary object to track animation progress
      const progress = { value: 0 };
      const startPosition = cameraTargetRef.current.clone();

      // Animation ticker for LERP
      const lerpTick = () => {
        // Calculate position using LERP
        cameraTargetRef.current.lerp(target, lerpFactor);
        // Update camera look direction
        camera.lookAt(cameraTargetRef.current);
      };

      // Add the ticker to GSAP
      gsap.ticker.add(lerpTick);

      // Use GSAP to control the duration of the LERP animation
      gsap.to(progress, {
        value: 1,
        duration,
        ease,
        onStart: () => {
          if (onStart) onStart();
          logRef.current("animation", "Starting LERP camera target animation");
        },
        onComplete: () => {
          // Force exact final position to avoid floating point issues
          cameraTargetRef.current.copy(target);
          camera.lookAt(cameraTargetRef.current);

          // Remove the ticker
          gsap.ticker.remove(lerpTick);

          if (onComplete) onComplete();
          logRef.current(
            "system",
            `LERP camera target animation complete: [${cameraTargetRef.current.x.toFixed(
              2
            )}, ${cameraTargetRef.current.y.toFixed(
              2
            )}, ${cameraTargetRef.current.z.toFixed(2)}]`
          );
        },
      });
    } else {
      // Original GSAP direct animation (as fallback)
      gsap.to(cameraTargetRef.current, {
        x: targetPosition.x,
        y: targetPosition.y,
        z: targetPosition.z,
        duration,
        ease,
        onStart: () => {
          if (onStart) onStart();
        },
        onUpdate: () => {
          camera.lookAt(cameraTargetRef.current);
        },
        onComplete: () => {
          if (onComplete) onComplete();
          logRef.current(
            "system",
            `Camera target animation complete: [${cameraTargetRef.current.x.toFixed(
              2
            )}, ${cameraTargetRef.current.y.toFixed(
              2
            )}, ${cameraTargetRef.current.z.toFixed(2)}]`
          );
          camera.lookAt(cameraTargetRef.current);
        },
      });
    }
  };

  // Helper function to create ScrollTrigger sections
  const createSectionTimeline = (sectionId, options = {}) => {
    const {
      onEnter,
      onLeave,
      onEnterBack,
      onLeaveBack,
      onUpdate,
      start = "top bottom",
      end = "bottom top",
      scrub = 1,
    } = options;

    const timeline = gsap.timeline({
      smoothChildTiming: true,

      scrollTrigger: {
        trigger: `#${sectionId}`,
        start,
        end,
        scrub,
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
          logRef.current("scrollTrigger", `Left ${sectionId} backwards`);
          if (onLeaveBack) onLeaveBack();
        },
        onUpdate: onUpdate ? (self) => onUpdate(self) : undefined,
      },
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

    // Kill any other ScrollTriggers
    ScrollTrigger.getAll().forEach((st) => st.kill());
  };

  // Setup animation timeline with ScrollTrigger
  useEffect(() => {
    if (!modelReady || !scrollContainerRef.current) return;

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
    cameraTargetRef.current.set(0, 1.5, 0);
    camera.lookAt(cameraTargetRef.current);

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
    const introSequence = createSectionTimeline("section-0", {
      onEnter: () => {
        logRef.current("model", "PLAYING ANIMATION current->WALKING");
        kreatonRef.current.transitionFromCurrentToAnimation("WALKING", {
          crossFadeTime: 0.8,
          fadeInDuration: 0.3,
        });
        startEarthRotation();
        setCameraTarget({ x: 0, y: 1, z: 0 }, { duration: 1 });
      },
      onUpdate: (self) => {
        logRef.current(
          "scrollTrigger",
          `Intro progress: ${self.progress.toFixed(2)}`
        );
      },
    });

    // Animate camera position
    introSequence.to(
      camera.position,
      {
        z: 2.2,
        y: 1.2,
        x: 0,
        duration: 1,
        ease: "sine.inOut",
      },
      0
    );

    //!delete extra camera target animation
    // Animate camera target
    // introSequence.to(
    //   cameraTargetRef.current,
    //   {
    //     x: 0,
    //     y: 1,
    //     z: 0,
    //     duration: 1,
    //     ease: "sine.inOut",
    //     onUpdate: () => camera.lookAt(cameraTargetRef.current),
    //   },
    //   0
    // );

    /*
    Section 1 - Salute Animation
    */
    if (animations.includes("SALUTE")) {
      createSectionTimeline("section-1", {
        onEnter: () => {
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
      });
    } else {
      logRef.current("error", "Salute animation not found!");
    }

    /*
    Section 2 - Rotation Sequence
    */
    createSectionTimeline("section-2", {
      onEnter: () => {
        logRef.current("system", "🔄 ROTATION SEQUENCE START TRIGGERED");
        //!! not working properly
        setCameraTarget(
          { x: 0, y: 0, z: -10 },
          { duration: 1, ease: "sine.inOut" }
        );
      },
      onLeaveBack: () => {
        logRef.current("system", "🔄 ROTATION SEQUENCE REVERSED");
        setCameraTarget({ x: 0, y: 1.5, z: 0 }, { duration: 1 });
      },
      //! trash
      // onUpdate: (self) => {
      //   const progress = self.progress;

      //   // Create a full circular path using trigonometric functions
      //   // This creates a smooth 360° circle around the center point
      //   const angle = progress * Math.PI; // Full circle (0 to 2π)
      //   const radius = 10; // Circle radius

      //   // Calculate position on the circle
      //   const x = Math.sin(angle) * radius;
      //   const z = Math.cos(angle) * radius;

      //   // Update camera target
      //   cameraTargetRef.current.set(x, 1.5, z);

      //   // Add slight camera tilt based on progress to enhance the rotation feeling
      //   const tiltAngle = Math.sin(progress * Math.PI) * 0.2; // Subtle tilt
      //   camera.rotation.z = tiltAngle;

      //   // Force camera to look at target
      //   camera.lookAt(cameraTargetRef.current);

      //   // Log progress at key points
      //   if (progress > 0.95 && !self._endNotified) {
      //     self._endNotified = true;
      //     logRef.current("system", "Almost completing full circle rotation");
      //   }
      // },
      onLeave: () => {
        // Reset any camera tilt when leaving this section
        // gsap.to(camera.rotation, {
        //   z: 0,
        //   duration: 0.5,
        //   ease: "power2.inOut",
        // });
      },
    });

    /*
    Section 3 - Carousel View
    */

    const carouselSequence = createSectionTimeline("section-3", {
      onEnter: () => {
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
        // Smooth transition from the circular path to carousel view
        logRef.current("scrollTrigger", "Transitioning to carousel view");

        rotatorX(1);

        // Reset any camera rotation from the circle sequence
        // gsap.to(camera.rotation, {
        //   z: 0,
        //   duration: 0.8,
        //   ease: "power2.inOut",
        // });

        // Play immediately to ensure it runs
        cameraSequence.play();

        // Position camera to view carousel
        // gsap.to(camera.position, {
        //   x: 0,
        //   y: 0,
        //   z: 1.5, // Slightly further back for better view
        //   duration: 1.2,
        //   ease: "power2.inOut",
        // });

        // Move camera target to focus on carousel
        setCameraTarget(
          { x: 0, y: 1, z: 5 },
          { duration: 1.0, ease: "power2.inOut" }
        );
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

        // Reset camera target to original position
        setCameraTarget(
          { x: 0, y: 0, z: -10 },
          { duration: 1, ease: "power2.inOut" }
        );
      },
      onUpdate: (self) => {
        // Fine adjustments during the transition
        // if (self.progress < 0.2) {
        //   // Early in the section - ensure smooth handover from circular path
        //   const easingFactor = self.progress / 0.2; // 0 to 1 during first 20% of section
        //   // Fine-tune camera movement for a cinematic feel
        //   const rotationEase = gsap.parseEase("power2.out")(easingFactor);
        //   // Subtle camera adjustment as we enter the carousel view
        //   if (!self._cameraAdjusted) {
        //     self._cameraAdjusted = true;
        //     // Add a slight upward tilt when first seeing the carousel
        //     gsap.to(camera.position, {
        //       y: -0.2, // Slightly below for upward angle
        //       duration: 1,
        //       ease: "power2.inOut",
        //       yoyo: true,
        //       repeat: 1,
        //     });
        //   }
        // }
      },
    });

    // Make sure clump starts inactive until we reach farview
    if (clumpRef.current) {
      clumpRef.current.setActive(false);
    }

    /*
    Section 4 - Activating clump particles
    */
    const farViewSequence = createSectionTimeline("section-4", {
      onEnter: () => {
        if (clumpRef.current) {
          logRef.current("animation", "Activating clump particles");
          clumpRef.current.setActive(true);
          clumpRef.current.toggleShield(true);
        }

        // Animate camera position for far view
        // gsap.to(camera.position, {
        //   x: 7,
        //   y: 7,
        //   z: 7,
        //   duration: 1,
        //   ease: "power3.inOut",
        // });

        // Use setCameraTarget instead of directly animating cameraTargetRef
        // Add slight delay before changing camera target
        // gsap.delayedCall(0.5, () => {
        //   setCameraTarget(
        //     { x: 0, y: 0, z: 0 },
        //     {
        //       duration: 1,
        //       ease: "power2.inOut",
        //     }
        //   );
        // });
      },
      onLeaveBack: () => {
        // Deactivate clump when scrolling back up through this section
        if (clumpRef.current && clumpRef.current.isActive) {
          clumpRef.current.setActive(false);
          clumpRef.current.toggleShield(false);
        }
      },
      onLeave: () => {
        // Deactivate clump when leaving this section
        if (clumpRef.current && clumpRef.current.isActive) {
          clumpRef.current.setActive(false);
          clumpRef.current.toggleShield(false);
        }
      },
      onEnterBack: () => {
        // Re-activate clump when scrolling back up through this section
        if (clumpRef.current && !clumpRef.current.isActive) {
          clumpRef.current.setActive(true);
          clumpRef.current.toggleShield(true);
        }
      },
    });

    /*
    Section 5 - Final Explosion Sequence
    */
    createSectionTimeline("section-5", {
      onEnter: () => {
        // Move camera to a wider view
        gsap.to(camera.position, {
          x: 10,
          y: 10,
          z: 10,
          duration: 1.5,
          ease: "power3.inOut",
        });

        // Reset camera target to focus on Kreaton
        setCameraTarget(
          { x: 0, y: 1.5, z: 0 },
          { duration: 0.8, ease: "power2.inOut" }
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
              onComplete: () => {
                logRef.current("model", "PUSH animation completed");

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
    });

    /*
    Section 6 - Kreaton Face Closeup
    */
    const faceCloseupSequence = createSectionTimeline("section-6", {
      onEnter: () => {
        // Move camera to close-up position
        gsap.to(camera.position, {
          x: 0,
          y: 1.5,
          z: 3,
          duration: 2.0,
          ease: "power2.inOut",
        });

        // Set camera target
        setCameraTarget(
          { x: 0, y: 1.5, z: 0 },
          { duration: 1.0, ease: "power2.inOut" }
        );

        rotatorX(20);

        // Play facial animation
        if (kreatonRef.current) {
          const animations = kreatonRef.current.getAnimationNames();
          if (animations.includes("FACE") && !hasPushedRef.current) {
            logRef.current("model", "Playing facial animation");
            kreatonRef.current.transitionFromCurrentToAnimation("FACE", {
              crossFadeTime: 0.5,
              fadeInDuration: 0.3,
            });
          } else if (animations.includes("IDLE")) {
            logRef.current("model", "Playing IDLE animation for face closeup");
            kreatonRef.current.transitionFromCurrentToAnimation("IDLE", {
              crossFadeTime: 0.5,
              fadeInDuration: 0.3,
            });
          }
        }
      },
    });

    /*
    Section 7 - Final Reset
    */
    createSectionTimeline("section-7", {
      onEnter: () => {
        // setCameraTarget({ x: 0, y: 0, z: 0 }, { duration: 0.5 });
      },
    });

    // setIsInitialized(true);

    // return () => cleanupTimeline();
  }, [camera, modelReady, scrollContainerRef.current]);

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
