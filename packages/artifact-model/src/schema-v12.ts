import { artifactSchemaV11 } from './schema-v11.js';
import qa from '../schema/qa-content.schema.json' with { type: 'json' };

/** Self-contained additive QA schema. Earlier schemas and record hashes remain unchanged. */
export const artifactSchemaV12 = {
  ...artifactSchemaV11,
  $id: 'https://specdd.dev/schemas/artifact/1.2.0',
  properties: {...artifactSchemaV11.properties, schemaVersion: {const: '1.2.0'},
    type: {enum: [...artifactSchemaV11.properties.type.enum, 'test-scenario', 'test-case', 'coverage-assessment', 'quality-risk', 'defect']}},
  $defs: {...artifactSchemaV11.$defs, ...qa.$defs,
    relationship: {...artifactSchemaV11.$defs.relationship,
      properties: {...artifactSchemaV11.$defs.relationship.properties,
        kind: {enum: ['depends-on', 'derives-from', 'validates', 'relates-to']}}}},
  allOf: [...artifactSchemaV11.allOf,
    {if:{properties:{type:{const:'test-scenario'}}},then:{properties:{content:{$ref:'#/$defs/testScenario'}}}},
    {if:{properties:{type:{const:'test-case'}}},then:{properties:{content:{$ref:'#/$defs/testCase'}}}},
    {if:{properties:{type:{const:'coverage-assessment'}}},then:{properties:{content:{$ref:'#/$defs/coverageAssessment'}}}},
    {if:{properties:{type:{const:'quality-risk'}}},then:{properties:{content:{$ref:'#/$defs/qualityRisk'}}}},
    {if:{properties:{type:{const:'defect'}}},then:{properties:{content:{$ref:'#/$defs/defect'}}}},
  ],
};
