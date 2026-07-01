---
applyTo: "**/*.cs"
description: ASP.NET Core REST API guidance
---

# ASP.NET REST APIs Instructions

## When this applies
When writing or editing `.cs` files that implement ASP.NET Core Web API controllers, minimal APIs, or related services.

## Guidelines
- Use minimal APIs or thin controllers that delegate to injected services; keep request/response mapping separate from business logic.
- Return the correct HTTP status codes and use `ActionResult<T>`/`Results<T>` typed returns instead of always returning `200 OK` with an error payload embedded.
- Validate input models with data annotations or FluentValidation, and rely on `[ApiController]`'s automatic model-state validation rather than manual null checks scattered through actions.
- Use dependency injection (constructor injection) for services, `DbContext`, and `HttpClient` (via `IHttpClientFactory`) rather than static singletons or `new`-ing them up.
- Use async/await end-to-end for I/O-bound operations (`await _db.SaveChangesAsync()`), and avoid blocking calls like `.Result` or `.Wait()` that can cause deadlocks.

## Anti-patterns
- Blocking on async code with `.Result` or `.Wait()` in a request-handling path.
- Returning `200 OK` for error conditions instead of the appropriate 4xx/5xx status code.
- Instantiating `HttpClient` directly per request instead of using `IHttpClientFactory`.
