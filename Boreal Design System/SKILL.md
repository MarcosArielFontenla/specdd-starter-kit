---
name: boreal-design
description: Use this skill to generate well-branded interfaces and assets for Boreal, a winter-expedition travel brand (frozen lakes, ice caves, snowy mountains), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

Boreal is a cinematic, cold, premium winter-tour brand: deep night-navy grounds,
glacier blues, frost whites, a single warm ember accent, frosted-glass surfaces, and a
technical "expedition log" data style in mono. Default copy voice is Spanish, informal
"tú", no emoji, restrained.

Key files:
- `README.md` — brand context, content/voice rules, full visual foundations, iconography.
- `colors_and_type.css` — all tokens (colors, gradients, type scale, spacing, radii,
  elevation, motion) + helper classes. Always build on these; do not invent new colors.
- `fonts/fonts.css` — Bricolage Grotesque (display), Hanken Grotesk (body), Space Mono (data).
- `assets/` — logo wordmark + ice-crystal mark.
- `preview/` — reference cards for every token group.
- `ui_kits/landing/` — interactive landing-page recreation with reusable JSX components.

Icons: Lucide via CDN (thin stroke). No emoji. Imagery: cool-toned winter photography;
where none exists, use the brand atmosphere gradients.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out
and create static HTML files for the user to view. If working on production code, you can
copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to
build or design, ask some questions, and act as an expert designer who outputs HTML
artifacts _or_ production code, depending on the need.
