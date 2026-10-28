import { spawnSync } from 'node:child_process'
const shard=process.env.PLATTER_VERIFY_SHARD
// Separate authoring, pricing and team journeys from lifecycle work so the serial
// business tests fit the push job's time limit. Keep the unsplit local task too.
// Use complementary filters over the SAME files so every test runs exactly once,
// including future names (which land in lifecycle unless they match authoring).
const businessFiles='tests/platter.test.mjs tests/demo.test.mjs tests/mail.test.mjs'
const authoringPattern='^(EDIT|PRICE|TEAM)-'
const businessCommand=filter=>`node --test --test-concurrency=1 ${filter}='${authoringPattern}' ${businessFiles}`
const tasks={
 runtime:['node scripts/contract-docs.mjs check','pnpm build','pnpm exec rer build --site','pnpm typecheck','PLATTER_BROWSER_SHARD=lifecycle node --test --test-concurrency=1 tests/site.test.mjs'],
 browser_documents:['pnpm build','PLATTER_BROWSER_SHARD=documents node --test --test-concurrency=1 tests/site.test.mjs'],
 business:['pnpm test:platter'],
 business_authoring:[businessCommand('--test-name-pattern')],
 business_lifecycle:[businessCommand('--test-skip-pattern')],
 archive:['pnpm test:archive'],
 archive_custody:["node --test --test-name-pattern='public CLI preserves business' tests/archive.test.mjs"],
 archive_restore:["node --test --test-name-pattern='PORT-001 public CLI refuses|first-release AUD|bounce follow-ups|imported business' tests/archive.test.mjs"],
 archive_media:["node --test --test-name-pattern='retains real invitation|restores scoped roles|notification business|document archive history|retains displayed' tests/archive.test.mjs"]
}
if(shard&&!Object.hasOwn(tasks,shard))throw Error('Unknown verification shard')
for(const command of shard?tasks[shard]:['runtime','browser_documents','business','archive'].flatMap(key=>tasks[key])){const result=spawnSync(command,{shell:true,stdio:'inherit',env:process.env});if(result.status!==0)process.exit(result.status??1)}
