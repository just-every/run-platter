import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { parseContract } from '../src/base/seed-contract.mjs'

const mode=process.argv[2]
if(!['write','check'].includes(mode))throw Error('Use contract-docs.mjs write or check')
const original=await readFile('CONTRACT.md','utf8'),rows=original.split('\n').filter(line=>/^\| `[A-Z]+-\d+` \|/.test(line)).map(line=>line.split('|').slice(1,-1).map(cell=>cell.trim()))
const counts=items=>['done','partial','missing'].map(status=>items.filter(row=>row[3]===status).length).concat(items.length)
let contract=original
for(const [label,items] of [['Published',rows.filter(r=>r[2]==='published')],['Target and push further',rows.filter(r=>r[2]!=='published')],['All',rows]])contract=contract.replace(new RegExp('^\\| '+label+' \\|.*$','m'),'| '+label+' | '+counts(items).join(' | ')+' |')
const parsed=parseContract(contract)
const header=title=>'# '+title+'\n\nGenerated from [CONTRACT.md](CONTRACT.md). Edit CONTRACT.md and run `node scripts/contract-docs.mjs write`.\n\n'
const acceptance=header('Platter acceptance')+parsed.clauses.map(c=>'## '+c.id+' — '+c.title+'\n\nStatus: **'+c.status+'**.\n\n'+c.text.trim()+'\n\nEvidence: '+(c.evidence.map(p=>'`'+p+'`').join(', ')||'None recorded.')+'\n\n'+(c.gap?'Gap: '+c.gap+'\n\n':'')).join('')
const claims=header('Platter claims')+parsed.clauses.map(c=>'## '+c.id+' — '+c.title+'\n\nStatus: **'+c.status+'**.\n\n'+(c.gap?'Gap: '+c.gap+'\n\n':'')+'Evidence: '+(c.evidence.map(p=>'`'+p+'`').join(', ')||'None recorded.')+'\n\n').join('')
for(const [path,value] of [['CONTRACT.md',contract],['ACCEPTANCE.md',acceptance],['docs/CLAIMS.md',claims]]){
 if(mode==='write'){await mkdir('docs',{recursive:true});await writeFile(path,value)}
 else if(await readFile(path,'utf8')!==value)throw Error(path+' is stale; run node scripts/contract-docs.mjs write')
}
console.log('contract-docs '+mode+': '+parsed.counts.total+' clauses')
