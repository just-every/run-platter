import { spawnSync } from 'node:child_process'
const shard=process.env.PLATTER_VERIFY_SHARD
const tasks={runtime:['pnpm build','pnpm typecheck'],business:['pnpm test:platter'],archive:['pnpm test:archive']}
if(shard&&!Object.hasOwn(tasks,shard))throw Error('Unknown verification shard')
for(const command of shard?tasks[shard]:Object.values(tasks).flat()){const result=spawnSync(command,{shell:true,stdio:'inherit',env:process.env});if(result.status!==0)process.exit(result.status??1)}
