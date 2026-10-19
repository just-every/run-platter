import { createServer } from 'node:http'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { extname, join, resolve, sep } from 'node:path'
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
export async function installedApp() {
  const temporary = await mkdtemp(join(tmpdir(), 'platter-site-'))
  const persist = join(temporary, 'state'), config = resolve('dist/server/wrangler.json')
  let proxy, worker
  try {
    proxy = await getPlatformProxy({ configPath: config, envFiles: [], persist: { path: join(persist, 'v3') }, remoteBindings: false })
    for (const file of (await readdir('migrations/core')).filter(file => file.endsWith('.sql')).sort()) {
      await proxy.env.DB.batch(unstable_splitSqlQuery(await readFile('migrations/core/' + file, 'utf8')).map(sql => proxy.env.DB.prepare(sql)))
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
