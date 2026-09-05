# Operación local O4-C2-B1 — preflight GitHub read-only

Fecha: 2026-09-05. Estado: **completo; apto para preparación local, no autoriza publicación**.

Repositorio autorizado: `MarcosArielFontenla/bloom-appointments-app`.

## Observaciones verificadas

- GitHub CLI absoluto: `C:\Program Files\GitHub CLI\gh.exe`.
- Git absoluto: `C:\Program Files\Git\cmd\git.exe`.
- Cuenta autenticada: `MarcosArielFontenla`.
- Repositorio exacto: privado, activo/no archivado, permiso del viewer `ADMIN`.
- Rama por defecto y base real: `master`.
- HEAD remoto: `60558d82a52f1e324037fa6e8c2a25295bd6654a` (`commit`).
- GitHub API y `git ls-remote` devolvieron exactamente el mismo SHA.
- No existen ramas bajo `refs/heads/codex/speccontrol/`.
- No existen PRs abiertas, cerradas o merged cuyo head empiece con
  `codex/speccontrol/` entre las primeras 100 consultadas.
- La metadata de `master` informa `protected: false` y status checks desactivados.
- La API de repository rulesets respondió `403`: GitHub indicó que esa función
  requiere GitHub Pro o que el repositorio sea público. Esto limita la inspección de
  rulesets, pero no contradice la metadata de protección disponible ni autoriza a
  asumir políticas que GitHub no expuso.

## Estado local y consecuencia

No existe todavía un clone local de Bloom en `D:\AgenticProjects`. El journal O3
preservado en `C:\Users\tecno.pc\AppData\Local\SpecDD\o3-acceptance` pertenece al
proyecto `o3-fixture` dentro de SPECDDSTARTERKIT. Su intento 4 está completo, pero
sus hashes, diff y evidencia no corresponden a Bloom y no pueden reutilizarse para
publicarlo. Este rechazo por identidad es deliberado.

Antes de una prueba de publicación real se necesita:

1. crear una copia local explícita de Bloom;
2. inspeccionarla sin ejecutar servicios externos;
3. elegir una tarea pequeña y checks seguros;
4. completar un run O2/O3 nuevo, ligado a ese root y al SHA de `master` observado;
5. preparar y aprobar el subject O4 exacto;
6. pedir autorización final antes del primer push/draft PR.

## Efectos

Sólo se hicieron consultas autenticadas de lectura con GitHub CLI/API y
`git ls-remote`. No se clonó, creó o modificó ninguna rama, commit, PR, regla,
archivo remoto o configuración de autenticación.
