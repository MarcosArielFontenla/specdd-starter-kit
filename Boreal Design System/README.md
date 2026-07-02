# Boreal — Design System

**Boreal** is a (fictional) premium winter-expedition brand: guided tours to frozen
lakes, ice caves, and snow-locked mountain ranges. The flagship surface is a
**marketing landing page** in the spirit of moody alpine travel sites (reference:
the *Baikal Winter Tour* landing concept on Dribbble). Boreal sells the feeling of
standing on black ice under a glass-clear winter sky — so the brand is **cold,
quiet, and cinematic**, with one warm thread of **ember** light running through it
like a sunrise or a campfire.

> This design system was generated from a **thematic brief only** (winter / snow /
> cold / snowy mountains, Baikal-style). There was **no source codebase or Figma**.
> Everything here — brand name, voice, palette, components — is an original
> construction and is meant to be a starting point you can rename and reshape.

## Reference / sources
- Visual north star: *Baikal Winter Tour Landing Page* — https://dribbble.com/shots/25953831-Baikal-Winter-Tour-Landing-Page (Dribbble blocks programmatic access; the aesthetic was reconstructed from the brief, not copied).
- No GitHub repo, Figma file, or existing codebase was provided.

---

## Brand at a glance
| | |
|---|---|
| **Name** | Boreal |
| **Category** | Winter expedition / adventure travel |
| **Personality** | Calm, expert, cinematic, a little austere — never gimmicky |
| **Default theme** | Dark (alpine night). Light "frost" panels used as accents |
| **Core colors** | Night-navy ground · glacier blue · frost white · **ember** accent |
| **Signature device** | Frosted-glass cards over deep photography + a thin warm ember line |
| **Type** | Bricolage Grotesque (display) · Hanken Grotesk (body) · Space Mono (data) |

---

## CONTENT FUNDAMENTALS — how Boreal writes

Boreal's default voice is **Spanish** (the brand is positioned for a Spanish-speaking
audience), kept short, grounded, and confident. English equivalents are easy to swap
in — copy length and tone should carry across.

- **Tone:** assured and understated, like a seasoned guide. It states facts about the
  cold and the route and lets them do the work. Never hype-y, never exclamation-heavy.
- **Person:** speaks to the traveller as **"tú"** (informal *you*) — "Camina sobre el
  hielo", "Tu expedición empieza aquí". The brand refers to itself as **"nosotros"**
  sparingly.
- **Casing:** Sentence case for almost everything (headlines, buttons, nav). **ALL-CAPS
  only** for short mono eyebrows / data labels (`EXPEDICIÓN 01`, `−24°C`, `53°N`). Never
  all-caps a full sentence.
- **Headlines:** 2–6 words, concrete and physical. "El lago se vuelve cristal."
  "Donde el invierno se detiene." Avoid abstract marketing nouns (soluciones,
  experiencias premium).
- **Body:** 1–2 tight sentences. Specifics over adjectives — name the temperature, the
  distance, the month, the depth of the ice.
- **Numbers & data:** lean into them as texture. Coordinates, temperatures (°C),
  elevation (m), distance (km), duration (days) all rendered in **Space Mono**. This is
  the "expedition log" feel.
- **Eyebrows / labels:** short mono kickers above headings — `RUTA BAIKAL`,
  `TEMPORADA · DIC–MAR`, `DIFICULTAD 3/5`.
- **Buttons:** verb-first, 1–3 words. "Reservar expedición", "Ver rutas", "Descargar
  itinerario". Primary CTA always ember.
- **Emoji:** **none.** The brand never uses emoji. Cold restraint is the point.
- **Punctuation:** middots (·) separate metadata; en-dashes for ranges (DIC–MAR,
  −24°C). Avoid exclamation marks.

**Example voice block**
> `EXPEDICIÓN 01 · BAIKAL`
> **El lago más profundo del mundo, congelado bajo tus pies.**
> Seis días sobre hielo transparente de un metro de espesor. Salidas de diciembre a
> marzo, cuando el Baikal alcanza −24 °C y el agua se vuelve vidrio.
> `[ Reservar expedición ]`   `[ Ver ruta ]`

---

## VISUAL FOUNDATIONS

**Overall vibe.** Cinematic alpine night. Deep, cold, photographic. Generous negative
space (a lot of dark "sky"). Content floats in **frosted-glass panels** with thin,
luminous borders. One warm **ember** accent cuts the blue — used only on the primary
CTA, key numbers, and the occasional sunrise gradient.

**Color.**
- Grounds are near-black **navy** (`--ink-950 / --ink-900`), never pure black — always
  blue-tinted so shadows read cold.
- The blue family runs **glacier-700 → ice-200**; `--glacier-500` is the primary brand
  blue (links, active states, focus rings).
- **Frost whites** (`--frost-50/100`, `--snow`) are for text and light "ice" panels.
- **Ember** (`--ember-500`) is the single warm accent — CTAs, the logo mark, a few
  highlighted numbers. Use it like seasoning: <10% of any screen.
- **Aurora** mint (`--aurora-500`) appears only for positive/success signals and the
  faint aurora glow at the top of dark sections.
- Neutrals are **cool slate** (blue-tinted grays), not neutral gray.

**Type.** Display in **Bricolage Grotesque**, heavy weights (700–800), tight tracking
(`-0.015` to `-0.03em`) for big confident headlines. Body in **Hanken Grotesk** 400–500
at 1.6 line-height. **Space Mono** for eyebrows, labels, and all expedition data
(tabular-nums on). The contrast — expressive display, neutral body, technical mono — is
the typographic signature.

**Backgrounds.** Full-bleed winter **photography** is the hero (frozen lakes, snow
ridgelines, ice caves) with a dark gradient scrim for text legibility. Where there's no
photo, use the brand **atmosphere gradients**: `--grad-night` ground, `--grad-aurora`
glow at the top of a section, `--grad-sunrise` warm wash at the bottom of the hero. Add
a very subtle film **grain/noise** overlay (2–4% opacity) to keep darks from banding.
Real photos should be **cool/desaturated** — blue shadows, white highlights, low warmth
(except a single sunrise shot).

**Frosted glass.** The signature surface: `background: var(--surface-glass)` +
`backdrop-filter: blur(var(--blur-glass))` + a `--border-glass` hairline + a top inset
highlight (`--shadow-inset-hair`). Used for nav, cards, the booking widget, stat chips.

**Borders.** Hairlines, mostly. On dark: `--border` / `--border-soft`. On glass:
`--border-glass` (a frosted light edge). 1px, low contrast. Ember borders only on
hover/active of warm elements.

**Shadows / elevation.** Cool, navy-tinted, never pure black (`--shadow-md/lg/xl`). Two
special glows: `--shadow-frost` (glacier-blue glow under elevated glass) and
`--shadow-ember` (warm glow under the primary CTA). Light "ice" panels use soft
`--shadow-md`.

**Radii.** Crisp but soft. Cards `--radius-lg` (22px), inputs/buttons `--radius-md`
(16px) or `--radius-pill` for the primary CTA and chips. Big feature panels
`--radius-xl` (32px). Nothing sharp-cornered; nothing fully rounded except pills.

**Corner / shape language.** Pills for CTAs, filter chips, and tags. Rounded rectangles
for cards. Thin vertical "ice shard" dividers and the six-point logo crystal are the
only decorative geometry — no blobs, no organic shapes.

**Layout rules.** 12-column grid, ~1200–1280px max content width, generous gutters.
A **fixed frosted nav** floats at the top with inset margins (a "pill" nav, not edge-to-
edge). Hero is full-viewport. Sections breathe — `--space-9/10` vertical rhythm. Data
chips and eyebrows are left-aligned; big headlines can be left or centered.

**Transparency & blur.** Used deliberately for the "frost" metaphor — glass nav, glass
cards, glass booking bar. Blur is `--blur-glass` (18px) normally, `--blur-heavy` (30px)
for full overlays/modals. Don't blur where there's nothing meaningful behind it.

**Motion.** Restrained and smooth — cold air, not bouncy. Default `--ease-out`
(`cubic-bezier(0.16,1,0.3,1)`), `--dur-base` 240ms. Entrances: fade + 12–16px rise.
Parallax on hero photography (slow). Hover lifts are small (−2 to −4px). **No** bounce,
no spring overshoot, no confetti.

**Hover states.** Buttons/cards lift slightly and brighten (`+ shadow`, border goes from
soft→glass). Ember CTA brightens to `--ember-400` and grows its glow. Links go
`--glacier-300`. Glass cards raise blur/opacity a touch.

**Press states.** Scale down to ~0.98 and drop the shadow; ember CTA darkens to
`--ember-600`. Quick (`--dur-fast`).

**Focus.** 2px `--glacier-500` ring with 2px offset on dark; never remove outlines.

**Cards.** Frosted glass fill, `--radius-lg`, `--border-glass` hairline, `--shadow-lg`
+ optional `--shadow-frost`, a top inset highlight. Often carry a mono eyebrow, a big
display number/price, and a thin ember underline on the active/featured one.

---

## ICONOGRAPHY

- **System:** **Lucide** (https://lucide.dev), loaded from CDN
  (`https://unpkg.com/lucide@latest`). Chosen for its thin, even **1.75–2px stroke**,
  rounded line-caps, and a strong cold-weather vocabulary: `snowflake`, `mountain`,
  `mountain-snow`, `thermometer-snowflake`, `wind`, `compass`, `map-pin`, `tent`,
  `route`, `calendar`, `sunrise`, `waves`, `footprints`. The thin stroke matches the
  brand's hairline borders.
- **SUBSTITUTION FLAG:** there was no existing icon set to inherit, so Lucide is a
  chosen substitute. If you have a preferred set (e.g. Phosphor thin), swap the CDN and
  keep stroke weight ~1.75–2px.
- **Sizing:** 16 / 20 / 24px on a 4px grid. Stroke stays visually ~1.75px. Color
  inherits text (`currentColor`) — usually `--fg2` / `--glacier-300`, ember only for
  warm/active.
- **No emoji**, ever. **No multicolor/filled** icon styles — line icons only.
- **Unicode as texture:** the middot `·`, en-dash `–`, degree `°`, and arrows
  `→ ↗` are used inline as typographic marks (not as iconography).
- **Brand mark:** a six-point **ice crystal / compass star** (`assets/logo-boreal-mark.svg`)
  — ember spokes with glacier-blue frost tips. The full wordmark is
  `assets/logo-boreal.svg`. These are the only bespoke vector marks; everything else is
  Lucide.

---

## INDEX — what's in this system

**Root**
- `README.md` — this file (context, voice, visual foundations, iconography, index).
- `colors_and_type.css` — all design tokens: colors, gradients, type scale, spacing,
  radii, elevation, motion + semantic helper classes (`.b-hero`, `.b-eyebrow`, …).
- `SKILL.md` — Agent-Skill manifest for reusing Boreal in Claude Code.

**fonts/**
- `fonts.css` — Google Fonts import (Bricolage Grotesque, Hanken Grotesk, Space Mono).

**assets/**
- `logo-boreal.svg` — full wordmark (light, for dark backgrounds).
- `logo-boreal-mark.svg` — standalone ice-crystal mark.

**preview/** — design-system reference cards (rendered in the Design System tab).
Colors, type specimens, spacing/radii/elevation, and component states.

**ui_kits/landing/** — the Boreal marketing site UI kit.
- `index.html` — assembled, interactive landing page.
- `README.md` — kit notes + component list.
- JSX components: Nav, Hero, StatBar, TourCard, ItineraryTimeline, Testimonial,
  BookingBar, Footer, plus primitives (Button, Chip, GlassCard, Eyebrow).

---

## Caveats
- Brand, name, and all copy are invented from the thematic brief — rename/retone freely.
- Fonts load from **Google Fonts CDN** (substitution-friendly, not bundled offline).
- Icons use **Lucide via CDN** as a chosen substitute (no source set existed).
- **Imagery is placeholder** — the kit uses brand atmosphere gradients + drop-in image
  slots. Provide real cool-toned winter photography to finish it.
