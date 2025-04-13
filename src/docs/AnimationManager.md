# AnimationManager Component Documentation

## Overview

The `AnimationManager` component controls animations, camera movements, and scroll-triggered sequences throughout the website. It integrates 3D models, GSAP animations, and ScrollTrigger to create an interactive experience that responds to user scrolling.

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
