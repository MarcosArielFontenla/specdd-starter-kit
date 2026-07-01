---
applyTo: "**/*.ts"
description: TypeScript 5 / ES2022 coding guidance
---

# TypeScript 5 / ES2022 Instructions

## When this applies
When writing or editing `.ts` files targeting TypeScript 5 and ES2022.

## Guidelines
- Enable and respect `strict` mode; do not use `any` to silence a type error — narrow the type or model it properly instead.
- Prefer `unknown` over `any` for values of uncertain shape, and narrow with type guards before use.
- Use ES2022 features where they simplify code: top-level `await` in modules, `Array.prototype.at`, `Object.hasOwn`, and class private fields (`#field`) instead of `_` naming conventions.
- Model domain state with discriminated unions and `interface`/`type` declarations rather than loosely-typed objects with optional fields for every state.
- Prefer `readonly` properties and `as const` for values that should not be mutated after creation.

## Anti-patterns
- Using `any` or non-null assertions (`!`) to bypass the compiler instead of fixing the underlying type.
- Reaching for `@ts-ignore`/`@ts-expect-error` without a comment explaining why it's needed.
- Mixing `require`/CommonJS patterns into an ESM TypeScript codebase.
