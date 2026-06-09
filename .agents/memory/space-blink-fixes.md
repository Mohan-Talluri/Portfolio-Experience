---
name: Space portfolio blink fixes
description: Root causes of the blinking/context-loss in the Three.js space portfolio and how to fix them.
---

# Blinking / WebGL context loss — root causes & fixes

**Rule:** Never combine `alpha: true` on the R3F Canvas with `EffectComposer` post-processing. The Bloom offscreen render target compositing with a transparent WebGL framebuffer causes 2-3 Hz black flashes.

**Why:** The EffectComposer blits to an offscreen buffer, then composites onto the transparent canvas. Each blit cycle can produce a partially-transparent frame that the browser compositor shows through to the DOM layer behind, creating a visible flash.

**How to apply:** Use emissive materials / rim shaders for glow instead of Bloom. If Bloom is needed, set `alpha: false` and render the background inside Three.js (sky sphere/dome), not as an HTML canvas.

---

**Rule:** All transparent BackSide atmosphere meshes must have `depthTest: false`.

**Why:** Multiple overlapping BackSide + AdditiveBlending + depthWrite:false spheres (one per planet × 2 shells = 14 objects) compete for depth sorting every frame. The sort result flickers, causing visible blinks on the atmosphere halos.

**How to apply:** Add `depthTest: false` to every ShaderMaterial used on a BackSide atmosphere shell.

---

**Rule:** Moving planet constants (PLANET_POSITIONS, PLANET_CONFIGS) out of the component file and into a separate `planetData.ts` is required for stable HMR.

**Why:** Exporting both components and non-component values from the same file makes Vite's Fast Refresh invalidate the entire module on every change, causing full page reloads instead of hot patches.
