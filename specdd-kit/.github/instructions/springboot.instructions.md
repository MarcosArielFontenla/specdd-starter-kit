---
applyTo: "**/*.java"
description: Spring Boot service and REST API guidance
---

# Spring Boot Instructions

## When this applies
When writing or editing `.java` files in a Spring Boot application (controllers, services, repositories, configuration).

## Guidelines
- Keep `@RestController` classes thin; put business logic in `@Service` classes and data access in `@Repository`/Spring Data interfaces.
- Use constructor injection (`final` fields with a constructor, or `@RequiredArgsConstructor` via Lombok) instead of field injection (`@Autowired` on fields), for testability and immutability.
- Validate request bodies with `jakarta.validation` annotations (`@Valid`, `@NotNull`, `@Size`) on DTOs rather than manual null/empty checks in the controller.
- Use `ResponseEntity<T>` (or `@ResponseStatus`) to return explicit, correct HTTP status codes instead of always returning `200`.
- Externalize configuration via `application.yml`/`application.properties` and `@ConfigurationProperties`, and never hardcode connection strings, credentials, or environment-specific values in code.

## Anti-patterns
- Field injection (`@Autowired` directly on instance fields) instead of constructor injection.
- Putting JPA/database queries or business rules directly inside a `@RestController` method.
- Catching broad `Exception` and swallowing it without logging or rethrowing a meaningful error.
