import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { cp, mkdir, mkdtemp, readdir, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { getPlatformProxy } from 'wrangler'
import { nativeMigrationPreflight } from '../node_modules/@runeditrun/rer/cli/portability-migrations.mjs'

const exec=promisify(execFile)
async function checkoutFiles(root) {
 await mkdir(root)
 for(const name of ['package.json','pnpm-lock.yaml','OPERATIONS.json','RUN-LOCALLY.md','ACCEPTANCE.md','SEED-COMMAND-CONTRACT.md','OPERATIONS.md','.node-version','wrangler.jsonc','deploy.json','rer-setup.json','scripts','src','migrations'])await cp(name,join(root,name),{recursive:true})
 await symlink(resolve('node_modules'),join(root,'node_modules'),'dir')
}

// One native apply per archive test process, including every current migration.
// Snapshot only after Wrangler and the preflight proxy have stopped, so SQLite
// files (including any sidecars) are a consistent, migration-only empty state.
// No archive, operator, session or other journey-created data enters the template.
export function archiveTemplate() {
 let temporary,root,prepared
 return {
  prepare() {
   return prepared??=(async()=>{
    const started=performance.now()
    temporary=await mkdtemp(join(tmpdir(),'platter-archive-template-'))
    root=join(temporary,'empty')
    await checkoutFiles(root)
    await exec(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),'d1','migrations','apply','foundation','--local'],{cwd:root,env:{...process.env,CI:'true',WRANGLER_SEND_METRICS:'false'},maxBuffer:8e6})
    const proxy=await getPlatformProxy({configPath:join(root,'wrangler.jsonc'),persist:{path:join(root,'.wrangler/state/v3')},remoteBindings:false})
    let migrations
    try {
     migrations=(await readdir(join(root,'migrations/core'))).filter(name=>name.endsWith('.sql')).sort()
     const ledger=(await proxy.env.DB.prepare('SELECT name FROM d1_migrations ORDER BY id').all()).results.map(row=>row.name)
     assert.deepEqual(ledger,migrations,'the shared empty schema applied every current migration in order')
     assert.deepEqual(await nativeMigrationPreflight({root,db:proxy.env.DB,binding:'DB'}),{nativeApply:true})
    }finally{await proxy.dispose()}
    console.log('Archive schema template completed in '+Math.round(performance.now()-started)+' ms ('+migrations.length+' migrations; ledger preflight passed)')
   })()
  },
  async checkout(destination,{migrated=true}={}) {
   await prepared
   assert.ok(root,'prepare the archive schema before copying it')
   await checkoutFiles(destination)
   if(migrated)await cp(join(root,'.wrangler/state'),join(destination,'.wrangler/state'),{recursive:true})
  },
  async close() {
   if(temporary)await rm(temporary,{recursive:true,force:true})
  }
 }
}
