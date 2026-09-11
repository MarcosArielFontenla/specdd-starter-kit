import {readFile} from 'node:fs/promises';
import {generatePack} from '../../../specforge-kit/website/src/components/generators.js';
import {ROLE_SKILLS} from '../../../specforge-kit/website/src/components/roles.js';

export async function demoBundle() {
  const project=JSON.parse(await readFile(new URL('../../project-model/examples/minimal.project.json',import.meta.url),'utf8'));
  project.metadata.id='ba-synthetic-pilot';project.metadata.name='Piloto BA — sintético';
  project.project.description='Proyecto sintético de aprendizaje. Pedido: permitir cancelar un turno. Actores, plazos y reglas aún deben aclararse; no representa reglas aprobadas de Bloom.';
  const names=[...new Set([...ROLE_SKILLS.BA,...ROLE_SKILLS.QA])];
  const skills=Object.fromEntries(await Promise.all(names.map(async name=>[name,await readFile(new URL(`../../../specforge-kit/skills/${name}.md`,import.meta.url),'utf8')])));
  const {files}=generatePack(skills,{roles:['BA','QA'],tools:['Codex'],skillsByRole:{BA:ROLE_SKILLS.BA,QA:ROLE_SKILLS.QA},qa:{approach:'mixed'}},'2026-09-10');
  const source='.agents/capabilities/role-ba/capability.json',pack=JSON.parse(files[source]);
  const qaSource='.agents/capabilities/role-qa/capability.json',qaPack=JSON.parse(files[qaSource]);
  project.capabilities=[{id:pack.metadata.id,source,version:pack.metadata.version,enabled:true},{id:qaPack.metadata.id,source:qaSource,version:qaPack.metadata.version,enabled:true}];
  files['context/project.md']=project.project.description;
  files['context/constitution.md']='Contexto sintético del piloto. No inventar decisiones. Preguntar ante ambigüedad. No implementar, publicar ni cambiar repositorios.';
  const dependency={id:'specdd-harness',kind:'harness',versionRange:'^1.0.0'};
  return {project,capability:{pack,files,dependencies:[dependency]},qaCapability:{pack:qaPack,files,dependencies:[dependency]}};
}
