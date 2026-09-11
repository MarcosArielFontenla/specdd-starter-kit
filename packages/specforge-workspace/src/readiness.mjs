import {artifactSubject} from '@specdd/artifact-model';

const causalKinds=new Set(['depends-on','derives-from','refines','blocks']);
const currentRef=async artifact=>({
  projectId:artifact.projectRef.id,
  artifactId:artifact.id,
  revision:artifact.revision,
  sha256:await artifactSubject(artifact)
});

export async function derivePMReadModel({artifacts,graph,approvals,qaApprovals,canonicalSpecs}) {
  const refs=new Map(await Promise.all(artifacts.map(async artifact=>[artifact.id,await currentRef(artifact)])));
  const validBA=new Set(approvals.filter(receipt=>receipt.valid).map(receipt=>receipt.targetId));
  const validQA=new Set(qaApprovals.filter(receipt=>receipt.valid).map(receipt=>receipt.targetId));
  const requirements=artifacts.filter(artifact=>artifact.type==='requirement');
  const openQuestions=artifacts.filter(artifact=>artifact.type==='open-question'&&!artifact.content.resolution);
  const risks=artifacts.filter(artifact=>artifact.type==='quality-risk');
  const defects=artifacts.filter(artifact=>artifact.type==='defect');
  const pendingApprovals=artifacts.filter(artifact=>artifact.status==='under-review'||
    (['approved','active'].includes(artifact.status)&&!(artifact.ownerRole==='qa'?validQA:validBA).has(artifact.id)));
  const dependencies=(graph?.edges??[]).filter(edge=>causalKinds.has(edge.kind)).map(edge=>({
    id:edge.id,kind:edge.kind,from:refs.get(edge.from),to:refs.get(edge.to)
  }));
  const features=[];
  for(const requirement of requirements){
    const related=artifacts.filter(artifact=>artifact.ownerRole==='qa'&&artifact.relationships?.some(link=>link.target.artifactId===requirement.id));
    const coverages=related.filter(artifact=>artifact.type==='coverage-assessment').sort((a,b)=>a.updatedAt.localeCompare(b.updatedAt));
    const coverage=coverages.at(-1)??null,blockers=graph?.blockers?.[requirement.id]??{questions:[],declaredBlocks:[],truncated:false};
    const canonical=canonicalSpecs.filter(spec=>spec.source.artifact.artifactId===requirement.id).sort((a,b)=>a.revision-b.revision).at(-1)??null;
    const coverageComplete=Boolean(coverage&&coverage.content.entries.length===requirement.content.acceptanceCriteria.length&&coverage.content.entries.every(entry=>entry.testCaseRefs.length));
    const explicitlyBlocked=Boolean(blockers.questions.length||blockers.declaredBlocks.length||blockers.truncated);
    const status=explicitlyBlocked?'blocked':!coverage?'unknown':'partial';
    const reasons=[];
    if(explicitlyBlocked)reasons.push('EXPLICIT_BLOCKERS');
    if(!['approved','active'].includes(requirement.status)||!validBA.has(requirement.id))reasons.push('REQUIREMENT_APPROVAL_NOT_CURRENT');
    if(!canonical)reasons.push('CANONICAL_SPEC_MISSING');
    if(!coverage)reasons.push('QA_COVERAGE_UNKNOWN');
    else {
      if(!coverageComplete)reasons.push('QA_COVERAGE_PARTIAL');
      if(!validQA.has(coverage.id))reasons.push('QA_COVERAGE_APPROVAL_NOT_CURRENT');
      reasons.push('EXECUTION_EVIDENCE_UNKNOWN');
    }
    if(related.some(artifact=>artifact.type==='defect'&&!['superseded'].includes(artifact.status)))reasons.push('DEFECTS_RECORDED');
    features.push({
      title:requirement.title,status,reasons:[...new Set(reasons)],requirement:refs.get(requirement.id),
      canonicalSpec:canonical?{path:canonical.path,revision:canonical.revision,contentSha256:canonical.contentSha256}:null,
      blockers:{questions:blockers.questions.map(item=>refs.get(item.artifactId)),declaredBlocks:blockers.declaredBlocks.map(edge=>edge.id),truncated:blockers.truncated},
      qa:{coverage:coverage?refs.get(coverage.id):null,coverageScope:coverage?.content.scope??null,coverageApproved:Boolean(coverage&&validQA.has(coverage.id)),criteria:requirement.content.acceptanceCriteria.length,
        coveredCriteria:coverage?.content.entries.filter(entry=>entry.testCaseRefs.length).length??0,scenarios:related.filter(a=>a.type==='test-scenario').length,testCases:related.filter(a=>a.type==='test-case').length,defects:related.filter(a=>a.type==='defect').length},
      evidence:[refs.get(requirement.id),...related.map(artifact=>refs.get(artifact.id))]
    });
  }
  const status=features.some(feature=>feature.status==='blocked')?'blocked':!features.length||features.every(feature=>feature.status==='unknown')?'unknown':'partial';
  const reasons=[];
  if(!features.length)reasons.push('NO_FEATURES');
  if(features.some(feature=>feature.status==='blocked'))reasons.push('EXPLICIT_BLOCKERS');
  if(openQuestions.length)reasons.push('OPEN_QUESTIONS');
  if(pendingApprovals.length)reasons.push('PENDING_APPROVALS');
  if(risks.length)reasons.push('RISKS_RECORDED');
  if(defects.length)reasons.push('DEFECTS_RECORDED');
  if(features.length)reasons.push('EXECUTION_EVIDENCE_UNKNOWN');
  return {
    schemaVersion:'1.0.0',kind:'SpecForgePMReadModel',status,reasons:[...new Set(reasons)],
    semantics:{unknown:'No hay evidencia suficiente para evaluar readiness.',partial:'Hay evidencia de diseño, pero faltan señales necesarias; no implica release ready.',blocked:'Existe al menos un bloqueo explícito en el grafo.',executionEvidence:'unknown'},
    summary:{features:features.length,openQuestions:openQuestions.length,blockedFeatures:features.filter(feature=>feature.status==='blocked').length,pendingApprovals:pendingApprovals.length,risks:risks.length,defects:defects.length},
    features,openQuestions:openQuestions.map(artifact=>({title:artifact.title,artifact:refs.get(artifact.id),blocking:artifact.content.blocking})),
    pendingApprovals:pendingApprovals.map(artifact=>({title:artifact.title,type:artifact.type,status:artifact.status,artifact:refs.get(artifact.id)})),
    risks:risks.map(artifact=>({title:artifact.title,impact:artifact.content.impact,likelihood:artifact.content.likelihood,status:artifact.status,artifact:refs.get(artifact.id)})),
    defects:defects.map(artifact=>({title:artifact.title,severity:artifact.content.severity,status:artifact.status,artifact:refs.get(artifact.id)})),dependencies
  };
}
