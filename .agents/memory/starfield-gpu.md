---
name: StarField GPU budget
description: Star particle count that avoids WebGL context loss in the space portfolio.
---

# StarField GPU budget

**Rule:** Keep total star particle count under ~3500 across all layers, merged into a single THREE.Points draw call.

**Why:** 13,200 stars across 4 separate Points draw calls with per-vertex custom shader attributes (5 attributes per star) caused WebGL context loss (GPU VRAM exhaustion) manifesting as periodic black screen blinks.

**How to apply:** Merge all star layers into a single bufferGeometry with a layer offset baked into the `zBias` position, single material, single draw call. Layers are differentiated by per-vertex size/phase/rate attributes.

Safe layer breakdown:
- Layer 1 (distant): ~1800 stars, spread 600
- Layer 2 (mid): ~900 stars, spread 320
- Layer 3 (nearby): ~350 stars, spread 140
- Layer 4 (foreground): ~30 stars, spread 55
