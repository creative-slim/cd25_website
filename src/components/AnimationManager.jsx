import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

// Debug flag to control all console logs
const DEBUG_LOGS = true;

// Enhanced logging with color coding
const logStyles = {
  sequence: "color: #4287f5; font-weight: bold;", // Blue for sequences
  animation: "color: #42f584; font-weight: bold;", // Green for animations
  timeline: "color: #c142f5; font-weight: bold;", // Purple for main timeline
  system: "color: #f58c42; font-weight: bold;", // Orange for system events
  error: "color: #f54242; font-weight: bold;", // Red for errors
  model: "color: #f5d742; font-weight: bold;", // Yellow for model-related logs
  time: "color: #42c9f5; font-style: italic;", // Cyan for time indicators
};

// Create a function to get formatted timeline time
const getTimeInfo = (timeline) => {
  if (!timeline) return "";
  const time = timeline.time().toFixed(2);
  const totalTime = timeline.totalDuration().toFixed(2);
  return `[T:${time}s/${totalTime}s]`;
};

// Helper functions for colored logging with timeline info
const logDebug = (msg, ...args) => {
  if (DEBUG_LOGS) {
    console.log(msg, ...args);
  }
};

// Modified logging functions to include time information
const createLoggers = (mainTimeline) => {
  return {
    logSequence: (msg, nestedTimeline, ...args) => {
      if (DEBUG_LOGS) {
        const mainTime = getTimeInfo(mainTimeline);
        const nestedTime = nestedTimeline
          ? ` ${getTimeInfo(nestedTimeline)}`
          : "";
        console.log(
          `%c[SEQUENCE]%c${mainTime}${nestedTime} %c${msg}`,
          logStyles.sequence,
          logStyles.time,
          logStyles.sequence,
          ...args
        );
      }
    },

    logAnim: (msg, nestedTimeline, ...args) => {
      if (DEBUG_LOGS) {
        const mainTime = getTimeInfo(mainTimeline);
        const nestedTime = nestedTimeline
          ? ` ${getTimeInfo(nestedTimeline)}`
          : "";
        console.log(
          `%c[ANIMATION]%c${mainTime}${nestedTime} %c${msg}`,
          logStyles.animation,
          logStyles.time,
          logStyles.animation,
          ...args
        );
      }
    },

    logTimeline: (msg, ...args) => {
      if (DEBUG_LOGS) {
        const mainTime = getTimeInfo(mainTimeline);
        console.log(
          `%c[TIMELINE]%c${mainTime} %c${msg}`,
          logStyles.timeline,
          logStyles.time,
          logStyles.timeline,
          ...args
        );
      }
    },

    logSystem: (msg, ...args) => {
      if (DEBUG_LOGS) {
        const mainTime = mainTimeline ? getTimeInfo(mainTimeline) : "";
        console.log(
          `%c[SYSTEM]%c${mainTime} %c${msg}`,
          logStyles.system,
          logStyles.time,
          logStyles.system,
          ...args
        );
      }
    },

    logError: (msg, ...args) => {
      const mainTime = mainTimeline ? getTimeInfo(mainTimeline) : "";
      console.error(
        `%c[ERROR]%c${mainTime} %c${msg}`,
        logStyles.error,
        logStyles.time,
        logStyles.error,
        ...args
      );
    },

    logModel: (msg, ...args) => {
      if (DEBUG_LOGS) {
        const mainTime = mainTimeline ? getTimeInfo(mainTimeline) : "";
        console.log(
          `%c[MODEL]%c${mainTime} %c${msg}`,
          logStyles.model,
          logStyles.time,
          logStyles.model,
          ...args
        );
      }
    },
  };
};

export function AnimationManager({
  kreatonRef,
  earthRef,
  rotatorRef,
  clumpRef,
}) {
  const { camera } = useThree();
  const prevScrollProgressRef = useRef(0);
  const mainTimelineRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const tickerFunctionRef = useRef(null);
  const [modelReady, setModelReady] = useState(false);
  const earthRotationRef = useRef(null);
  const [isEarthRotating, setIsEarthRotating] = useState(false);
  const loggersRef = useRef({
    logSequence: () => {},
    logAnim: () => {},
    logTimeline: () => {},
    logSystem: () => {},
    logError: () => {},
    logModel: () => {},
  });
  const prevTimelinePositionRef = useRef(0); // Add this to store previous timeline position
  const cameraInitialRotation = useRef(new THREE.Euler(0, 0, 0)); // Store initial camera rotation
  const cameraTargetRef = useRef(new THREE.Vector3(0, 1.5, 0)); // Default target: centered and at proper height
  const hasPushedRef = useRef(false); // Track if PUSH animation has already been played
  const explosionTimeoutRef = useRef(null); // Store timeout reference for cleanup

  // Reset the state when the component mounts, not using useState persistence
  useEffect(() => {
    hasPushedRef.current = false;
    // Log initial state to confirm it's reset
    console.log("🚀 ANIMATION MANAGER MOUNTED - PUSH state reset:", {
      hasPushedRef: hasPushedRef.current,
    });
  }, []);

  // Initialize global loggers when timeline is created
  const updateLoggers = (timeline) => {
    loggersRef.current = createLoggers(timeline);
  };

  // Functions to control Earth rotation
  const startEarthRotation = () => {
    loggersRef.current.logSystem("Starting Earth rotation");
    setIsEarthRotating(true);
  };

  const stopEarthRotation = () => {
    loggersRef.current.logSystem("Stopping Earth rotation");
    setIsEarthRotating(false);
  };

  const rotatorUp = (x) => {
    loggersRef.current.logSystem("Moving rotator up");
    if (rotatorRef.current && rotatorRef.current.moveY) {
      rotatorRef.current.moveY(x, {
        duration: 1.2,
        ease: "power2.out",
        onStart: () => {
          loggersRef.current.logAnim("Rotator animation started");
        },
        onComplete: () => {
          loggersRef.current.logAnim("Rotator animation completed");
        },
      });
    } else {
      loggersRef.current.logError("Rotator ref or moveY method not available");
    }
  };

  // Simplified reset function that now only works with targets
  const setCameraTarget = (targetPosition, options = {}) => {
    loggersRef.current.logSystem(
      `Setting camera target to [${targetPosition.x}, ${targetPosition.y}, ${targetPosition.z}]`
    );

    // Create temporary object to animate - direct Vector3 animation can be problematic with GSAP
    const temp = {
      x: cameraTargetRef.current.x,
      y: cameraTargetRef.current.y,
      z: cameraTargetRef.current.z,
    };

    // Log starting position for debugging
    console.log("Camera target BEFORE:", temp);

    // Animate the temporary object instead
    gsap.to(temp, {
      x: targetPosition.x,
      y: targetPosition.y,
      z: targetPosition.z,
      duration: options.duration || 0.8,
      ease: options.ease || "power2.inOut",
      onStart: () => {
        if (options.onStart) options.onStart();
        console.log("Starting camera target animation to:", targetPosition);
      },
      onUpdate: () => {
        // Update the actual Vector3 on each frame
        cameraTargetRef.current.set(temp.x, temp.y, temp.z);

        // Force camera to look at the target on each update
        // This ensures the camera is always looking at the latest target position
        camera.lookAt(cameraTargetRef.current);
      },
      onComplete: () => {
        if (options.onComplete) options.onComplete();
        console.log(
          "Camera target animation complete:",
          `[${cameraTargetRef.current.x.toFixed(
            2
          )}, ${cameraTargetRef.current.y.toFixed(
            2
          )}, ${cameraTargetRef.current.z.toFixed(2)}]`
        );

        // Ensure one final lookAt after animation completes
        camera.lookAt(cameraTargetRef.current);
      },
      overwrite: true,
    });
  };

  // Check if model is ready in a separate effect
  useEffect(() => {
    const { logModel } = loggersRef.current;

    if (kreatonRef.current && kreatonRef.current.getAnimationNames) {
      logModel(
        "Kreaton model is ready with actions:",
        kreatonRef.current.getAnimationNames()
      );
      setModelReady(true);
    } else {
      const checkModel = setInterval(() => {
        if (kreatonRef.current && kreatonRef.current.getAnimationNames) {
          logModel(
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

  // Add continuous Earth rotation
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

  // Cleanup function for previous timeline
  const cleanupTimeline = () => {
    if (tickerFunctionRef.current) {
      gsap.ticker.remove(tickerFunctionRef.current);
      tickerFunctionRef.current = null;
    }

    if (mainTimelineRef.current) {
      mainTimelineRef.current.kill();
      mainTimelineRef.current = null;
    }

    // Also clear any pending timeouts
    if (explosionTimeoutRef.current) {
      clearTimeout(explosionTimeoutRef.current);
      explosionTimeoutRef.current = null;
    }
  };

  // Setup the animation timeline when model is ready
  useEffect(() => {
    if (!modelReady) {
      return;
    }

    cleanupTimeline();

    // Log the push state at timeline creation
    loggersRef.current.logSystem(
      `PUSH animation state: hasPushedRef=${hasPushedRef.current}`
    );

    loggersRef.current.logSystem(
      "Setting up animation timeline with actions:",
      kreatonRef.current.getAnimationNames()
    );

    const container = document.querySelector("#scroll-container");
    if (!container) {
      loggersRef.current.logError("Scroll container not found!");
      return;
    }

    const sections = container.querySelectorAll("section");
    const totalSections = sections.length;

    // Create a bidirectional timeline with proper pausing
    const mainTimeline = gsap.timeline({
      paused: true,
      smoothChildTiming: true,
      autoRemoveChildren: false,
    });

    mainTimelineRef.current = mainTimeline;
    updateLoggers(mainTimeline); // Update loggers with the new timeline

    const { logSequence, logAnim, logTimeline, logSystem, logError, logModel } =
      loggersRef.current;

    const totalDuration = totalSections - 1;
    const animations = kreatonRef.current.getAnimationNames();

    // Store initial camera target for reference and make sure it's properly initialized
    cameraTargetRef.current = new THREE.Vector3(0, 1.5, 0); // Reset to ensure proper initialization

    // Force initial camera lookAt to ensure proper starting orientation
    camera.lookAt(cameraTargetRef.current);
    console.log(
      "Initial camera setup - Camera looking at:",
      cameraTargetRef.current.toArray()
    );

    /*
    init animation
    */
    if (animations.includes("JUMP") && animations.includes("WALKING")) {
      (() => {
        logModel("PLAYING ANIMATION JUMP->WALK");
        kreatonRef.current.transitionAnimation("JUMP", "WALKING", {
          crossFadeTime: 0.8,
          fadeInDuration: 0.3,
        });
        setTimeout(() => {
          startEarthRotation();
        }, 2400);
      })();
    }

    /*
    Section 0 - Introduction/Walking - NESTED TIMELINE 
    */
    const introSequence = gsap.timeline({
      onStart: () => logSequence("Intro sequence started", introSequence),
      onComplete: () => logSequence("Intro sequence completed", introSequence),
      onReverseComplete: () =>
        logSequence("Intro sequence reversed", introSequence),
    });

    introSequence.call(
      () => {
        logModel("PLAYING ANIMATION current->WALKING");
        kreatonRef.current.transitionFromCurrentToAnimation("WALKING", {
          crossFadeTime: 0.8,
          fadeInDuration: 0.3,
        });
        startEarthRotation();
      },
      [],
      0
    );

    introSequence.to(
      camera.position,
      {
        z: 2.2,
        y: 1.2,
        duration: 0.5,
        ease: "sine.inOut",
        onStart: () =>
          logAnim("Intro camera position animation started", introSequence),
        onComplete: () =>
          logAnim("Intro camera position animation completed", introSequence),
      },
      0
    );

    introSequence.call(
      () => {
        setCameraTarget(
          { x: 0, y: 2, z: 0 },
          {
            duration: 1,
            ease: "sine.inOut",
            onStart: () =>
              logAnim("Intro camera target animation started", introSequence),
            onComplete: () =>
              logAnim("Intro camera target animation completed", introSequence),
          }
        );
      },
      [],
      0
    );

    mainTimeline.add(introSequence, 0.1);

    /*
    Section 1 - Salute Animation - NESTED TIMELINE
    */
    if (animations.includes("SALUTE")) {
      const saluteSequence = gsap.timeline({
        onStart: () => logSequence("Salute sequence started", saluteSequence),
        onComplete: () =>
          logSequence("Salute sequence completed", saluteSequence),
        onReverseComplete: () =>
          logSequence("Salute sequence reversed", saluteSequence),
      });

      // Add camera positioning to the salute sequence to ensure smooth transition
      // saluteSequence.to(
      //   camera.position,
      //   {
      //     z: 1,
      //     y: 1.5,
      //     duration: 0.8,
      //     ease: "power2.inOut",
      //     onStart: () =>
      //       logAnim("Salute camera position animation started", saluteSequence),
      //     onComplete: () =>
      //       logAnim(
      //         "Salute camera position animation completed",
      //         saluteSequence
      //       ),
      //   },
      //   0.1
      // );

      saluteSequence.call(
        () => {
          setCameraTarget(
            { x: 0, y: 3.5, z: 0 },
            {
              duration: 1,
              ease: "sine.inOut",
              onStart: () =>
                logAnim(
                  "Salute camera target animation started",
                  saluteSequence
                ),
              onComplete: () =>
                logAnim(
                  "Salute camera target animation completed",
                  saluteSequence
                ),
            }
          );
          logModel("PLAYING ANIMATION current->SALUTE");
          kreatonRef.current.transitionFromCurrentToAnimation("SALUTE", {
            crossFadeTime: 0.8,
            fadeInDuration: 0.3,
          });
          stopEarthRotation();
        },
        [],
        0
      );

      // Add handler for animation reversing
      saluteSequence.call(
        () => {
          // Fix: Use stored previous position instead of timeline.previous()
          if (mainTimeline.time() < prevTimelinePositionRef.current) {
            logModel("REVERSE: Reverting from SALUTE to WALKING");
            kreatonRef.current.transitionFromCurrentToAnimation("WALKING", {
              crossFadeTime: 0.8,
              fadeInDuration: 0.3,
            });
            startEarthRotation();
            // move the carosel back down
          }
        },
        [],
        0.1
      );

      mainTimeline.add(saluteSequence, 1);
    } else {
      logError("Salute animation not found!");
    }

    /*
    Section 2 - Rotation Sequence - NESTED TIMELINE
    */
    const rotationSequence = gsap.timeline({
      onStart: () => {
        console.log("🔄 ROTATION SEQUENCE START TRIGGERED");
        logSequence("Rotation sequence started", rotationSequence);
        // Call rotatorUp here to ensure it happens
        rotatorUp(0);
      },
      onComplete: () => {
        logSequence("Rotation sequence completed", rotationSequence);
        console.log("🔄 ROTATION SEQUENCE COMPLETED");
      },
      onReverseComplete: () => {
        logSequence("Rotation sequence reversed", rotationSequence);
        console.log("🔄 ROTATION SEQUENCE REVERSED");
        // Reset camera target to starting position when sequence fully reverses
        setCameraTarget({ x: 0, y: 1.5, z: 0 }, { duration: 0.5 });
      },
    });

    // First add a dummy delay to ensure the sequence has some duration
    rotationSequence.to({}, { duration: 0.01 });

    // Store the initial position for reference
    const initialTargetPosition = { x: 0, y: 1.5, z: 0 };

    // Create custom motion path with explicit position and duration
    rotationSequence.to(
      cameraTargetRef.current,
      {
        // Add dummy properties to ensure GSAP registers the animation
        x: 0,
        y: 0,
        z: 0,
        duration: 2.0,
        ease: "power2.inOut",
        onUpdate: function () {
          const progress = this.progress(); // Progress from 0 to 1
          console.log(`🔄 Rotation progress: ${progress.toFixed(2)}`);

          // Use progress to create a semi-circular path
          if (progress < 0.5) {
            // First half: move target to the right (0 to 0.5 progress)
            const normalizedProgress = progress * 2; // 0 to 1
            const x = initialTargetPosition.x + 10 * normalizedProgress; // Move from 0 to 10 on X
            const y = initialTargetPosition.y; // Keep Y the same
            const z = initialTargetPosition.z; // Keep Z the same

            // Update the target directly using the ref
            cameraTargetRef.current.set(x, y, z);

            if (progress < 0.1) {
              console.log("🔄 Starting first half of camera path");
              logAnim(
                "Starting camera target movement for rotation",
                rotationSequence
              );
            }
          } else {
            // Second half: move target behind while returning to center X (0.5 to 1 progress)
            const normalizedProgress = (progress - 0.5) * 2; // 0 to 1
            const x = initialTargetPosition.x + 10 * (1 - normalizedProgress); // Move from 10 back to 0 on X
            const z = initialTargetPosition.z + 10 * normalizedProgress; // Move from 0 to 10 on Z
            const y = initialTargetPosition.y; // Keep Y the same

            // Update the target directly
            cameraTargetRef.current.set(x, y, z);

            if (progress > 0.9) {
              console.log("🔄 Finishing second half of camera path");
              logAnim("Camera now looking at target behind", rotationSequence);
            }
          }
        },
        onStart: () => {
          console.log("🔄 Camera target rotation path started");
          logAnim("Camera target rotation path started", rotationSequence);
        },
        onComplete: () => {
          console.log("🔄 Camera target rotation path completed");
          logAnim("Camera target rotation path completed", rotationSequence);
        },
      },
      0.1 // Start after the initial delay
    );

    // Make sure the rotationSequence is properly added to the main timeline
    // Move it slightly earlier to ensure it doesn't get skipped
    const rotationPosition = 1.4; // Changed from 1.5
    console.log(`🔄 Adding rotation sequence at position ${rotationPosition}`);
    mainTimeline.add(rotationSequence, rotationPosition);
    console.log(
      `🔄 Main timeline duration after adding rotation: ${mainTimeline.duration()}`
    );

    /*
    Section 3 - Carousel View - NESTED TIMELINE
    */
    const carouselSequence = gsap.timeline({
      onStart: () => logSequence("Carousel sequence started", carouselSequence),
      onComplete: () =>
        logSequence("Carousel sequence completed", carouselSequence),
    });

    carouselSequence.to(
      camera.position,
      {
        x: 0,
        y: 0,
        z: 1,
        duration: 1.2,
        ease: "power2.inOut",
        onStart: () =>
          logAnim(
            "Carousel camera position animation started",
            carouselSequence
          ),
        onComplete: () =>
          logAnim(
            "Carousel camera position animation completed",
            carouselSequence
          ),
      },
      0
    );

    carouselSequence.call(
      () => {
        setCameraTarget(
          { x: 0, y: 0, z: 5 }, // Look ahead at carousel area
          {
            duration: 1.0,
            ease: "power2.inOut",
            onStart: () =>
              logAnim(
                "Moving camera target to carousel area",
                carouselSequence
              ),
          }
        );
      },
      [],
      0.2
    );

    mainTimeline.add(carouselSequence, 2.5);

    // Make sure clump starts inactive until we reach farview
    if (clumpRef.current) {
      clumpRef.current.setActive(false);
    }

    /*
    Section 4 - Far View Sequence - NESTED TIMELINE
    */
    const farViewSequence = gsap.timeline({
      onStart: () => logSequence("Far view sequence started", farViewSequence),
      onComplete: () =>
        logSequence("Far view sequence completed", farViewSequence),
    });

    farViewSequence.to(
      camera.position,
      {
        x: 7,
        y: 7,
        z: 7,
        duration: 2.0,
        ease: "power3.inOut",
        onStart: () =>
          logAnim(
            "Far view camera position animation started",
            farViewSequence
          ),
        onComplete: () =>
          logAnim(
            "Far view camera position animation completed",
            farViewSequence
          ),
      },
      0
    );

    // Activate the clump dynamics when reaching farview
    farViewSequence.call(
      () => {
        if (clumpRef.current) {
          logAnim("Activating clump particles");
          clumpRef.current.setActive(true);
          clumpRef.current.toggleShield(true);
        }
      },
      [],
      0.2 // Start early in sequence
    );

    farViewSequence.call(
      () => {
        setCameraTarget(
          { x: 0, y: 0, z: 0 }, // Look at origin
          {
            duration: 1.5,
            ease: "power2.inOut",
            onStart: () =>
              logAnim(
                "Setting camera to look at origin from far view",
                farViewSequence
              ),
          }
        );
      },
      [],
      0.5
    );

    mainTimeline.add(farViewSequence, 3.5);

    /*
    Section 5 - Final Explosion Sequence - NEW TIMELINE
    */
    const explosionSequence = gsap.timeline({
      onStart: () =>
        logSequence("Explosion sequence started", explosionSequence),
      onComplete: () =>
        logSequence("Explosion sequence completed", explosionSequence),
    });

    // Move camera to a wider view to see the full explosion
    explosionSequence.to(
      camera.position,
      {
        x: 10,
        y: 10,
        z: 10,
        duration: 1.5,
        ease: "power3.inOut",
        onStart: () =>
          logAnim("Explosion camera pullback started", explosionSequence),
      },
      0
    );

    // Move Kreaton to center stage for the PUSH animation
    explosionSequence.call(
      () => {
        // Reset camera target to focus on Kreaton
        setCameraTarget(
          { x: 0, y: 1.5, z: 0 },
          {
            duration: 0.8,
            ease: "power2.inOut",
          }
        );
      },
      [],
      0.5
    );

    // Add the PUSH animation with fixed checks
    explosionSequence.call(
      () => {
        // Simplify the check to just use hasPushedRef
        if (kreatonRef.current && !hasPushedRef.current) {
          logModel("PLAYING ANIMATION PUSH (first time only)");
          logSystem(
            `Current push state before playing: hasPushedRef=${hasPushedRef.current}`
          );

          // Mark as played immediately to prevent double triggering
          hasPushedRef.current = true;

          // Get estimated duration of PUSH animation
          const animations = kreatonRef.current.getAnimationNames();
          if (animations.includes("PUSH")) {
            // Play the PUSH animation
            kreatonRef.current.transitionFromCurrentToAnimation("PUSH", {
              crossFadeTime: 0.5,
              fadeInDuration: 0.3,
              onComplete: () => {
                logModel("PUSH animation completed");

                // Transition to IDLE animation after PUSH completes
                if (animations.includes("IDLE")) {
                  logModel("Transitioning from PUSH to IDLE animation");
                  kreatonRef.current.transitionFromCurrentToAnimation("IDLE", {
                    crossFadeTime: 0.5,
                    fadeInDuration: 0.3,
                  });
                }
              },
            });

            // We'll get the action to determine its duration
            const pushAction = kreatonRef.current.actions["PUSH"];
            const animationDuration = pushAction
              ? pushAction.getClip().duration
              : 1.5; // Default to 1.5s if we can't get the actual duration

            logSystem(`PUSH animation duration: ${animationDuration}s`);

            // Schedule the explosion to happen right as the animation finishes
            explosionTimeoutRef.current = setTimeout(() => {
              if (clumpRef.current) {
                logAnim(
                  "Triggering permanent explosion at end of PUSH animation"
                );
                clumpRef.current.permanentExplosion(300); // Higher force for dramatic effect
                stopEarthRotation();
              }
              explosionTimeoutRef.current = null;
            }, animationDuration * 1000);
          } else {
            // Fallback if PUSH animation doesn't exist
            logError("PUSH animation not found! Using fallback.");

            explosionTimeoutRef.current = setTimeout(() => {
              if (clumpRef.current) {
                logAnim("Triggering fallback permanent explosion");
                clumpRef.current.permanentExplosion(300);
                stopEarthRotation();
              }
              explosionTimeoutRef.current = null;
            }, 1500); // Default 1.5s delay
          }
        } else if (hasPushedRef.current) {
          logModel("PUSH animation already played, skipping");
          logSystem(
            `Current push state in skip path: hasPushedRef=${hasPushedRef.current}`
          );
        }
      },
      [],
      1.0 // Start the animation after camera has pulled back
    );

    // Move target to match new camera perspective
    explosionSequence.call(
      () => {
        setCameraTarget(
          { x: 0, y: 0, z: 0 },
          {
            duration: 1.0,
            ease: "power2.inOut",
          }
        );
      },
      [],
      2.5 // Extend this timing to happen after the PUSH animation and explosion
    );

    // Add a little extra duration to the sequence to accommodate the PUSH animation
    explosionSequence.call(() => {}, [], 4.0);

    // Add the explosion sequence after farview
    mainTimeline.add(explosionSequence, 4.5);

    /*
    Section 6 - Kreaton Face Closeup - NEW TIMELINE
    */
    const faceCloseupSequence = gsap.timeline({
      onStart: () =>
        logSequence("Face closeup sequence started", faceCloseupSequence),
      onComplete: () =>
        logSequence("Face closeup sequence completed", faceCloseupSequence),
    });

    // Move camera to a close-up position of Kreaton's face
    faceCloseupSequence.to(
      camera.position,
      {
        x: 0,
        y: 1.6, // Position at eye level with Kreaton
        z: 0.5, // Move very close to the face
        duration: 2.0,
        ease: "power2.inOut",
        onStart: () =>
          logAnim("Face closeup camera move started", faceCloseupSequence),
        onComplete: () =>
          logAnim("Face closeup camera move completed", faceCloseupSequence),
      },
      0
    );

    // Set camera target to look directly at Kreaton's face
    faceCloseupSequence.call(
      () => {
        setCameraTarget(
          { x: 0, y: 1.6, z: 0 }, // Look directly at face
          {
            duration: 1.0,
            ease: "power2.inOut",
            onStart: () =>
              logAnim(
                "Setting camera target to Kreaton's face",
                faceCloseupSequence
              ),
          }
        );
      },
      [],
      0.5
    );

    // Optional: Play a facial animation on Kreaton if available
    faceCloseupSequence.call(
      () => {
        if (kreatonRef.current) {
          const animations = kreatonRef.current.getAnimationNames();
          // Check for a suitable facial animation - using "IDLE" as fallback
          if (animations.includes("FACE") && !hasPushedRef.current) {
            logModel("Playing facial animation");
            kreatonRef.current.transitionFromCurrentToAnimation("FACE", {
              crossFadeTime: 0.5,
              fadeInDuration: 0.3,
            });
          } else if (animations.includes("IDLE")) {
            logModel("Playing IDLE animation for face closeup");
            kreatonRef.current.transitionFromCurrentToAnimation("IDLE", {
              crossFadeTime: 0.5,
              fadeInDuration: 0.3,
            });
          }
        }
      },
      [],
      1.0
    );

    // Add a subtle camera movement to create a "breathing" effect
    faceCloseupSequence.to(
      camera.position,
      {
        z: 0.55, // Slight back-and-forth movement
        duration: 2.0,
        ease: "sine.inOut",
        repeat: 1,
        yoyo: true,
      },
      2.0
    );

    // Add the face closeup sequence after the explosion sequence
    mainTimeline.add(faceCloseupSequence, 5.5);

    /*
    Final Reset Sequence
    */
    const finalResetSequence = gsap.timeline({
      onStart: () =>
        logSequence("Final reset sequence started", finalResetSequence),
      onComplete: () =>
        logSequence("Final reset sequence completed", finalResetSequence),
    });

    finalResetSequence.call(
      () => {
        setCameraTarget(
          { x: 0, y: 0, z: 0 }, // Ensure final target is stable
          { duration: 0.5 }
        );
      },
      [],
      0
    );

    mainTimeline.add(finalResetSequence, 4.0);

    const updateTimeline = () => {
      const style = window.getComputedStyle(container);
      let translateY = 0;

      if (style.transform && style.transform !== "none") {
        const matrix = new DOMMatrixReadOnly(style.transform);
        translateY = matrix.m42;
      }

      const totalScrollableHeight = window.innerHeight * (totalSections - 1);
      const normalizedProgress = Math.min(
        Math.abs(translateY) / totalScrollableHeight,
        1
      );

      const timelinePosition = normalizedProgress * totalDuration;

      const previousPosition = prevTimelinePositionRef.current;
      const isReversing = timelinePosition < previousPosition;

      // Add logging to see if we're reaching the rotation sequence position
      if (Math.abs(timelinePosition - 1.5) < 0.1) {
        console.log(
          `🔄 Near rotation trigger point: ${timelinePosition.toFixed(2)}`
        );
      }

      mainTimeline.time(timelinePosition);

      if (
        isReversing !== timelinePosition < previousPosition &&
        Math.abs(timelinePosition - previousPosition) > 0.1
      ) {
        logTimeline(
          `Direction changed to: ${
            isReversing ? "REVERSE" : "FORWARD"
          } at ${timelinePosition.toFixed(2)}`
        );
      }

      // Force the camera to look at the target position every frame
      camera.lookAt(cameraTargetRef.current);

      // Log the current camera target occasionally for debugging
      if (Math.random() < 0.01) {
        // Only log 1% of the time to avoid console spam
        console.log(
          "Camera target:",
          `[${cameraTargetRef.current.x.toFixed(
            2
          )}, ${cameraTargetRef.current.y.toFixed(
            2
          )}, ${cameraTargetRef.current.z.toFixed(2)}]`
        );
        console.log(
          "Camera position:",
          `[${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(
            2
          )}, ${camera.position.z.toFixed(2)}]`
        );
      }

      prevTimelinePositionRef.current = timelinePosition;
    };

    tickerFunctionRef.current = updateTimeline;
    gsap.ticker.add(updateTimeline);
    setIsInitialized(true);

    return () => {
      logSystem("Cleaning up timeline and ticker functions...");
      cleanupTimeline();
    };
  }, [camera, modelReady]);

  // Add a helper function to create a visual debug helper for the camera target
  useEffect(() => {
    // Create a debug visualization of the camera target point
    const debugHelper = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
    );

    // Only add in debug mode and if we need to visualize the target
    if (DEBUG_LOGS && false) {
      // Set to true when you need to debug the target visually
      console.log("Adding camera target debug helper");
      camera.parent.add(debugHelper);

      // Update helper position in animation loop
      const updateHelper = () => {
        if (cameraTargetRef.current) {
          debugHelper.position.copy(cameraTargetRef.current);
        }
        requestAnimationFrame(updateHelper);
      };
      updateHelper();

      // Clean up
      return () => {
        camera.parent.remove(debugHelper);
      };
    }
  }, [camera]);

  return (
    <>
      {isInitialized ? null : (
        <mesh visible={false}>
          {/* This is just a trigger to ensure component updates when isInitialized changes */}
        </mesh>
      )}
    </>
  );
}
