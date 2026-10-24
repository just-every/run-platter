import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {deploymentSpec} from './delivery/base/spec.mjs';
const root = process.cwd();
const config = JSON.parse(await readFile('packaging.json', 'utf8'));
const bytes = JSON.stringify(await deploymentSpec(root, config.artifact.specInputs), null, 2) + '\n';
const file = 'management/integration/deployment-spec.json';
if (process.argv.includes('--check')) {
  if (await readFile(file, 'utf8') !== bytes) throw Error('Deployment specification is stale; run pnpm delivery:spec');
  console.log('Deployment specification is current');
} else {
  await mkdir('management/integration', {recursive: true});
  await writeFile(file, bytes);
  console.log('Wrote ' + file);
}
