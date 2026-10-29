import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const [originInput, outputInput] = process.argv.slice(2)
if (!originInput || !outputInput) throw Error('Usage: node ./integrations/hubspot/prepare.mjs HTTPS_ORIGIN OUTPUT_DIRECTORY')
const origin = new URL(originInput)
if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw Error('Use the public HTTPS installation origin without credentials, path, query or fragment')
const output = resolve(outputInput), template = fileURLToPath(new URL('./project', import.meta.url))
if (output === template || output.startsWith(template + '/')) throw Error('Prepare into a separate installation directory')
await mkdir(output, { recursive: true })
await cp(template, output, { recursive: true })
const appPath = join(output, './src/app/app-hsmeta.json'), app = JSON.parse(await readFile(appPath, 'utf8'))
app.config.permittedUrls.fetch = [origin.origin]
await writeFile(appPath, JSON.stringify(app, null, 2) + '\n')
await writeFile(join(output, './src/app/cards/origin.ts'), 'export const platterOrigin = ' + JSON.stringify(origin.origin) + ';\n')
console.log('Prepared the private HubSpot app project. Install its card dependencies and upload with the HubSpot CLI from that directory.')
