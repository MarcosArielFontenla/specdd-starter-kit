---
applyTo: "**/*.{jsx,tsx}"
description: React component and hooks guidance
---

# React Instructions

## When this applies
When writing or editing `.jsx`/`.tsx` React component files.

## Guidelines
- Keep components small and focused; extract logic into custom hooks (`useXyz`) when a component mixes multiple concerns.
- Follow the Rules of Hooks: only call hooks at the top level of a component or custom hook, never inside conditionals, loops, or nested functions.
- Provide a stable, unique `key` (not array index for reorderable lists) when rendering lists with `.map`.
- Manage side effects with `useEffect`/`useLayoutEffect` and always declare the correct dependency array; clean up subscriptions, timers, and listeners in the returned cleanup function.
- Lift state only as high as necessary; prefer colocated state and context for cross-cutting concerns over prop-drilling through many layers.

## Anti-patterns
- Mutating state directly (`state.push(...)`) instead of using the setter with a new reference.
- Using array index as `key` for lists whose items can be reordered, added, or removed.
- Fetching data or subscribing to events directly in the render body instead of inside `useEffect`.
