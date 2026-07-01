---
applyTo: "**/*.{jsx,tsx}"
description: Next.js app/page and rendering guidance
---

# Next.js Instructions

## When this applies
When writing or editing `.jsx`/`.tsx` files in a Next.js application (App Router or Pages Router).

## Guidelines
- Default to Server Components in the App Router; only add `"use client"` to components that need interactivity, browser APIs, or state.
- Fetch data on the server (route handlers, server components, `getServerSideProps`/`getStaticProps`) rather than calling APIs from the client for initial page data.
- Use the built-in `<Image>` and `<Link>` components instead of raw `<img>`/`<a>` tags to get automatic optimization, prefetching, and lazy loading.
- Choose the correct rendering/caching strategy per route (static, ISR, or dynamic) based on how often the data changes, and set `revalidate`/cache options explicitly rather than relying on defaults.
- Keep secrets and server-only logic out of client components; only expose environment variables prefixed for the client (`NEXT_PUBLIC_*`) when they are truly public.

## Anti-patterns
- Marking every component `"use client"` by default, losing server-rendering benefits.
- Calling `fetch` for initial page data from inside a client-side `useEffect` when it could be fetched on the server.
- Leaking server-only environment variables into client bundles.
