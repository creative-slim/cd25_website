# AnimationManager Component Documentation

## Overview
The `AnimationManager` is a React component that orchestrates all major animations, camera movements, and timeline-based interactions in the Creative Directors website. It leverages GSAP (GreenSock Animation Platform) and ScrollTrigger for smooth, scroll-driven, and programmatic animations, and is tightly integrated with Three.js via React Three Fiber.

## Key Features
- **Centralized Animation Control:** Manages all major scene and character animations.
- **Camera Management:** Smoothly animates camera position, target, and FOV.
- **Scroll-Driven Timelines:** Uses GSAP ScrollTrigger to synchronize animations with scroll position.
- **Earth Rotation:** Controls the rotation of the 3D Earth model, with start/stop logic.
- **Section-Based Animation:** Each scroll section triggers specific animation sequences and camera moves.
- **Robust Logging:** Enhanced, color-coded logs for debugging and animation state tracking.

## Best Practices & Optimizations (as of React 19)
- **Strict Cleanup:** All GSAP timelines, ScrollTriggers, and timeouts are cleaned up on unmount to prevent memory leaks and double triggers, especially important with React StrictMode.
- **Double-Mount Guard:** Uses a ref to ensure initialization logic only runs once per mount, avoiding issues with React 19's double-invocation in development.
- **Stable Callbacks:** All animation and event handlers are wrapped in `useCallback` for performance and stability.
- **Minimal useEffect Dependencies:** Effects use stable refs and callbacks to avoid unnecessary reruns.
- **Side Effect Documentation:** Each effect and animation setup is documented for clarity and maintainability.

## Usage Example
```jsx
<AnimationManager
  kreatonRef={kreatonRef}
  earthRef={earthRef}
  rotatorRef={rotatorRef}
  clumpRef={clumpRef}
  pointingFingerRef={pointingFingerRef}
  cdTextRef={cdTextRef}
/>
```

## Cleanup Logic
- On unmount, the component:
  - Clears all timeouts (e.g., for animation cycles or delayed effects)
  - Kills all GSAP timelines and ScrollTriggers
  - Resets double-mount guard ref

## When to Use
- For any scene where you need coordinated, scroll-driven, or programmatic animation of cameras, models, or effects in a Three.js/React environment.

## Further Reading
- [GSAP ScrollTrigger Docs](https://greensock.com/scrolltrigger/)
- [React Three Fiber Docs](https://docs.pmnd.rs/react-three-fiber/getting-started/introduction)
- [React 19 StrictMode](https://react.dev/blog/2024/04/25/react-19-rc)

## Props

- `kreatonRef`: Reference to the Kreaton character model
- `earthRef`: Reference to the Earth model
- `rotatorRef`: Reference to the rotating container component
- `clumpRef`: Reference to the particle system component
- `scrollContainerRef`: Reference to the scrollable container

## Key Features

### Logging System

- Color-coded logs for different components (animations, timelines, models, etc.)
- Configurable with the `DEBUG_LOGS` flag to enable/disable all logs
- Provides timing information for main timeline

### Animation Controls

- **Earth Rotation**: Can be started/stopped with `startEarthRotation`/`stopEarthRotation`
- **Character Animation**: Transitions between animations with crossfade
- **Camera Movement**: Smooth transitions for camera position and target
- **Particle Effects**: Controls clump activation and explosions

### Core Functions

- `setCameraTarget(position, options)`: Smoothly moves camera focus
- `rotatorUp(x)`: Handles vertical movement of the rotator component
- `createSectionTimeline(sectionId, options)`: Creates a ScrollTrigger-based timeline for a section

## Scroll Sections

### Section 0: Introduction/Walking

- Initial introduction sequence
- Character walking animation
- Earth rotation starts
- Camera position: z: 2.2, y: 1.2

### Section 1: Salute Animation

- Character performs salute animation
- Earth rotation stops
- Camera focuses on character

### Section 2: Rotation Sequence

- Camera rotates in a full 360° circle around the scene
- Rotator moves up
- Subtle camera tilt during rotation

### Section 3: Carousel View

- Smooth transition from circular path
- Camera positioned to view carousel (z: 1.5)
- Subtle upward tilt at beginning

### Section 4: Far View Sequence

- Activates clump particles with shield
- Camera moves to distant position (x: 7, y: 7, z: 7)
- Wide view of the entire scene

### Section 5: Final Explosion Sequence

- Wide camera view (x: 10, y: 10, z: 10)
- "PUSH" animation plays once
- Triggers particle explosion
- Earth rotation stops after explosion

### Section 6: Kreaton Face Closeup

- Close camera view of character's face
- Plays facial or idle animation
- Subtle camera breathing effect

### Section 7: Final Reset

- Resets camera target

## Implementation Details

### State Management

- `isInitialized`: Tracks if animations are set up
- `modelReady`: Confirms when 3D models are loaded
- `isEarthRotating`: Controls Earth rotation state
- `hasPushedRef`: Ensures push animation plays only once

### Cleanup

- `cleanupTimeline()`: Removes all ScrollTrigger instances and timeouts
- Component cleanup on unmount

### Debug Tools

- Optional camera target visualization (disabled by default)
- Detailed progress logs for animations and ScrollTrigger events

## Usage Notes

- Requires GSAP with ScrollTrigger plugin
- Designed to work with React Three Fiber
- Timeline creation happens after models are loaded
- Animation transitions use crossfade for smooth blending

## Key Features

### 1. Camera Controls
- **Camera Position**: Smoothly moves the camera to different positions
- **Camera Target**: Controls where the camera is looking
- **FOV (Field of View)**: Adjusts the camera's field of view for different effects
  - Default FOV: 55°
  - Wide FOV: 70°

### 2. Earth Rotation
- Controls the rotation of the 3D Earth model
- Can start and stop rotation
- Smooth transitions between rotation states

### 3. Animation Sequences
- **Initial Sequence**: Sets up the initial camera position and view
- **Rotator Sequence**: Handles the rotator element animations
- **Point Cycle**: Controls pointing finger animations
- **Explosion Effects**: Manages explosion animations

### 4. Debug System
- Color-coded console logging for different types of events:
  - Sequence logs (blue)
  - Animation logs (green)
  - Timeline logs (purple)
  - System logs (orange)
  - Error logs (red)
  - Model logs (yellow)
  - Time logs (light blue)
  - ScrollTrigger logs (pink)

## Main Functions

### Camera Functions
```javascript
setCameraPosition(position, options)
setCameraTarget(target, options)
setFOV(fov, options)
```
These functions handle smooth camera movements with customizable duration and easing.

### Earth Control
```javascript
startEarthRotation()
stopEarthRotation()
```
Controls the Earth model's rotation state.

### Animation Control
```javascript
rotatorX(x)
```
Controls the rotator element's movement.

## Best Practices
1. Always use the provided animation functions instead of direct GSAP calls
2. Use the debug logging system for troubleshooting
3. Keep animation durations reasonable (1-2 seconds for most transitions)
4. Use appropriate easing functions for smooth animations

## Common Issues and Solutions
1. **Camera Jumps**: Use `setCameraPosition` and `setCameraTarget` together
2. **Animation Conflicts**: The manager automatically kills conflicting tweens
3. **Performance**: Animations are optimized for smooth performance

## Dependencies
- GSAP
- Three.js
- React Three Fiber
- ScrollTrigger (GSAP plugin)

## Notes
- All animations are managed through GSAP timelines
- The component includes automatic cleanup of animations
- Debug logs can be toggled using the `DEBUG_LOGS` constant
