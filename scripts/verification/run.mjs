import { spawnSync } from 'node:child_process'
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
// EDIT-012 had a 126s group; isolate it alongside archive custody. Templates
// use browser capacity; search and internal comments use lighter archive jobs.
const business=partitions(businessFiles,[
 ['templates','^EDIT-002\\b'],
 ['copies','^EDIT-012\\b'],
 ['search','^EDIT-016\\b'],
 ['authoring','^(EDIT|PRICE|TEAM|SEND)-'],
 ['comments','^COLLAB-002\\b'],
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
const tasks={
 runtime:['node src/base/contract-docs.mjs check','pnpm build','pnpm exec rer build --site','pnpm typecheck','PLATTER_BROWSER_SHARD=lifecycle node --test --test-concurrency=1 tests/site.test.mjs'],
 browser_documents_all:['pnpm build','PLATTER_BROWSER_SHARD=documents node --test --test-concurrency=1 tests/site.test.mjs'],
 browser_documents:['pnpm build',documentCommand('--test-name-pattern'),business.templates,archive.bounce],
 browser_commercial:['pnpm build',documentCommand('--test-skip-pattern')],
 business:['pnpm test:platter'],
 business_authoring:[business.authoring],
 business_lifecycle:[business.lifecycle],
 archive:['pnpm test:archive'],
 archive_custody:[archive.custody,business.copies,archive.currency],
 archive_restore:[archive.restore,business.search],
 archive_media:[archive.media,business.comments]
}
if(shard&&!Object.hasOwn(tasks,shard))throw Error('Unknown verification shard')
for(const command of shard?tasks[shard]:['runtime','browser_documents_all','business','archive'].flatMap(key=>tasks[key])){const result=spawnSync(command,{shell:true,stdio:'inherit',env:process.env});if(result.status!==0)process.exit(result.status??1)}
