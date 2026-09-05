# `@specdd/warp-adapter`

Side-effect-free compiler from canonical `SpecDDControlPlane` `1.0.0` definitions to
Warp Factory `v1alpha1` definition files.

The package emits `factory.yaml`, one generated Warp foreman, canonical role agents,
explicitly bound disabled automations, and a structured fidelity report. It does not
call Warp, provision environments, enable triggers, run agents, create pull requests,
or translate canonical evals into Warp scorers.

The initial event surface is deliberately limited to an explicit GitHub
`issue_created` binding. Filters, schedules, and other providers/events are deferred.

```ts
import { compileWarpFactory } from '@specdd/warp-adapter';

const result = compileWarpFactory(controlPlaneDefinition, warpAdapterConfig);
if (!result.valid) throw new Error(JSON.stringify(result.diagnostics));

// Persist result.files only through an explicitly chosen caller workflow.
// Review result.reportMarkdown before applying the definition to Warp.
```

Warp-specific repository, execution, stage, runner, environment, and trigger bindings
belong in `SpecDDWarpAdapterConfig`; they never mutate the canonical definition.
