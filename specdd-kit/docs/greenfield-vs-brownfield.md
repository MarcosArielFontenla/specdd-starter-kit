# Greenfield vs. Brownfield

SDD works on both a brand-new project and an existing codebase, but the on-ramp is
different. This kit does not require a full rewrite or a big-bang migration either
way.

## Greenfield (new project)

Starting from nothing is the easiest case:

1. Run the wizard and complete every step — Project, Tech Stack, Principles, MCP,
   Agent, Security. There's no existing code to reconcile against, so your answers
   *are* the initial context.
2. Run `/specdd-constitution`, then `/specdd-specify` on your very first feature
   (often "project scaffolding" or "hello world" itself, if you want a spec even
   for that).
3. Every subsequent feature follows the full loop from day one:
   constitution (already set) → specify → plan → tasks → implement.
4. `context/tech-stack.md` stays accurate almost for free, since you're choosing
   the stack as you go — update it the moment you add a real dependency, not after
   the fact.

There is no legacy code to describe, so `context/project.md` and
`context/tech-stack.md` can be short and will still be complete.

## Brownfield (existing codebase)

Retrofitting SDD onto a codebase that already has months or years of history takes
more care, because the "shared understanding" in `context/` has to actually match
reality, and you can't spec everything retroactively.

1. **Write `context/tech-stack.md` from what's actually there**, not what you wish
   were there. Run through the file's own Definition of Done: every tool a plan
   might reference should be listed with its actual command, versions should be
   concrete, and conventions should reflect what the codebase does today, warts
   included.
2. **Run `/specdd-analyze` before your first spec**, not after. It checks for gaps
   between the current codebase and a spec/plan — useful here to surface
   undocumented behavior, dead code paths, or conventions that don't match what
   `context/tech-stack.md` claims, before you plan against a wrong picture.
3. **Don't write specs for existing, stable code retroactively.** Specs describe
   intent for *changes*; a spec for code nobody is touching produces no value and
   goes stale immediately. Start writing specs the moment a feature is touched,
   not before.
4. **Expand incrementally, module by module.** Pick the next module or feature
   area that's about to be worked on anyway, and give that its first
   `spec.md`/`plan.md`/`tasks.md` when the work starts. Over a few months, the
   actively-maintained parts of the codebase accumulate specs; the untouched parts
   simply stay as they are until someone needs to change them.
5. **Use `/specdd-adr` for past decisions that matter going forward.** If there's
   a significant existing architectural choice that a new contributor would
   otherwise have to reverse-engineer from code, capture it as an ADR once you
   understand it — don't block on documenting everything historical.
6. **Constitution first, but scoped to what's enforceable.** A brownfield
   constitution should state principles the team can actually hold new code to
   (e.g. "new endpoints get tests," "no new `any` types") rather than principles
   that would require rewriting existing code to satisfy.

## Choosing where to start on a brownfield codebase

Prefer, in order:
1. The next feature already on the roadmap (lowest friction — you were doing this
   work anyway).
2. A module with active bugs or unclear behavior (SDD's clarify/analyze steps pay
   off fastest here).
3. A module new team members touch often (a written spec becomes onboarding
   material for free).

Avoid starting with the largest, most stable, least-touched module — it's the
most expensive to spec accurately and the least likely to need one soon.
