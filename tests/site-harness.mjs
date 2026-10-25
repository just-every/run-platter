import { createServer } from 'node:http'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { extname, join, resolve, sep } from 'node:path'
import { harness } from './harness.mjs'
import { randomBytes } from 'node:crypto'
import { getPlatformProxy, unstable_dev, unstable_splitSqlQuery } from 'wrangler'

const listen = server => new Promise((resolve, reject) => {
  server.once('error', reject)
  server.listen(0, '127.0.0.1', () => resolve(server.address().port))
})
const close = server => new Promise(resolve => server.close(resolve))

// Serve the real rer build --site output; no application handler is substituted.
export async function builtSite() {
  const root = resolve('dist/site')
  await readFile(join(root, 'index.html'))
  const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' }
  const server = createServer(async (request, response) => {
    try {
      const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
      const file = resolve(root, '.' + (path === '/' ? '/index.html' : extname(path) ? path : path + '.html'))
      if (!file.startsWith(root + sep)) { response.writeHead(404).end(); return }
      const bytes = await readFile(file)
      response.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream' }).end(bytes)
    } catch { response.writeHead(404).end() }
  })
  const port = await listen(server)
  return { origin: `http://127.0.0.1:${port}`, close: () => close(server) }
}

// Run the compiled production entry and real static assets in Wrangler. Only
// installation provisioning uses D1 directly; the owner claims through HTTP.
export async function installedApp(options = {}) {
  if(options.scheduled){const h=await harness({entry:'dist/server/index.js',assetsDirectory:'./dist/client',outboundService:options.outboundService,unclaimed:true,auth:{OWNER_EMAIL:'owner@northstar.example'}});return {origin:h.origin,token:h.auth.SETUP_TOKEN,db:h.db,fireCron:async at=>(await h.mf.getWorker()).scheduled({scheduledTime:new Date(at),cron:'*/15 * * * *'}),close:h.close}}
  const temporary = await mkdtemp(join(tmpdir(), 'platter-site-'))
  const persist = join(temporary, 'state'), config = resolve('dist/server/wrangler.json')
  let proxy, worker
  try {
    proxy = await getPlatformProxy({ configPath: config, envFiles: [], persist: { path: join(persist, 'v3') }, remoteBindings: false })
    for (const file of (await readdir('migrations/core')).filter(file => file.endsWith('.sql')).sort()) {
      await proxy.env.DB.batch(unstable_splitSqlQuery(await readFile('migrations/core/' + file, 'utf8')).map(sql => proxy.env.DB.prepare(sql)))
    }
    if (options.businessFixture) {
      const records = (await readFile(options.businessFixture, 'utf8')).split('\n').filter(Boolean).map(JSON.parse).filter(item => item.kind === 'part').flatMap(part => part.items).filter(item => item.kind === 'row' && item.table.startsWith('p_'))
      // Populate genuine historical business records; the owner still claims
      // this test installation through the normal HTTP bootstrap and setup.
      for (const table of ['p_clients', 'p_proposals', 'p_revisions', 'p_approvals', 'p_acceptances', 'p_invoices']) {
        for (const { row } of records.filter(item => item.table === table)) {
          const columns = Object.keys(row)
          await proxy.env.DB.prepare(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`).bind(...Object.values(row)).run()
        }
      }
    }
    await proxy.dispose(); proxy = undefined
    const reservation = createServer(), port = await listen(reservation)
    await close(reservation)
    const origin = `http://127.0.0.1:${port}`, token = randomBytes(32).toString('hex')
    worker = await unstable_dev(resolve('dist/server/index.js'), {
      config, envFiles: [], ip: '127.0.0.1', port, inspectorPort: 0, persistTo: persist,
      vars: { AUTH_ORIGIN: origin, AUTH_LOCAL: 'true', OWNER_EMAIL: 'owner@northstar.example', SESSION_SECRET: randomBytes(32).toString('hex'), SETUP_TOKEN: token, MAIL_PROVIDER: 'development' },
      logLevel: 'none', experimental: { disableExperimentalWarning: true, disableDevRegistry: true, watch: false },
    })
    return { origin, token, close: async () => { await worker.stop(); await rm(temporary, { recursive: true, force: true }) } }
  } catch (error) {
    await worker?.stop(); await proxy?.dispose(); await rm(temporary, { recursive: true, force: true }); throw error
  }
}
