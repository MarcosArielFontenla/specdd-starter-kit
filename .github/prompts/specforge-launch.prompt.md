---
agent: agent
description: Launch the specforge-kit wizard (install deps, bundle skills, dev server, open browser)
---

# /specforge-launch

Launch the **specforge-kit** wizard locally.

1. Verify Node.js 20+ is installed (`node --version`).
2. Change to `specforge-kit/website`.
3. Install dependencies: `npm install`.
4. Bundle the skills: `npm run bundle-skills`.
5. Start the dev server: `npm run dev`.
6. Open the printed Astro URL (default `http://localhost:4322`) in Microsoft Edge.
7. Report the final URL, or surface any errors verbatim (do not hide failures).
