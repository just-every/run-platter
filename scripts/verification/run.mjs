import { spawn } from 'node:child_process'
const shard=process.env.PLATTER_VERIFY_SHARD
// Each ordered partition subtracts all earlier matches over the SAME files.
// The final complement catches every other current or future test name, so a
// new test cannot fall through a hand-maintained list or run in two partitions.
function partitions(files, groups) {
 const commands={}
 const previous=[]
 for(const [name,pattern] of groups){
  const filters=[]
  if(pattern)filters.push(`--test-name-pattern='${pattern}'`)
  if(previous.length)filters.push(`--test-skip-pattern='${previous.join('|')}'`)
  commands[name]=`node --test --test-concurrency=1 ${filters.join(' ')} ${files}`
  if(pattern)previous.push(pattern)
 }
 return commands
}
const businessFiles='tests/platter.test.mjs tests/demo.test.mjs tests/mail.test.mjs'
// Keep ordered, disjoint groups over the same business files. Verify runs
// 42501941877 and 42504861947 measured authoring at 540s and 954s. Using each
// test's slower observation, EDIT/PRICE + reporting weigh 480s and TEAM/SEND
// weigh 472s. Share the lifecycle groups across existing jobs to keep eight
// shards: their estimated test work is 642-684s, before runner setup overhead.
const business=partitions(businessFiles,[
 ['templates','^EDIT-002\\b'],
 ['copies','^EDIT-012\\b'],
 ['search','^EDIT-016\\b'],
 ['reporting','^FOLLOW-005\\b'],
 ['drive','^AUTO-002\\b'],
 ['approvals','^APPROVE-'],
 ['learning','^AGENT-007\\b'],
 ['authoring','^(EDIT|PRICE)-'],
 ['sending','^(TEAM|SEND)-'],
 ['comments','^COLLAB-002\\b'],
 ['followup','^FOLLOW-'],
 ['signing','^(SIGN|PAY)-'],
 ['migration','^MIG-'],
 ['accounting','^ACCT-'],
 ['tracking','^TRACK-'],
 ['notifications','^(AUTO|MAIL)-'],
 ['crm','^CRM-'],
 ['lifecycle',null]
])
// Move bounce custody and legacy currency to lighter jobs, and Drive history
// from media to restore. Keep the media remainder open to future archive tests.
const archive=partitions('tests/archive.test.mjs',[
 ['custody','public CLI preserves business'],
 ['currency','first-release AUD'],
 ['bounce','bounce follow-ups'],
 ['restore','PORT-001 public CLI refuses|imported business|document archive history'],
 ['media',null]
])
// Split serial document browser journeys. Complementary filters retain
// every current and future test exactly once without editing their assertions.
const documentPattern='^(EDIT|COLLAB|CAT)-'
const documentCommand=filter=>`PLATTER_BROWSER_SHARD=documents node --test --test-concurrency=1 ${filter}='${documentPattern}' tests/site.test.mjs`
const lifecycleBrowser='PLATTER_BROWSER_SHARD=lifecycle node --test --test-concurrency=1 tests/site.test.mjs'
const tasks={
 core:['node src/base/contract-docs.mjs check','pnpm build','pnpm exec rer build --site','pnpm typecheck'],
 runtime:[lifecycleBrowser,business.drive,business.tracking],
 browser_documents_all:['PLATTER_BROWSER_SHARD=documents node --test --test-concurrency=1 tests/site.test.mjs'],
 browser_documents:[documentCommand('--test-name-pattern'),business.templates,archive.bounce,business.migration],
 browser_commercial:[documentCommand('--test-skip-pattern'),business.accounting],
 business:['pnpm test:platter'],
 business_authoring:[business.authoring,business.reporting,business.approvals,business.followup],
 business_sending:[business.sending,business.signing],
 archive:['pnpm test:archive'],
 archive_custody:[archive.custody,business.copies,archive.currency,business.learning,business.crm,business.lifecycle],
 archive_restore:[archive.restore,business.search],
 archive_media:[archive.media,business.comments,business.notifications]
}
if(shard&&!Object.hasOwn(tasks,shard))throw Error('Unknown verification shard')
const commands=shard?tasks[shard]:[...tasks.core,lifecycleBrowser,...tasks.browser_documents_all,...tasks.business,...tasks.archive]
// Core/default builds have ordered inputs. A CI shard's commands instead own
// fresh harnesses/CLI checkouts and only read the shared build. Overlap at most
// two commands, with at most one browser command in any shard; each Node test
// command still runs its files serially. Archive CLI builds are heavier: allow
// only one archive command at once, bypassing it for eligible business work.
// Wait for every child, retaining errors.
const concurrency=shard&&!['core','business','archive','browser_documents_all'].includes(shard)?2:1
const pending=commands.map(command=>({command,archive:command.endsWith(' tests/archive.test.mjs')}))
let archiveBusy=false,exitCode=0
const waiters=[]
function wake(){for(const resolve of waiters.splice(0))resolve()}
async function worker(){
 while(pending.length){
  const index=pending.findIndex(task=>!task.archive||!archiveBusy)
  if(index<0){await new Promise(resolve=>waiters.push(resolve));continue}
  const {command,archive}=pending.splice(index,1)[0]
  if(archive)archiveBusy=true
  const code=await new Promise(resolve=>{
   const child=spawn(command,{shell:true,stdio:'inherit',env:process.env})
   child.once('error',error=>{console.error(error);resolve(1)})
   child.once('close',code=>resolve(code??1))
  })
  if(archive)archiveBusy=false
  if(code){exitCode||=code;if(concurrency===1)pending.length=0}
  wake()
 }
}
await Promise.all(Array.from({length:Math.min(concurrency,commands.length)},worker))
process.exitCode=exitCode
