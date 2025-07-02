# GSAP Observer Section Snapping Implementation Guide

## Overview

This guide outlines the steps to convert the current ScrollTrigger-based section system to GSAP Observer-based section snapping. The goal is to create a smooth, snap-to-section scrolling experience while maintaining compatibility with the existing 3D scene animations and React Three Fiber setup.

## Current System Analysis

### Existing Architecture
- **ScrollTrigger Sections**: 8 sections (section-0 through section-7) with individual ScrollTrigger instances
- **AnimationManager**: Centralized animation control using GSAP timelines and ScrollTrigger
- **3D Scene**: React Three Fiber with complex camera animations and model transitions
- **Smooth Scroll**: Custom `useSmoothScroll` hook for smooth scrolling behavior
- **GSAP Version**: 3.12.7 with @gsap/react 2.1.2

### Current Dependencies
```json
{
  "gsap": "^3.12.7",
  "@gsap/react": "^2.1.2",
  "@react-three/fiber": "^9.1.2",
  "@react-three/drei": "^10.0.0"
}
```

## Implementation Steps

### Step 1: Install GSAP Observer Plugin

```bash
# GSAP Observer is included in GSAP 3.12.7, but ensure it's registered
```

### Step 1.5: Define Configuration Constants

Create a configuration file: `src/config/observerConfig.ts`

```typescript
// Observer Scroll Configuration
export const OBSERVER_CONFIG = {
  // Section snapping
  SNAP_DURATION: 1.2,
  SNAP_EASE: "power2.inOut",
  
  // Animation timing
  SECTION_TRANSITION_DELAY: 0, // Delay before 3D animations start
  CAMERA_ANIMATION_DURATION: 1,
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
```

### Step 2: Create Observer-Based Scroll Manager

Create a new component: `src/components/ObserverScrollManager.tsx`

```typescript
import { useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import { Observer } from 'gsap/Observer';
import { OBSERVER_CONFIG } from '../config/observerConfig';

// Register Observer plugin
gsap.registerPlugin(Observer);

interface ObserverScrollManagerProps {
  sections: string[];
  onSectionChange?: (sectionIndex: number) => void;
  scrollContainerRef?: React.RefObject<HTMLElement>;
}

export function ObserverScrollManager({
  sections,
  onSectionChange,
  scrollContainerRef
}: ObserverScrollManagerProps) {
  const currentSectionRef = useRef(0);
  const isAnimatingRef = useRef(false);
  const lastWheelTimeRef = useRef(0);
  const lastTouchTimeRef = useRef(0);
  const scrollContainer = scrollContainerRef?.current || document.querySelector('[data-scroll-container]') || document.documentElement;

  // Snap to specific section
  const snapToSection = useCallback((sectionIndex: number) => {
    if (isAnimatingRef.current || sectionIndex < 0 || sectionIndex >= sections.length) {
      return;
    }

    isAnimatingRef.current = true;
    currentSectionRef.current = sectionIndex;

    const targetSection = document.getElementById(sections[sectionIndex]);
    if (!targetSection) return;

    if (OBSERVER_CONFIG.ENABLE_DEBUG_LOGS) {
      console.log(`%c[OBSERVER]%c Snapping to section ${sectionIndex}`, 
        'color: #f542c8; font-weight: bold;', 
        'color: inherit;'
      );
    }

    gsap.to(scrollContainer, {
      scrollTop: targetSection.offsetTop,
      duration: OBSERVER_CONFIG.SNAP_DURATION,
      ease: OBSERVER_CONFIG.SNAP_EASE,
      onComplete: () => {
        isAnimatingRef.current = false;
        onSectionChange?.(sectionIndex);
        if (OBSERVER_CONFIG.ENABLE_DEBUG_LOGS) {
          console.log(`%c[OBSERVER]%c Completed snap to section ${sectionIndex}`, 
            'color: #f542c8; font-weight: bold;', 
            'color: inherit;'
          );
        }
      }
    });
  }, [sections, scrollContainer, onSectionChange]);

  // Handle wheel events for section navigation with throttling
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    
    if (isAnimatingRef.current) return;

    const now = Date.now();
    if (now - lastWheelTimeRef.current < OBSERVER_CONFIG.WHEEL_THROTTLE) {
      return;
    }
    lastWheelTimeRef.current = now;

    const direction = e.deltaY > 0 ? 1 : -1;
    const nextSection = Math.max(0, Math.min(sections.length - 1, currentSectionRef.current + direction));
    
    if (nextSection !== currentSectionRef.current) {
      snapToSection(nextSection);
    }
  }, [sections, snapToSection]);

  // Handle keyboard navigation
  const handleKeydown = useCallback((e: KeyboardEvent) => {
    if (isAnimatingRef.current) return;

    let nextSection = currentSectionRef.current;

    switch (e.key) {
      case 'ArrowDown':
      case 'PageDown':
        e.preventDefault();
        nextSection = Math.min(sections.length - 1, currentSectionRef.current + 1);
        break;
      case 'ArrowUp':
      case 'PageUp':
        e.preventDefault();
        nextSection = Math.max(0, currentSectionRef.current - 1);
        break;
      case 'Home':
        e.preventDefault();
        nextSection = 0;
        break;
      case 'End':
        e.preventDefault();
        nextSection = sections.length - 1;
        break;
      default:
        return;
    }

    if (nextSection !== currentSectionRef.current) {
      snapToSection(nextSection);
    }
  }, [sections, snapToSection]);

  // Initialize Observer with performance optimizations
  useEffect(() => {
    // Prevent default scroll behavior
    const preventDefault = (e: Event) => e.preventDefault();
    
    // Add event listeners
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('touchstart', preventDefault, { passive: false });
    window.addEventListener('touchmove', preventDefault, { passive: false });

    // Initialize Observer for touch/swipe detection with throttling
    Observer.create({
      type: OBSERVER_CONFIG.OBSERVER_TYPES,
      wheelSpeed: OBSERVER_CONFIG.WHEEL_SPEED,
      onDown: () => {
        if (isAnimatingRef.current) return;
        
        const now = Date.now();
        if (now - lastTouchTimeRef.current < OBSERVER_CONFIG.TOUCH_THROTTLE) {
          return;
        }
        lastTouchTimeRef.current = now;

        const nextSection = Math.min(sections.length - 1, currentSectionRef.current + 1);
        if (nextSection !== currentSectionRef.current) {
          snapToSection(nextSection);
        }
      },
      onUp: () => {
        if (isAnimatingRef.current) return;
        
        const now = Date.now();
        if (now - lastTouchTimeRef.current < OBSERVER_CONFIG.TOUCH_THROTTLE) {
          return;
        }
        lastTouchTimeRef.current = now;

        const nextSection = Math.max(0, currentSectionRef.current - 1);
        if (nextSection !== currentSectionRef.current) {
          snapToSection(nextSection);
        }
      }
    });

    if (OBSERVER_CONFIG.ENABLE_DEBUG_LOGS) {
      console.log(`%c[OBSERVER]%c Initialized with ${sections.length} sections`, 
        'color: #f542c8; font-weight: bold;', 
        'color: inherit;'
      );
    }

    // Cleanup
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('touchstart', preventDefault);
      window.removeEventListener('touchmove', preventDefault);
      Observer.killAll();
      
      if (OBSERVER_CONFIG.ENABLE_DEBUG_LOGS) {
        console.log(`%c[OBSERVER]%c Cleaned up`, 
          'color: #f542c8; font-weight: bold;', 
          'color: inherit;'
        );
      }
    };
  }, [handleWheel, handleKeydown, sections, snapToSection]);

  // Expose methods for external control
  useEffect(() => {
    if (OBSERVER_CONFIG.ENABLE_WINDOW_EXPOSE) {
      (window as any).observerScrollManager = {
        snapToSection,
        getCurrentSection: () => currentSectionRef.current
      };
    }
  }, [snapToSection]);

  return null;
}
```

### Step 3: Modify AnimationManager for Observer Integration

Update `src/components/AnimationManager.tsx`:

```typescript
// Add new imports
import { Observer } from 'gsap/Observer';

// Add to existing interface
interface AnimationManagerProps {
  // ... existing props
  onSectionChange?: (sectionIndex: number) => void;
  currentSection?: number;
}

// Modify the component to accept section change callbacks
export function AnimationManager({
  // ... existing props
  onSectionChange,
  currentSection = 0,
}: AnimationManagerProps) {
  // ... existing code

  // Add section change effect
  useEffect(() => {
    if (typeof currentSection === 'number' && modelReady) {
      handleSectionChange(currentSection);
    }
  }, [currentSection, modelReady]);

  // Create section change handler
  const handleSectionChange = useCallback((sectionIndex: number) => {
    if (!modelReady) return;

    const sectionHandlers = {
      0: () => {
        // Section 0 logic
        if (!initialAnimationPlayedRef.current) {
          kreatonTransitionFromCurrentToAnimation("WALKING");
          startEarthRotation();
          setCameraTarget({ x: 0, y: 1, z: 0 }, { duration: 1 });
          setCameraPosition({ x: 0, y: 0.5, z: 4 }, { duration: 1 });
        }
      },
      1: () => {
        // Section 1 logic
        setCameraPosition({ x: 0, y: 0.5, z: 4 }, { duration: 1, ease: "sine.inOut" });
        setCameraTarget({ x: 0, y: 1.5, z: 0 }, { duration: 1, ease: "sine.inOut" });
        setFOV(ZOOM_FOV);
        kreatonTransitionFromCurrentToAnimation("SALUTE");
        stopEarthRotation();
      },
      // ... continue for all sections
    };

    const handler = sectionHandlers[sectionIndex as keyof typeof sectionHandlers];
    if (handler) {
      handler();
    }

    onSectionChange?.(sectionIndex);
  }, [modelReady, onSectionChange, kreatonTransitionFromCurrentToAnimation, startEarthRotation, stopEarthRotation, setCameraTarget, setCameraPosition, setFOV]);

  // ... rest of existing code
}
```

### Step 4: Update App.jsx for Observer Integration

```jsx
import { SceneCanvas } from "./components/SceneCanvas";
import { ObserverScrollManager } from "./components/ObserverScrollManager";
import { useRef, useState } from "react";
import { OBSERVER_CONFIG } from "./config/observerConfig";

export default function App() {
  const scrollContainerRef = useRef(null);
  const [currentSection, setCurrentSection] = useState(0);

  const sections = [
    "section-0",
    "section-1", 
    "section-2",
    "section-3",
    "section-4",
    "section-5",
    "section-6",
    "section-7"
  ];

  const handleSectionChange = (sectionIndex: number) => {
    setCurrentSection(sectionIndex);
    if (OBSERVER_CONFIG.ENABLE_DEBUG_LOGS) {
      console.log(`%c[APP]%c Section changed to: ${sectionIndex}`, 
        'color: #42f584; font-weight: bold;', 
        'color: inherit;'
      );
    }
  };

  return (
    <>
      <ObserverScrollManager
        sections={sections}
        onSectionChange={handleSectionChange}
        scrollContainerRef={scrollContainerRef}
      />
      <SceneCanvas 
        scrollContainerRef={scrollContainerRef}
        currentSection={currentSection}
        onSectionChange={handleSectionChange}
      />
    </>
  );
}
```

### Step 5: Update SceneCanvas.jsx

```jsx
// Add props to SceneCanvas
export function SceneCanvas({ 
  scrollContainerRef, 
  currentSection, 
  onSectionChange 
}) {
  // ... existing code

  return (
    <>
      <Suspense fallback={<div>Loading 3D scene...</div>}>
        {/* ... existing Canvas setup */}
        <Suspense name="AnimationManager" fallback={null}>
          <AnimationManager
            kreatonRef={kreatonRef}
            earthRef={earthRef}
            rotatorRef={rotatorRef}
            clumpRef={rocksRef}
            cdTextRef={cdTextRef}
            scrollContainerRef={scrollContainerRef}
            currentSection={currentSection}
            onSectionChange={onSectionChange}
          />
        </Suspense>
        {/* ... rest of existing code */}
      </Suspense>
    </>
  );
}
```

### Step 6: Update HTML Structure

Modify `index.html` to ensure proper section heights:

```html
<style>
  .sections {
    height: 100vh; /* Changed from 150vh to 100vh for full viewport sections */
    background-color: black;
    position: relative;
  }

  /* Add smooth scrolling to body */
  body {
    margin: 0;
    overflow: hidden; /* Prevent native scrolling */
  }

  /* Ensure scroll container takes full height */
  [data-scroll-container] {
    height: 100vh;
    overflow: hidden;
  }
</style>
```

### Step 7: Remove useSmoothScroll Hook

Since we're replacing the smooth scroll functionality, remove or comment out the `useSmoothScroll` hook usage in your components.

## Compatibility Considerations

### 1. React Three Fiber Integration
- **Issue**: 3D scene animations need to sync with section changes
- **Solution**: Pass section change callbacks to AnimationManager
- **Impact**: Maintains existing animation logic while adding Observer control

### 2. Existing ScrollTrigger Cleanup
- **Issue**: Current ScrollTrigger instances need to be removed
- **Solution**: Comment out or remove ScrollTrigger creation in AnimationManager
- **Impact**: Prevents conflicts between ScrollTrigger and Observer

### 3. Performance Optimization
- **Issue**: Observer events might conflict with 3D rendering
- **Solution**: Use `requestAnimationFrame` for smooth animations
- **Impact**: Maintains 60fps performance

### 4. Mobile Touch Support
- **Issue**: Touch events need special handling
- **Solution**: Observer handles touch/swipe gestures automatically
- **Impact**: Better mobile experience

### 5. Keyboard Navigation
- **Issue**: Accessibility requirements
- **Solution**: Built-in keyboard support in ObserverScrollManager
- **Impact**: Improved accessibility

## Testing Strategy

### 1. Section Transitions
- Test each section transition
- Verify animation timing
- Check for animation conflicts

### 2. Performance Testing
- Monitor frame rate during transitions
- Test on mobile devices
- Check memory usage

### 3. Edge Cases
- Rapid section changes
- Browser back/forward buttons
- Page refresh behavior

### 4. Accessibility Testing
- Keyboard navigation
- Screen reader compatibility
- Focus management

## Migration Checklist

### Phase 1: Setup (Day 1)
- [x] Create configuration constants file
- [x] Create ObserverScrollManager component
- [x] Update App.jsx structure
- [x] Test basic section snapping

### Phase 2: Integration (Day 2)
- [x] Modify AnimationManager for Observer
- [x] Update SceneCanvas props
- [x] Test 3D scene integration
- [x] Verify animation timing

### Phase 3: Optimization (Day 3)
- [x] Performance testing with throttling
- [x] Mobile optimization (touch/swipe)
- [x] Accessibility improvements (keyboard nav)
- [x] Edge case handling

### Phase 4: Cleanup (Day 4)
- [x] Remove old ScrollTrigger code
- [x] Remove useSmoothScroll hook
- [x] Update HTML structure (100vh sections)
- [x] Update documentation
- [x] Final testing
- [x] Performance validation

## Potential Issues and Solutions

### Issue 1: Animation Timing Conflicts
**Problem**: 3D animations might not sync with section changes
**Solution**: Use GSAP timelines with proper sequencing

### Issue 2: Performance on Mobile
**Problem**: Complex 3D scene might lag during transitions
**Solution**: Implement progressive enhancement for mobile

### Issue 3: Browser Compatibility
**Problem**: Observer might not work in older browsers
**Solution**: Add fallback to native scrolling

### Issue 4: Memory Leaks
**Problem**: Observer instances might not clean up properly
**Solution**: Ensure proper cleanup in useEffect

## Benefits of Observer Implementation

1. **Smoother Transitions**: Direct control over section changes
2. **Better Performance**: Reduced scroll event overhead
3. **Mobile Optimization**: Better touch/swipe handling
4. **Accessibility**: Built-in keyboard navigation
5. **Flexibility**: Easy to customize transition timing and easing

## Conclusion

This implementation provides a robust foundation for section snapping while maintaining compatibility with the existing 3D scene and animation system. The Observer-based approach offers better performance and user experience compared to ScrollTrigger for this use case.

The migration should be done incrementally to ensure stability and proper testing at each stage. The modular approach allows for easy rollback if issues arise during implementation. 