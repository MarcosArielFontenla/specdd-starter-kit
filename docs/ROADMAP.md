# SPECDDSTARTERKIT — Roadmap enterprise

Mejoras identificadas (2026-07-02) para el horizonte de escalar el kit a nivel empresarial
y adaptarlo a clientes. No están en el alcance de la Iteración 3 (`specdeploy-kit`);
cada una merece su propio ciclo spec → plan → implementación.

## Producto / adopción

1. **Portal unificado ("SpecDD Platform")** — hoy los wizards son sitios Astro separados
   que se levantan por separado. Un shell único con landing + los 3 wizards como rutas
   cambia la percepción de producto, simplifica la demo y el hosting de la herramienta.
2. **Org profiles** — `org-profile.json` por empresa que pre-configure stack, gobernanza,
   MCP tools, naming y branding en los 3 wizards. Es el mecanismo directo de "adaptar el
   kit al cliente": cargar su perfil → wizards con sus defaults. Complementa el modelo de
   providers de `specdeploy-kit`.
3. **Campos huérfanos del wizard specdd** — el modelo declara `personas`, `outcomes`,
   `constraints`, `stack.languages/infra/swagger/a11y`, `security.owaspControls` y
   `featuresSpec`, pero la UI nunca los captura (se generan vacíos; `specs/features-spec.md`
   es inalcanzable desde la UI). Cerrar el gap: agregar UI o podar el modelo.

## Ingeniería / mantenibilidad

4. **Paquete UI compartido (`@specdd/ui`)** — `Stepper.jsx`, `boreal-tokens.css` y
   `wizard.css` son byte-idénticos entre kits (duplicación deliberada según el spec Boreal).
   Con `specdeploy-kit` habrá 3 copias: punto de quiebre para extraer el paquete
   (workspace npm) y des-duplicar también `Layout.astro`, configs y `MCP_SERVERS`.
5. **E2E en CI** — los Playwright e2e de todos los kits existen pero `ci.yml` solo corre
   `test:unit` + `build`. Agregar job e2e (con cache de browsers) al menos en PRs a main.
6. **Config sobre código** — listas hardcodeadas (`MCP_OPTIONS`, `AGENTS`, `PERSONAS`,
   `PERSONA_PROMPTS`, `MCP_SERVERS`, versiones de servers MCP) → mover a archivos de
   config para extenderlas por cliente sin tocar código.

## Enterprise-readiness

7. **Versionado de scaffolds** — todo ZIP generado incluye manifest con versión del kit
   (`specdeploy.json` ya lo hace en It. 3; extender a specdd/specforge) para poder
   diffear/actualizar proyectos ya scaffoldeados.
8. **Threat model del propio kit** — documento corto para el área de seguridad del cliente:
   superficie (todo client-side, sin backend, sin secretos), supply chain (lockfiles, CI),
   y política de contenido generado.
9. **Deploy en vivo (fase 2 de specdeploy)** — botón "deploy ahora" opcional sobre la misma
   base de providers, solo para providers que lo soporten; evaluar costo/beneficio de
   backend + credenciales por cliente.
10. **GitLab CI y script local** en la matriz de `specdeploy-kit`; targets containerizados
    genéricos (K8s / ECS / Cloud Run).
11. **Semántica real de entornos dev/prod** — hoy `envDev` solo agrega `develop` al trigger
    sin un target separado; implementar targets por entorno (jobs de deploy por ambiente) y
    el mecanismo de aprobación de AzP vía `environments` (hoy el approval gate solo se
    documenta en el runbook, no se materializa en el pipeline).
12. **Migración a `cache_policy_id` en CloudFront** — el Terraform de `aws-s3-cloudfront`
    usa el bloque legacy `forwarded_values`; migrar a `cache_policy_id` / origin request
    policies (recomendación actual de AWS).
