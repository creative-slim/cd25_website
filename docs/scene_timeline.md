# SceneCanvas Animation Timeline Documentation

## Overview
The SceneCanvas component manages a complex 3D scene with multiple animated sections controlled by scroll triggers. The animation system is built using GSAP (GreenSock Animation Platform) and React Three Fiber.

## Camera Settings
- Default FOV: 55°
- Wide FOV: 70°
- Default Camera Position: [0, 0.5, 4]
- Default Camera Target: [0, 1, 0]

## Animation Sections

### Initial Animation
- **Trigger**: On component mount
- **Animations**:
  - JUMP → WALKING transition (if available)
  - Cross-fade time: 0.8s
  - Fade-in duration: 0.3s
  - Earth rotation starts after 2.4s

### Section 0 - Introduction/Walking
- **Trigger**: `#section-0`
- **End**: "bottom 80%"
- **Enter**:
  - Transitions to WALKING animation
  - Starts Earth rotation
  - Sets camera target to [0, 1, 0]
- **Leave Back**:
  - Reverts to WALKING animation
  - Restarts Earth rotation
  - Camera position: [0, 0.5, 4]
  - Camera target: [0, 1, 0]
- **Enter Back**:
  - Camera target: [0, 1.5, 0]
  - Camera position: [0, 0.5, 4]
  - Shows CD text with intro animation

### Section 1 - Salute Animation
- **Trigger**: `#section-1`
- **Enter**:
  - Camera position: [0, 0.5, 4]
  - Camera target: [0, 1.5, 0]
  - Transitions to SALUTE animation
  - Stops Earth rotation
- **Leave Back**:
  - Reverts to WALKING animation
  - Restarts Earth rotation
  - Camera target: [0, 1, 0]

### Section 2 - Rotation Sequence
- **Trigger**: `#section-2`
- **Enter**:
  - Moves rotator up
  - Sets up rotator camera view
  - Hides CD text
  - Camera sequence:
    1. Moves to [2, 1.5, 2]
    2. Returns to [0, 1.5, 2]
  - Sets FOV to WIDE_FOV (70°)
- **Leave Back**:
  - Camera sequence:
    1. Moves to [2, 0, 0]
    2. Returns to [0, 0, 0]
  - Moves rotator down
  - Sets FOV to DEFAULT_FOV (55°)
  - Reverts to SALUTE animation
  - Stops Earth rotation

### Section 3 - Clump Particles
- **Trigger**: `#section-3`
- **Enter**:
  - Hides CD text
- **Leave Back**:
  - Deactivates clump particles
  - Reverts to SALUTE animation
- **Leave**:
  - Deactivates clump particles
- **Enter Back**:
  - Sets up rotator camera view
  - Deactivates clump particles

### Section 4 - Final Explosion Sequence
- **Trigger**: `#section-4`
- **Enter**:
  - Sets FOV to DEFAULT_FOV (55°)
  - Camera position: [10, 10, 10]
  - Camera target: [0, 1.5, 0]
  - Hides rotator
  - Activates clump particles
  - After 1s delay:
    1. Plays PUSH animation
    2. At 70% of PUSH animation:
       - Triggers permanent explosion
       - Stops Earth rotation
       - Hides clump
       - Transitions to IDLE animation
- **Leave Back**:
  - Camera position: [10, 10, 10]
  - Camera target: [0, 1.5, 0]
  - Shows rotator
  - Reverts to IDLE animation
  - Reactivates clump particles

### Section 5 - Back to Kreaton Face
- **Trigger**: `#section-5`
- **Enter**:
  - Camera position: [0, 0.5, 4]
  - Camera target: [0, 1.5, 0]
  - Moves rotator up
- **Leave Back**:
  - Camera position: [0, 0.5, 4]
  - Camera target: [0, 1.5, 0]
  - Reverts to IDLE animation
  - Moves rotator up
  - Stops Earth rotation

### Section 6 - Kreaton Side and Point
- **Trigger**: `#section-6`
- **Enter**:
  - Camera position: [1.5, 1.5, 5.5]
  - Camera target: [-1.5, 1.5, 0]
  - Stops Earth rotation
  - Starts POINT/IDLE cycle:
    1. Plays POINT animation
    2. Transitions to IDLE for 5s
    3. Repeats cycle
- **Leave**:
  - Clears POINT/IDLE cycle
- **Leave Back**:
  - Clears POINT/IDLE cycle
  - Reverts to IDLE animation
  - Camera position: [0, 0.5, 4]
  - Camera target: [0, 1.5, 0]
  - Moves rotator up

### Section 7 - Final Reset
- **Trigger**: `#section-7`
- **Leave Back**:
  - Camera position: [1.5, 1.5, 5.5]
  - Camera target: [-1.5, 1.5, 0]
  - Stops Earth rotation

## Animation Transitions
- Cross-fade time: 0.8s (default)
- Fade-in duration: 0.3s (default)
- Camera movement duration: 1s (default)
- Camera movement ease: "power2.inOut" (default)

## Post-Processing Effects
The scene includes several post-processing effects that can be toggled and configured:
- Bloom
- Depth of Field
- Noise
- Vignette
- Chromatic Aberration
- Glitch
- Pixelation
- Tone Mapping
- Hue/Saturation

## Cleanup
The animation system includes proper cleanup of:
- GSAP timelines
- ScrollTrigger instances
- Timeout references
- Animation states 

## Notes
### Known Conflicts and Sync Issues
1. **Section 2-3 Transition**
   - Camera position conflicts between rotator setup and clump activation
   - Potential visual jump when transitioning between sections
   - Earth rotation state might not sync properly with camera movements

2. **Section 4 Explosion Timing**
   - PUSH animation and explosion timing might desync on slower devices
   - Clump visibility toggle might be visible during transition
   - Earth rotation stop might be delayed relative to explosion

3. **Section 5-6 Camera Movement**
   - Camera position changes might conflict with rotator movement
   - Potential visual stutter when transitioning between face and side views
   - IDLE animation might start before camera movement completes

4. **General Sync Issues**
   - Scroll-based triggers might fire too early or late depending on scroll speed
   - Animation crossfades might not complete before next section triggers
   - Camera movements might overlap with animation transitions

## Improvements
### Technical Improvements
1. **Animation System**
   - Implement animation queue system to prevent overlapping transitions
   - Add animation state machine for better control flow
   - Implement proper animation cancellation on section changes
   - Add animation progress tracking for better sync

2. **Camera System**
   - Implement camera path system for smoother transitions
   - Add camera collision detection to prevent clipping
   - Implement camera easing curves for more natural movement
   - Add camera shake effect for explosion sequence

3. **Performance**
   - Implement animation frame skipping for low-end devices
   - Add animation quality settings based on device capability
   - Optimize post-processing effects for better performance
   - Implement proper asset preloading

4. **Code Structure**
   - Separate animation logic into smaller, focused components
   - Implement proper TypeScript types for all animations
   - Add animation debugging tools
   - Create animation preview system

### Visual Improvements
1. **Transitions**
   - Add transition effects between sections
   - Implement smoother camera movements
   - Add particle effects for section changes
   - Improve animation crossfading

2. **Effects**
   - Add more dynamic post-processing effects
   - Implement better bloom and glow effects
   - Add environmental effects (fog, atmosphere)
   - Improve particle system performance

3. **User Experience**
   - Add loading indicators for section transitions
   - Implement better scroll-based triggers
   - Add animation speed controls
   - Improve mobile device support

4. **Content**
   - Add more interactive elements
   - Implement better visual feedback
   - Add sound effects for animations
   - Improve visual storytelling 