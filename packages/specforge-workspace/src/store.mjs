import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,realpathSync,lstatSync} from 'node:fs';
import {resolve,dirname,basename,parse} from 'node:path';
import {randomUUID} from 'node:crypto';
import {canonicalJson,fingerprint} from '@specdd/artifact-model';
import {copy,exact,fail,id,validateState} from './state.mjs';

export class WorkspaceStore {
  #db; #lease = randomUUID(); #closed=false;
  constructor(filename) {
    const absolute = resolve(filename), directory=dirname(absolute);
    if (directory===parse(directory).root) fail('DEDICATED_STATE_REQUIRED');
    mkdirSync(directory,{recursive:true});
    this.path=resolve(realpathSync(directory),basename(absolute));
    try { if (lstatSync(this.path).isSymbolicLink()) fail('STATE_SYMLINK'); } catch(e) { if(e.code!=='ENOENT') throw e; }
    this.#db = new DatabaseSync(this.path);
    try {
      const version=Number(this.#db.prepare('PRAGMA user_version').get().user_version);
      if (![0,1].includes(version)) fail('STORE_VERSION');
      if (version===0 && this.#db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().length) fail('UNKNOWN_STORE');
      this.#db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=2000;
        CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY, version INTEGER NOT NULL, hash TEXT NOT NULL, state TEXT NOT NULL) STRICT;
        CREATE TABLE IF NOT EXISTS history(project_id TEXT NOT NULL, version INTEGER NOT NULL, hash TEXT NOT NULL, previous TEXT, event TEXT NOT NULL, state TEXT NOT NULL, PRIMARY KEY(project_id,version)) STRICT;
        CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY, project_id TEXT NOT NULL, status TEXT NOT NULL, hash TEXT NOT NULL, record TEXT NOT NULL) STRICT;
        CREATE UNIQUE INDEX IF NOT EXISTS one_running ON runs(project_id) WHERE status='running';
        CREATE TABLE IF NOT EXISTS lease(singleton INTEGER PRIMARY KEY CHECK(singleton=1), pid INTEGER NOT NULL, token TEXT NOT NULL) STRICT;
        PRAGMA user_version=1;`);
      this.#db.exec('BEGIN IMMEDIATE');
      try {
        const owner=this.#db.prepare('SELECT * FROM lease').get();
        if(owner) { let alive=true; try{process.kill(Number(owner.pid),0);}catch(e){if(e.code==='ESRCH')alive=false;} if(alive) fail('STORE_IN_USE'); }
        this.#db.prepare('INSERT OR REPLACE INTO lease VALUES (1,?,?)').run(process.pid,this.#lease);
        this.#db.exec('COMMIT');
      } catch(e) {this.#db.exec('ROLLBACK');throw e;}
    } catch(e) {this.#db.close();throw e;}
  }
  close() { if(this.#closed)return;this.#closed=true;this.#db.prepare('DELETE FROM lease WHERE token=?').run(this.#lease); this.#db.close(); }
  ids() { return this.#db.prepare('SELECT id FROM projects ORDER BY id').all().map(r=>r.id); }
  async register(bundle, actor) {
    exact(bundle,['project','capability']);
    const state=copy({schemaVersion:'1.1.0',...bundle,histories:{},assertions:[],receipts:[],adoptions:[],projections:[],canonicalSpecs:[],projectionReceipts:[]});
    await validateState(state); const projectId=id(state.project.metadata.id);
    if(this.ids().includes(projectId)) {
      const existing=await this.load(projectId);
      if(canonicalJson(existing.state.project)!==canonicalJson(state.project) || canonicalJson(existing.state.capability)!==canonicalJson(state.capability)) fail('PROJECT_ALREADY_REGISTERED_DIFFERENT');
      return existing;
    }
    return this.commit(projectId,0,state,{action:'register',actor,at:new Date().toISOString()});
  }
  async load(projectId) {
    const row=this.#db.prepare('SELECT * FROM projects WHERE id=?').get(id(projectId));
    if(!row) fail('PROJECT_NOT_FOUND');
    const history=this.#db.prepare('SELECT * FROM history WHERE project_id=? ORDER BY version').all(projectId);
    let previous=null;
    for (let i=0;i<history.length;i++) {
      const h=history[i],state=JSON.parse(h.state),event=JSON.parse(h.event);
      if(h.version!==i+1 || h.previous!==previous || h.hash!==await fingerprint({version:h.version,previous:h.previous,event,state})) fail('STORE_CORRUPT');
      previous=h.hash;
    }
    if(history.length!==row.version || previous!==row.hash || history.at(-1)?.state!==row.state) fail('STORE_CORRUPT');
    const state=JSON.parse(row.state);await validateState(state);
    return {version:row.version,hash:row.hash,state};
  }
  async commit(projectId, expectedVersion, value, eventValue, runChange=null) {
    const state=copy(value),event=copy(eventValue);id(projectId);
    if(!Number.isInteger(expectedVersion)||expectedVersion<0)fail('INVALID_VERSION');
    await validateState(state);
    if(state.project.metadata.id!==projectId)fail('PROJECT_SCOPE');
    const row=this.#db.prepare('SELECT version,hash FROM projects WHERE id=?').get(projectId);
    if((row?.version??0)!==expectedVersion)fail('STALE_STATE');
    const version=expectedVersion+1,previous=row?.hash??null;
    const hash=await fingerprint({version,previous,event,state}),json=canonicalJson(state);
    const run=runChange?copy(runChange):null,runHash=run?await fingerprint(run.record):null;
    this.#db.exec('BEGIN IMMEDIATE');
    try{
      if(expectedVersion===0)this.#db.prepare('INSERT INTO projects VALUES (?,?,?,?)').run(projectId,version,hash,json);
      else if(Number(this.#db.prepare('UPDATE projects SET version=?,hash=?,state=? WHERE id=? AND version=? AND hash=?').run(version,hash,json,projectId,expectedVersion,previous).changes)!==1)fail('STALE_STATE');
      this.#db.prepare('INSERT INTO history VALUES (?,?,?,?,?,?)').run(projectId,version,hash,previous,canonicalJson(event),json);
      if(run && Number(this.#db.prepare('UPDATE runs SET status=?,hash=?,record=? WHERE id=? AND project_id=? AND status=? AND hash=?').run(run.record.status,runHash,canonicalJson(run.record),run.record.id,projectId,run.expectedStatus,run.expectedHash).changes)!==1)fail('STALE_RUN');
      this.#db.exec('COMMIT');
    }catch(e){this.#db.exec('ROLLBACK');throw e;}
    return {version,hash,state};
  }
  async runs(projectId) {
    id(projectId);const rows=this.#db.prepare('SELECT * FROM runs WHERE project_id=? ORDER BY rowid DESC').all(projectId);
    return Promise.all(rows.map(async r=>{const record=JSON.parse(r.record);if(r.hash!==await fingerprint(record)||record.id!==r.id||record.status!==r.status||record.projectId!==r.project_id)fail('RUN_CORRUPT');return {record,hash:r.hash};}));
  }
  async run(projectId,runId) {return (await this.runs(projectId)).find(r=>r.record.id===id(runId))??fail('RUN_NOT_FOUND');}
  async insertRun(record) {
    const r=copy(record);id(r.id);id(r.projectId);if(r.status!=='running')fail('RUN_STATE');const hash=await fingerprint(r);
    this.#db.exec('BEGIN IMMEDIATE');
    try{
      const project=this.#db.prepare('SELECT version FROM projects WHERE id=?').get(r.projectId);
      if(!Number.isInteger(r.projectVersion)||project?.version!==r.projectVersion)fail('STALE_STATE');
      this.#db.prepare('INSERT INTO runs VALUES (?,?,?,?,?)').run(r.id,r.projectId,r.status,hash,canonicalJson(r));this.#db.exec('COMMIT');
    }catch(e){this.#db.exec('ROLLBACK');throw e;}return r;
  }
  async updateRun(record, expected) {
    const r=copy(record),hash=await fingerprint(r);
    if(Number(this.#db.prepare('UPDATE runs SET status=?,hash=?,record=? WHERE id=? AND project_id=? AND hash=?').run(r.status,hash,canonicalJson(r),r.id,r.projectId,expected).changes)!==1)fail('STALE_RUN');return r;
  }
  async recover() {
    const pending=[];
    // Validate every project before changing recovery evidence in any of them.
    for(const projectId of this.ids()){await this.load(projectId);pending.push(...await this.runs(projectId));}
    for(const {record,hash} of pending)if(record.status==='running')await this.updateRun({...record,status:'needs-attention',error:'INTERRUPTED',finishedAt:new Date().toISOString()},hash);
  }
  history(projectId) {return this.#db.prepare('SELECT version,event,hash FROM history WHERE project_id=? ORDER BY version DESC').all(id(projectId)).map(r=>({...r,event:JSON.parse(r.event)}));}
}
