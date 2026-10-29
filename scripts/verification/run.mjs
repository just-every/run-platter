import { spawnSync } from 'node:child_process'
const shard=process.env.PLATTER_VERIFY_SHARD
// Separate authoring, pricing, team and sending journeys from lifecycle work
// so the serial business tests fit the push job's time limit. Keep the unsplit
// local tasks too.
// Use complementary filters over the SAME files so every test runs exactly once,
// including future names (which land in lifecycle unless they match authoring).
const businessFiles='tests/platter.test.mjs tests/demo.test.mjs tests/mail.test.mjs'
const authoringPattern='^(EDIT|PRICE|TEAM|SEND)-'
const businessCommand=filter=>`node --test --test-concurrency=1 ${filter}='${authoringPattern}' ${businessFiles}`
// Split serial document browser journeys. Complementary filters retain
// every current and future test exactly once without editing their assertions.
const documentPattern='^(EDIT|COLLAB|CAT)-'
const documentCommand=filter=>`PLATTER_BROWSER_SHARD=documents node --test --test-concurrency=1 ${filter}='${documentPattern}' tests/site.test.mjs`
const tasks={
 // Focused local adoption check; the default and every existing CI partition
 // retain their complete tests. The CLI runs production door conformance after
 // this target, as it does after each existing partition.
 agent_door:['node src/base/contract-docs.mjs check','pnpm build','pnpm typecheck',"node --test --test-name-pattern='AI-003 MCP|native auth, CSRF|TEAM-004 current' tests/platter.test.mjs"],
 runtime:['node src/base/contract-docs.mjs check','pnpm build','pnpm exec rer build --site','pnpm typecheck','PLATTER_BROWSER_SHARD=lifecycle node --test --test-concurrency=1 tests/site.test.mjs'],
 browser_documents_all:['pnpm build','PLATTER_BROWSER_SHARD=documents node --test --test-concurrency=1 tests/site.test.mjs'],
 browser_documents:['pnpm build',documentCommand('--test-name-pattern')],
 browser_commercial:['pnpm build',documentCommand('--test-skip-pattern')],
 business:['pnpm test:platter'],
 business_authoring:[businessCommand('--test-name-pattern')],
 business_lifecycle:[businessCommand('--test-skip-pattern')],
 archive:['pnpm test:archive'],
 archive_custody:["node --test --test-name-pattern='public CLI preserves business' tests/archive.test.mjs"],
 archive_restore:["node --test --test-name-pattern='PORT-001 public CLI refuses|first-release AUD|bounce follow-ups|imported business' tests/archive.test.mjs"],
 archive_media:["node --test --test-name-pattern='retains real invitation|restores scoped roles|notification business|document archive history|retains displayed' tests/archive.test.mjs"]
}
if(shard&&!Object.hasOwn(tasks,shard))throw Error('Unknown verification shard')
for(const command of shard?tasks[shard]:['runtime','browser_documents_all','business','archive'].flatMap(key=>tasks[key])){const result=spawnSync(command,{shell:true,stdio:'inherit',env:process.env});if(result.status!==0)process.exit(result.status??1)}
