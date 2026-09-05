import { Ajv2020 } from 'ajv/dist/2020.js';
import type { Diagnostic } from './types.js';

/** Compile the published contract once; never coerce, remove or default user data. */
export function structuralValidator(schema: object, references: object[] = []): (value: unknown) => Diagnostic[] {
  const ajv = new Ajv2020({ allErrors: true, strict: false, ownProperties: true });
  for (const reference of references) ajv.addSchema(reference);
  const validate = ajv.compile(schema);
  return value => {
    if (validate(value)) return [];
    return (validate.errors ?? []).map(error => ({
      code: 'SCHEMA_CONSTRAINT', severity: 'error',
      path: error.instancePath || '/',
      message: `${error.keyword}: ${error.message ?? 'Invalid structure'} (${JSON.stringify(error.params)})`,
    }));
  };
}
