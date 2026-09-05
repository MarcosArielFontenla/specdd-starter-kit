# `@specdd/project-model`

Runtime-neutral canonical Project Definition for SpecDD.

The package owns:

- schema version `1.0.0` and its TypeScript contracts;
- layered structural and semantic validation with stable diagnostics;
- construction from the current SpecDD wizard model;
- projection to the existing Harness v1 generator input;
- explicit migration from scaffold manifest schema 1 and 2.

It does not own graph execution, agent runtimes, Warp configuration, deployment provider knowledge, or run history.

## Usage

```js
import {
  createProjectDefinitionFromWizardInput,
  validateProjectDefinition,
} from '@specdd/project-model';

const definition = createProjectDefinitionFromWizardInput(wizardInput);
const result = validateProjectDefinition(definition);
if (!result.valid) console.error(result.diagnostics);
```

The serialized schema is exported as `@specdd/project-model/schema`. Examples live in `examples/`.

## Contract boundaries

- `context/project-definition.json` is portable project intent and is expected to evolve with deliberate schema migrations.
- `context/scaffold-manifest.json` is the receipt for one generation operation.
- Brownfield analyzer evidence, destination paths, and legacy acknowledgement are compilation context, not canonical intent.
- Namespaced extensions use `namespace/key`; top-level ad-hoc properties are invalid.
