// CONTRACT.md owns acceptance and status; generated documents never add obligations.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { parseContract } from '../src/base/seed-contract.mjs'
const command=process.argv[2]
if(!['write','check'].includes(command))throw Error('Use write or check')
const original=readFileSync('CONTRACT.md','utf8'),rows=[...original.matchAll(/^\| `([^`]+)` \| ([^|]+) \| (published|target|push-further) \| (done|partial|missing) \|/gm)]
const counts=list=>[...['done','partial','missing'].map(s=>list.filter(r=>r[4]===s).length),list.length]
let contract=original
for(const [label,list] of [['Published',rows.filter(r=>r[3]==='published')],['Target and push further',rows.filter(r=>r[3]!=='published')],['All',rows]])contract=contract.replace(new RegExp('^\\| '+label+' \\|.*$','m'),'| '+label+' | '+counts(list).join(' | ')+' |')
const parsed=parseContract(contract),evidence=c=>contract.split('\n')[c.row-1].split(/(?<!\\)\|/)[5].trim(),safe=s=>s.replaceAll('|','\\|')
const acceptance='# Platter acceptance\n\nGenerated from [CONTRACT.md](CONTRACT.md). Edit that source, then run `node scripts/contract-docs.mjs write`.\n\n'+parsed.clauses.map(c=>`## ${c.id} — ${c.title}\n\nStatus: **${c.status}**.\n\n${c.text.split(' *Status:*')[0]}\n\nEvidence: ${evidence(c)||'None recorded.'}\n\n${c.gap?'Remaining gap: '+c.gap:'Gap: none.'}\n`).join('\n')
const claims='# Platter clause status\n\nGenerated from [CONTRACT.md](../CONTRACT.md). Acceptance wording and proof live in that source.\n\n| Clause | Title | Status | Evidence | Gap |\n| --- | --- | --- | --- | --- |\n'+parsed.clauses.map(c=>`| ${c.id} | ${safe(c.title)} | ${c.status} | ${evidence(c)} | ${safe(c.gap)} |`).join('\n')+'\n'
for(const [file,content] of [['CONTRACT.md',contract],['ACCEPTANCE.md',acceptance],['docs/CLAIMS.md',claims]]){
 if(command==='write'){mkdirSync(file.includes('/')?file.slice(0,file.lastIndexOf('/')):'.',{recursive:true});writeFileSync(file,content)}
 else if(readFileSync(file,'utf8')!==content)throw Error(`${file} is stale; run node scripts/contract-docs.mjs write`)
}
console.log(`contract-docs ${command}: ${parsed.clauses.length} clauses; ${JSON.stringify(parsed.counts)}`)
