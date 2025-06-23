# General Project Optimizations

This document summarizes the performance optimizations and best practices applied across the project. It serves as a reference for future development and maintenance.

---

## 1. `SceneCanvas.jsx`

The main scene component was optimized to reduce re-renders and improve GPU performance.

-   **Leva Controls Isolation**: The `useControls` hook from Leva was causing the entire `SceneCanvas` to re-render on every control change. This was resolved by moving the controls into a dedicated `PostProcessingControls` component, which is now decoupled from the main scene's render loop.
-   **Effects Composition**: The post-processing effects chain was encapsulated within a new `PostProcessingEffects` component to improve organization and clarity.
-   **Canvas Props Optimization**: The `<Canvas>` component's props were fine-tuned for better performance:
    -   `dpr`: Capped at a maximum of `2` to prevent excessive pixel rendering on high-resolution displays.
    -   `antialias`: Disabled, as post-processing effects like SMAA or FXAA can handle anti-aliasing more efficiently if needed.
    -   `powerPreference`: Set to `"high-performance"` to encourage the use of the dedicated GPU.
-   **Component Memoization**:
    -   The props for the `AnimatedStars` component were memoized using `useMemo` to prevent it from re-rendering unnecessarily.
    -   The star count was reduced from 5000 to 2000.

---

## 2. `AnimationManager.tsx`

The core animation orchestrator was optimized to reduce its processing overhead and improve stability.

-   **Conditional Logging**: A `DEBUG_LOGS` flag (powered by `process.env.NODE_ENV`) was introduced to ensure all `console.log` statements are automatically removed from production builds.
-   **Throttled Logging**: The logging function itself was throttled to prevent log spam from overwhelming the console during rapid events, such as `onUpdate` scroll triggers.
-   **Reduced Polling Frequency**: The `setInterval` used to check if models were ready was adjusted from `100ms` to a more reasonable `250ms`, reducing unnecessary checks.
-   **Memoized Hook Dependencies**: The large number of refs passed as dependencies to the main `useGSAP` hook were grouped into a single, memoized object (`memoizedRefs`). This prevents the hook from re-initializing on every render cycle.
-   **Callback Memoization**: All helper functions and callbacks passed to hooks or child components were wrapped in `useCallback` to prevent them from being recreated on each render.

---

## 3. `Earthv4_UV.jsx`

The Earth model component was refactored to optimize its shader and material handling.

-   **Leva Controls Isolation**: Similar to `SceneCanvas`, the Leva controls for the water shader were moved into a separate `WaterShaderControls` component to prevent the main component from re-rendering on slider changes.
-   **Memoization**:
    -   The arguments for the `<sphereGeometry>` were memoized with `useMemo` to prevent the geometry from being recreated on each render.
    -   The `useFrame` update logic and the initial texture setup were wrapped in `useCallback`.
-   **Constant Shaders**: The GLSL vertex and fragment shaders were extracted into top-level constants to avoid being redefined on every render.
-   **Conditional Logging**: Logging was made conditional based on the development environment.

---

## 4. `Kreaton_A.jsx`

The main character model component was optimized for better material management and more robust animation handling.

-   **Material Memoization**: The `MeshStandardMaterial` for the skin was created only once and memoized using `useMemo`, preventing a new material from being generated on every render.
-   **Robust Animation Logic**: The animation system was refined to be more resilient. After a simplification attempt broke the animations, the original, more robust `transitionFromCurrentToAnimation` function was restored, highlighting the importance of carefully managing animation state transitions.
-   **Conditional Logging**: A `DEBUG_LOGS` flag was added to control console output.
-   **Consistent Model Loading**: The component was updated to use the `useModelLoader` utility, ensuring a consistent and pre-loadable pattern for fetching GLB models.

---

## 5. `CD_header_v1_untransformed.jsx`

The header text model component was refactored to use modern GSAP practices and fix animation errors.

-   **Modernized Animation with `useGSAP`**: The traditional `useEffect` hook for running animations was replaced with GSAP's `useGSAP` hook. This provides better context-aware animation management and handles cleanup automatically.
-   **Memoized Node Keys**: The logic for finding specific meshes (e.g., "Gold\_" and "WhiteFont\_") was memoized with `useMemo` to prevent re-filtering the entire list of nodes on every render.
-   **GSAP Bug Fixes**:
    -   Fixed a "read-only property" crash by changing `gsap.set(meshes, { scale: 0 })` to `gsap.set(meshes.map(m => m.scale), { x: 0, y: 0, z: 0 })`.
    -   Resolved an "Invalid property" warning by changing tweens targeting `rotationY` to correctly target `mesh.rotation` with a `y` property (e.g., `gsap.set(mesh.rotation, { y: ... })`).

---

## 6. `Carosel.jsx`

The image carousel component was optimized to reduce re-renders and lessen the performance impact of its per-frame calculations.

-   **Removed Redundant State**: A state variable (`isCircle`) in the `Card` component was causing re-renders on every hover event, but the rendered output was identical. Removing this state eliminated the unnecessary re-renders.
-   **Throttled Expensive Calculations**: The `determineVisibleCard` function, which performs expensive position and vector calculations, was being called on every frame. Its execution was throttled to run only once every 10 frames, significantly reducing its performance overhead.
-   **Code Cleanup**: An unused `morphShader` was removed from the file to reduce clutter.
-   **Component and Callback Memoization**: The `Card` component was wrapped in `React.memo`, and its event handlers (`pointerOver`, `pointerOut`) were wrapped in `useCallback` to ensure it only re-renders when its props actually change.
-   **Conditional Logging**: All `console.log` statements were wrapped in a `DEBUG_LOGS` check. 