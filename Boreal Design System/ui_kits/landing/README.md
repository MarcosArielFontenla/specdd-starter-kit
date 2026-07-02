# Boreal — Landing UI Kit

A hi-fi, interactive recreation of the **Boreal** winter-expedition marketing site.
This is the canonical assembled view of the product. Open `index.html`.

## Run
Open `index.html` directly. It loads React 18 + Babel standalone (inline JSX),
Lucide icons (CDN), the brand tokens (`../../colors_and_type.css`), fonts
(`../../fonts/fonts.css`) and the kit styles (`styles.css`).

## What's interactive
- **Filter chips** on the tours section (Todas / Lagos / Cuevas / Montaña) filter the grid live.
- **Reservar** buttons (nav, hero, tour cards, booking band) open a **booking modal**
  with a fake submit → success state.
- Hover states on buttons, chips and tour cards; anchor nav scrolls to sections.

## Files / components
| File | Components |
|---|---|
| `primitives.jsx` | `Eyebrow`, `Button` (primary/secondary/ghost), `Chip`, `Icon` (Lucide), `Reveal` |
| `sections-top.jsx` | `Nav` (frosted pill), `Hero` (atmosphere bg + eyebrow + display headline) |
| `sections-main.jsx` | `StatBar`, `Tours` + `TourCard`, `Itinerary`, `Testimonials`, `Booking`, `Footer` + data |
| `app.jsx` | `App` shell, `BookingModal`, reveal driver, Lucide re-render |
| `styles.css` | all component CSS (built on the root token file) |
| `index.html` | assembles everything |

## Notes & deliberate gaps
- **Imagery is placeholder.** Tour "photos", the hero, and the booking band use brand
  atmosphere gradients (`--grad-glacier` + `--grad-aurora` + `--grad-sunrise`). Drop in
  real cool-toned winter photography (frozen lakes, ice caves, snowy ridgelines) where
  these gradients sit — that's the single biggest upgrade.
- Entrance reveals are driven once on mount (kept simple/reliable over scroll-triggered).
- Copy is **Spanish** by default (see root README → Content Fundamentals). Swap to
  English without layout changes.
- This is a cosmetic recreation: forms don't submit anywhere, auth is faked.
