# Architecture decision — first playable encounter

## Inspection and constraints

The supplied workspace was empty: no source files, assets, package manifest, framework, or Git repository. Node and npm were available. The pasted brief referenced a party-frame image, but no image attachment was supplied; the UI follows the written interaction requirements rather than claiming to reproduce that reference.

The important workload is six mostly stationary actors, readable unit frames, a modest number of spell effects, and deterministic combat. Responsive keyboard healing takes priority over camera or locomotion systems.

## Compared approaches

| Approach | Benefits for this game | Costs and decision |
| --- | --- | --- |
| DOM/SVG for everything | Accessible UI, crisp scalable art, CSS transforms, straightforward inspection | Viable at this scale; many transient spell elements and coupled UI/scene lifecycle would complicate later effects. Use HTML for controls and SVG for icons. |
| Canvas 2D + HTML | Explicit draw order, gradients/blending, simple articulated drawings, one scene surface, small deployment, direct HTML input | Manual hit testing and animation tooling if later needed. Best fit for this stationary six-actor slice; characters are not input targets. Chosen. |
| PixiJS + HTML | Scene graph, sprites/graphics, nested transforms, particle support and GPU effects | Attractive upgrade if profiling or asset production calls for atlases, large particle counts, or skeletal rigs. Adds a rendering dependency without solving a current bottleneck. |
| Three.js + glTF | Meshes, materials, lighting, authored skeletal clips, camera depth | Requires cohesive rigged assets, model pipelines, lighting and camera work. Worth revisiting if 3D becomes the chosen art direction; current healing requirements do not depend on it. |

These are project-specific engineering judgments, not benchmark claims. No comparative performance benchmark was run. Canvas supports drawing and compositing through its browser API; the small scene is a reasonable initial scope. [MDN Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)

PixiJS offers containers, sprites, graphics, particles and inherited transforms, making it a plausible replacement scene layer. [PixiJS scene objects](https://pixijs.com/8.x/guides/components/scene-objects)

Three.js provides per-object animation playback and glTF loading, including animation clips. [AnimationMixer](https://threejs.org/docs/pages/AnimationMixer.html), [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html)

## Simulation and presentation boundary

`Combat` is independent of DOM, Canvas, and wall-clock timers. The browser advances it in fixed 1/60-second steps. `requestAnimationFrame` drives presentation; elapsed time is clamped to prevent a large catch-up burst after a stall. Background tabs/window blur explicitly pause. Browsers may suspend animation callbacks in hidden tabs, so a player should not return to an unobserved wipe. [MDN requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)

The simulation owns health, mana, statuses, spells, cooldowns, targeting at cast start, boss schedules, and outcomes. It emits semantic events: `cast`, `bolt`, `heal`, `damage`, `attack`, `warning`, `mechanic`, `death`, `cancel`, `complete`, `end`. Renderers consume these events and read state; they never decide damage or healing. The DOM refreshes at up to 30Hz while the scene renders at the display callback rate.

Penance launches each projectile 0.3 seconds before its corresponding healing event. Its three healing events occur at 0.5, 1.25, and 2 seconds. Visual time freezes during pause. Cancellation removes projectiles still in flight and stops pending healing. Impact rings and floating numbers originate from healing events, including an explicit full-health indication for complete overheal.

Actor positions live in party data, although encounter-specific rig geometry remains renderer-owned. New combat effects should extend semantic handlers, rather than reach into rendering code. Future healer loadout selection should inject a data set into `Combat`; the current slice supplies one default loadout. Buff generation/consumption is described by ability data rather than spell-name conditionals in the simulation.

## Art and animation strategy

This slice uses a consistent original angular fantasy style: layered armor, cloaks, recognizable weapons, a horned guardian, stone vaults and ritual circles. Character drawing has separate transformed weapon arms and torso movement. Breathing, attacks, casting glows, hit recoil, incapacitated poses, and boss swings are procedural. The cached environment is painted once, device pixel ratio is capped at 2, and transient effects are bounded to 120. Reduced-motion preferences suppress ambient movement and CSS transitions; gameplay-critical bolt travel remains visible.

Alternatives considered:

- **Original procedural vectors:** coherent, no asset licensing dependency, immediate iteration; chosen for the initial slice. Cost: less character detail and fewer authored poses.
- **Generated bitmaps:** useful for style exploration, backgrounds, and character concepts; require deliberate separation/rigging or sprite production for consistent animation. They do not automatically solve attack/casting animation.
- **Permissively licensed packs:** can accelerate richer characters, but require matching projection, palette, rig/animation coverage, and verifying each asset's redistribution terms. No packs were downloaded or represented as license-verified in this build.
- **2D skeletal rigs or 3D glTF:** stronger long-term animation workflows if art direction warrants authoring tools and asset pipelines. Keep those behind the renderer interface.

The battlefield renderer can be replaced with PixiJS, a skeletal system, or Three.js while retaining combat and unit-frame controls. The next art milestone should test a replacement character and its four essential states before committing the full roster.

## Deliberate boundaries

No framework, bundler, physics engine, entity-component framework, networking, persistence, progression, player movement, or speculative universal effect graph. Native ES modules, a local Node static server, and built-in Node tests keep the vertical slice easy to run. This is a starting foundation, not a claim that arbitrary future healer mechanics already work through configuration alone.
