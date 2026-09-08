import base from '../schema/artifact.schema.json' with { type: 'json' };
import ba from '../schema/ba-content.schema.json' with { type: 'json' };

/** Self-contained additive schema. Original 1.0.0 schema and record hashes stay unchanged. */
export const artifactSchemaV11 = {
  ...base,
  $id: 'https://specdd.dev/schemas/artifact/1.1.0',
  properties: {...base.properties, schemaVersion: {const: '1.1.0'},
    type: {enum: [...base.properties.type.enum, 'business-rule', 'impact-analysis']}},
  $defs: {...base.$defs, ...ba.$defs},
  allOf: [...base.allOf,
    {if: {properties: {type: {const: 'business-rule'}}}, then: {properties: {content: {$ref: '#/$defs/businessRule'}}}},
    {if: {properties: {type: {const: 'impact-analysis'}}}, then: {properties: {content: {$ref: '#/$defs/impactAnalysis'}}}},
  ],
};
