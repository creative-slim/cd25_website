# Production Optimization Checklist

This checklist is prioritized based on impact and implementation effort. We will go through these items one by one to prepare the application for production.

---

### ✅ Completed Items

- [x] **Disable Unused Shadows:** Removed the `shadows` prop from the main `<Canvas>` as there are no shadow-casting lights.
- [x] **Resize Environment Map:** Switched from a 4K `.hdr` to a smaller `.hdr` file to reduce initial load time.
- [x] **Remove Duplicate EffectComposer:** Deleted the second `<EffectComposer>` instance in `SceneCanvas.jsx`.
- [x] **Move Dev Dependencies:** Moved `leva` and `r3f-perf` to `devDependencies`.
- [x] **Remove Unused Physics Engine:** Uninstalled the deprecated `@react-three/cannon` package.
- [x] **Code-Split Components:** Used `React.lazy()` and `<Suspense>` to dynamically import major 3D components (`Kreaton_A`, `Earthv4_UV`, `Rocks`, `Header_v1`, etc.) in `SceneCanvas.jsx`.
- [x] **Verify Production Logs are Disabled:** Ensure the `DEBUG_LOGS` constant in `AnimationManager.tsx` is set to `false` and that this successfully removes all logging statements from the production build.

---

### 🚀 High Priority (High Impact, Low-to-Medium Effort)

- [ ] **Compress 3D Models:** Apply Draco compression to all `.glb` models (`CD_header_v1-transformed.glb`, `Kreaton`, `Earth`, etc.) to significantly reduce their file size.

---

### 🟠 Medium Priority (Good Impact, Medium Effort)

- [ ] **Optimize Model Textures:** Review the texture maps used in the 3D models. Resize any oversized textures and compress them using a web-friendly format like WebP.
- [ ] **Confirm CDN for Assets:** Ensure the production asset URL (`files.creative-directors.com`) is served via a CDN to reduce latency for users globally.
- [ ] **Modularize `AnimationManager`:** Begin refactoring the monolithic `AnimationManager.tsx` by breaking down the animation logic for one or two sections into separate, smaller hooks or components. This will improve maintainability.
- [ ] **Optimize ScrollTrigger:** Test the impact of `scrub: true` on performance, especially on mobile. Consider using a numeric value (e.g., `scrub: 0.5`) to smooth the animation link to the scroll, potentially improving frame rates.

---

### 🔵 Low Priority (Advanced / Long-term)

- [ ] **Production-only Effects Component:** Create a separate post-processing component for production that only imports the effects that are enabled by default, further reducing bundle size.
- [ ] **Evaluate State-Driven Animations:** For a single component, refactor the animation from being controlled imperatively by the `AnimationManager` to being driven declaratively by props passed from `SceneCanvas`. This is an architectural change to evaluate for future development.
