# Evidencia — Phase 6 QA Workspace Domain

Fecha: 2026-09-10. Estado: **Accepted — implementación publicada en `main` y CI
completo verde**.

## Entregado

- Artifact schema aditivo 1.2.0 con cinco payloads QA estrictos.
- Subpath portable `@specdd/artifact-model/qa`, workflow declarativo y output schema.
- Resolver del Capability Pack QA real, request/proposal hash-bound y sin ejecución.
- `validates` restringido a diseño QA → Requirement.
- cobertura declarada determinista con gaps por criterio.
- aprobación humana exacta, receipt before/after y replay.
- defectos con reproducción/evidencia y rechazo de autoría agent-proposed.

## Validación local

| Check | Resultado |
|---|---|
| `npm run test:unit -w @specdd/artifact-model` | PASS, 98/98 |
| `npm run test:unit -w specforge-wizard` | PASS, 27/27 |
| `npm run test:unit -w @specdd/specforge-workspace` | PASS, 25/25 |
| `npm run test:phase5` | PASS, 1/1 |
| `npm run build -w specforge-wizard` | PASS; static portal built |
| `npm pack --dry-run -w @specdd/artifact-model` | PASS; QA API, declarations and 3 QA schemas included; nothing published |
| Compatibilidad Artifact 1.0/1.1 y hash publicado | PASS |
| Capability QA generada real, incluido Playwright como conocimiento no ejecutable | PASS |
| Propuestas agent sin resultados/defectos/aprobación | PASS |
| Coverage declarada, relación `validates` y gate exacto | PASS |

La regresión downstream confirma que el generador de capabilities y el workspace BA
aceptado conservan su comportamiento. No se ejecutaron tests del proyecto objetivo
ni se produjo evidencia runtime. No se inició Phase 7.

El build conserva warnings deprecatorios preexistentes de Vite (`esbuildOptions`);
no son fallos de Phase 6 y no se corrigieron fuera de alcance.

## Cierre humano y CI

El usuario autorizó revisar, commitear y pushear exclusivamente Phase 6. El commit
funcional `bfb2914563df8331e37317e810c0fc657773b29c` quedó publicado en `main` y el
run GitHub Actions `34486562001` terminó `success`: 18/18 jobs, incluido
`artifact-model`, dependency audit, SpecForge Workspace UI y browser regression.
Phase 7 y deploy permanecen fuera de alcance y no fueron iniciados.
