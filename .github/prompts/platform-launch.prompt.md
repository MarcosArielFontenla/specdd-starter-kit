---
agent: agent
description: Launch the SpecDD Platform portal (root install, dev server on 4320, open browser)
---

# /platform-launch

Launch the **SpecDD Platform** portal locally (landing + the three wizards).

1. Verify Node.js 20+ is installed (`node --version`).
2. From the repo root, install everything once: `npm install`.
3. Start the portal: `npm run dev -w specdd-platform` (its predev bundles the three kits' data).
4. Open `http://localhost:4320` in Microsoft Edge.
5. Report the final URL, or surface any errors verbatim (do not hide failures).
