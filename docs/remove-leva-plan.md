# Plan for Removing Leva Dependency

## 1. Objective

The primary goal is to completely remove the `leva` dependency from the project. This will streamline the application, reduce bundle size, and eliminate a development-only tool from the production build. The critical success factor is to ensure that the visual appearance of the `Earthv4_UV` component, particularly the water shader, remains identical to the current production version after `leva` is removed.

## 2. Analysis of the Current Implementation

The `leva` library is currently used in `src/components/Earthv4_UV.jsx` to provide real-time controls for shader uniforms and model properties during development. This is handled by two functions:

-   `WaterShaderControls()`: Manages the uniforms for the custom water shader.
-   `EarthModelControls()`: Manages the position, rotation, and scale of the Earth and ocean meshes.

Both functions use a conditional check (`import.meta.env.DEV`) to decide whether to render `leva` controls or return a hardcoded object of values for production.

### The "Different Look" Problem

The likely reason for the water shader's appearance changing in your previous attempt is a mismatch between the values tweaked in the `leva` panel during development and the values hardcoded for the production build. To avoid this, we will "bake" the exact values from the production configuration into the code, making them the single source of truth.

## 3. Proposed Refactoring Strategy

The strategy is to refactor the control-providing functions to be simple, static data sources, and then to remove the `leva` package.

### Step 1: Statically Define Control Values

We will modify `WaterShaderControls` and `EarthModelControls` to remove all logic related to `leva` and the `isDevelopment` check. They will be converted into simple functions that return a static object containing the final, desired values. These are the same values currently used in the production build.

**Example Refactoring for `WaterShaderControls`:**

**Before:**
```javascript
function WaterShaderControls() {
  // Only show controls in development
  const isDevelopment = import.meta.env.DEV;
  if (!isDevelopment) {
    return {
      noiseFrequency: 4.5,
      // ... other production values
    };
  }

  const controls = useControls("Water Shader", {
    noiseFrequency: { value: 4.5, min: 0.1, max: 20, step: 0.1 },
    // ... other leva controls
  });

  return controls;
}
```

**After:**
```javascript
function WaterShaderControls() {
    return {
      noiseFrequency: 4.5,
      noiseAmplitude: 0.012,
      noiseSpeed: 0.30,
      waterColor: "#1e90ff",
      waterOpacity: 1,
      roughness: 0.34,
      metalness: 0.2,
      useTextureFlag: true,
      textureBrightness: 0.8,
      textureRepeat: 1.0,
      causticsFrequency: 10.0,
      causticsSpeed: 0.44,
      causticsIntensity: 0.25,
      causticsSharpness: 0.02,
      causticsEdgeThickness: 0.00,
      causticsDistortionFrequency: 18.5,
      causticsDistortionAmplitude: 0.17,
    };
}
```
A similar transformation will be applied to `EarthModelControls`.

### Step 2: Clean Up `Earthv4_UV.jsx`

-   Remove the import statement for `leva`: `import { useControls } from "leva";`.
-   Ensure all calls to the refactored functions work as expected.

### Step 3: Remove Leva from Project Dependencies

-   I will remove the `"leva"` package from `package.json`.
-   I will then run the package manager's install command (`pnpm install`) to update the `pnpm-lock.yaml` file and remove the package from `node_modules`.

## 4. Verification

After the code changes are applied and dependencies are updated, you will need to run the application and visually inspect the `Earthv4_UV` component. It should render identically to how it would in a production build, thereby preserving the intended look. 