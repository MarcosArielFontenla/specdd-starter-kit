import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeProject, MAX_PATHS } from './analyzer.js';

function reader(files) {
  return (p) => (p in files ? Promise.resolve(files[p]) : Promise.reject(new Error(`no ${p}`)));
}

test('node/react project: stack from package.json + tsconfig', async () => {
  const files = {
    'package.json': JSON.stringify({
      name: 'acme-shop', description: 'A sample shop',
      dependencies: { react: '^18.0.0', express: '^4.18.0', pg: '^8.0.0' },
      devDependencies: { vitest: '^1.0.0' },
    }),
  };
  const a = await analyzeProject({
    folderName: 'shop-folder',
    paths: ['package.json', 'tsconfig.json', 'src/index.ts'],
    readFile: reader(files),
  });
  assert.equal(a.projectName, 'acme-shop');
  assert.equal(a.description, 'A sample shop');
  assert.equal(a.stack.frontend, 'React');
  assert.equal(a.stack.backend, 'Express');
  assert.equal(a.stack.testing, 'Vitest');
  assert.equal(a.stack.database, 'PostgreSQL');
  assert.deepEqual(a.stack.languages, ['TypeScript']);
  assert.deepEqual(a.manifestsFound, ['package.json']);
  assert.equal(a.fileCount, 3);
  assert.equal(a.truncated, false);
});

test('python/django project', async () => {
  const files = { 'requirements.txt': 'django==5.0\npsycopg2==2.9\n' };
  const a = await analyzeProject({
    folderName: 'py-app',
    paths: ['requirements.txt', 'manage.py'],
    readFile: reader(files),
  });
  assert.equal(a.projectName, 'py-app'); // no package.json name — folder name wins
  assert.equal(a.stack.backend, 'Django');
  assert.ok(a.stack.languages.includes('Python'));
});

test('dotnet and java detection by manifest presence', async () => {
  const files = { 'pom.xml': '<project><dependencies>spring-boot</dependencies></project>' };
  const dotnet = await analyzeProject({ folderName: 'x', paths: ['App/App.csproj'], readFile: reader({}) });
  assert.ok(dotnet.stack.languages.includes('.NET'));
  const java = await analyzeProject({ folderName: 'y', paths: ['pom.xml'], readFile: reader(files) });
  assert.ok(java.stack.languages.includes('Java'));
  assert.equal(java.stack.backend, 'Spring');
});

test('unreadable manifest is skipped without crashing', async () => {
  const a = await analyzeProject({
    folderName: 'z',
    paths: ['package.json'],
    readFile: () => Promise.reject(new Error('denied')),
  });
  assert.equal(a.projectName, 'z');
  assert.deepEqual(a.manifestsFound, []);
});

test('empty folder yields empty result with folder name', async () => {
  const a = await analyzeProject({ folderName: 'empty', paths: [], readFile: reader({}) });
  assert.equal(a.projectName, 'empty');
  assert.equal(a.fileCount, 0);
  assert.equal(a.stack.frontend, '');
});

test('path list over MAX_PATHS is truncated and flagged', async () => {
  const paths = Array.from({ length: MAX_PATHS + 5 }, (_, i) => `src/f${i}.js`);
  const a = await analyzeProject({ folderName: 'big', paths, readFile: reader({}) });
  assert.equal(a.truncated, true);
  assert.equal(a.fileCount, MAX_PATHS);
});
