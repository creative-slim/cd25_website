// Observer Scroll Configuration
export const OBSERVER_CONFIG = {
  // Section snapping
  SNAP_DURATION: 1.2,
  SNAP_EASE: "power2.inOut",
  
  // Animation timing
  SECTION_TRANSITION_DELAY: 0, // Delay before 3D animations start
  CAMERA_ANIMATION_DURATION: 0,
  CAMERA_ANIMATION_EASE: "power2.inOut",
  
  // Performance
  WHEEL_THROTTLE: 100, // ms between wheel events
  TOUCH_THROTTLE: 50,  // ms between touch events
  
  // Observer settings
  OBSERVER_TYPES: "wheel,touch,pointer",
  WHEEL_SPEED: -1,
  
  // Debug
  ENABLE_DEBUG_LOGS: process.env.NODE_ENV === 'development',
  ENABLE_WINDOW_EXPOSE: process.env.NODE_ENV === 'development',
  
  // Fallback
  ENABLE_FALLBACK_SCROLLING: true,
  FALLBACK_BROWSER_VERSIONS: {
    chrome: 60,
    firefox: 55,
    safari: 12,
    edge: 79
  }
};

// Section-specific animation durations
export const SECTION_ANIMATIONS = {
  SECTION_0: {
    cameraDuration: 1,
    modelTransitionDuration: 0.8,
    earthRotationDelay: 0
  },
  SECTION_1: {
    cameraDuration: 1,
    modelTransitionDuration: 0.8,
    fovChangeDuration: 1
  },
  SECTION_2: {
    cameraDuration: 1,
    rotatorMoveDuration: 1,
    fovChangeDuration: 1
  },
  SECTION_3: {
    cameraDuration: 1,
    clumpFadeDuration: 1.5,
    stormUnleashDelay: 0
  },
  SECTION_4: {
    cameraDuration: 1,
    pushAnimationDuration: 1.5,
    explosionDelay: 0.7
  },
  SECTION_5: {
    cameraDuration: 1,
    modelTransitionDuration: 0.8
  },
  SECTION_6: {
    cameraDuration: 1,
    pointCycleDuration: 5,
    modelTransitionDuration: 0.5
  },
  SECTION_7: {
    cameraDuration: 1
  }
}; 