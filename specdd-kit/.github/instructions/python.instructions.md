---
applyTo: "**/*.py"
description: Python coding guidance
---

# Python Instructions

## When this applies
When writing or editing `.py` files.

## Guidelines
- Follow PEP 8 style and use type hints (`def f(x: int) -> str:`) on public functions so callers and tooling (mypy/pyright) can catch mismatches.
- Use context managers (`with open(...) as f:`) for files, sockets, locks, and database connections so resources are always released, including on exceptions.
- Prefer f-strings for string formatting over `%`-formatting or `.format()` for readability and performance.
- Catch specific exceptions (`except ValueError:`) rather than bare `except:`, and re-raise or log unexpected ones instead of silently swallowing them.
- Use `dataclasses` or `pydantic` models to represent structured data instead of passing around loosely-typed dicts with implicit keys.

## Anti-patterns
- Using a bare `except:` (or `except Exception: pass`) that hides real errors.
- Using mutable default arguments (`def f(items=[]):`), which persist state across calls unexpectedly.
- Manually opening files/connections without a `with` block or explicit `close()` in a `finally`.
