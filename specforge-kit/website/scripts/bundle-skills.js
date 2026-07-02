import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

function readLocal(skillsDir) {
  const out = {};
  if (!existsSync(skillsDir)) return out;
  for (const name of readdirSync(skillsDir)) {
    if (extname(name) !== '.md') continue;
    out[basename(name, '.md')] = readFileSync(join(skillsDir, name), 'utf8');
  }
  return out;
}

async function readRemote(remote, fetchImpl) {
  const manifestUrl = `${remote.baseUrl}/${remote.manifest}`;
  const mres = await fetchImpl(manifestUrl);
  if (!mres.ok) throw new Error(`manifest ${mres.status}`);
  const files = await mres.json();
  const out = {};
  for (const file of files) {
    const fres = await fetchImpl(`${remote.baseUrl}/${file}`);
    if (!fres.ok) throw new Error(`file ${file} ${fres.status}`);
    out[basename(file, '.md')] = await fres.text();
  }
  return out;
}

export async function bundleSkills(skillsDir, outPath, config, fetchImpl = fetch) {
  let skills;
  if (config?.source === 'remote' && config.remote) {
    try {
      skills = await readRemote(config.remote, fetchImpl);
    } catch (err) {
      console.log(`bundle-skills: remote failed (${err.message}), falling back to local`);
      skills = readLocal(skillsDir);
    }
  } else {
    skills = readLocal(skillsDir);
  }
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(skills, null, 2));
  return skills;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const here = dirname(fileURLToPath(import.meta.url));           // .../website/scripts
  const kitRoot = join(here, '..', '..');                          // .../specforge-kit
  const skillsDir = join(kitRoot, 'skills');
  const outPath = join(here, '..', 'src', 'data', 'skills.json');
  let config = { source: 'local' };
  try { config = JSON.parse(readFileSync(join(kitRoot, 'skills.config.json'), 'utf8')); } catch {}
  const skills = await bundleSkills(skillsDir, outPath, config);
  console.log(`bundle-skills: wrote ${Object.keys(skills).length} skills to ${outPath}`);
}
