// Whole-database and runtime-log inspection for payment instrument numbers.
const knownNumbers=['4242424242424242','4000000000003220','4000000000000002','4000000000009987','4000000000009995','4000000000009979','000123456789','110000000']

function luhn(digits){let sum=0,flip=false;for(let index=digits.length-1;index>=0;index--){let value=Number(digits[index]);if(flip){value*=2;if(value>9)value-=9}sum+=value;flip=!flip}return sum%10===0}

export function instrumentNumbers(text){
 const found=knownNumbers.filter(number=>text.includes(number))
 for(const match of text.matchAll(/(?<![\w-])\d(?:[ -]?\d){14,18}(?![\w-])/g)){const digits=match[0].replace(/\D/g,'');if(digits.length>=15&&digits.length<=19&&luhn(digits))found.push(digits.slice(0,4)+'…')}
 return found
}

export async function databaseText(db){
 const tables=(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'").all()).results,parts=[]
 for(const {name} of tables)for(const row of (await db.prepare('SELECT * FROM "'+name+'"').all()).results)parts.push(name+' '+JSON.stringify(row,(key,value)=>value instanceof ArrayBuffer?Buffer.from(value).toString('latin1'):Array.isArray(value)&&value.every(n=>Number.isInteger(n))?Buffer.from(value).toString('latin1'):value))
 return {tables:tables.length,rows:parts.length,text:parts.join('\n')}
}

export function captureRuntimeLog(){
 const chunks=[],out=process.stdout.write.bind(process.stdout),err=process.stderr.write.bind(process.stderr)
 process.stdout.write=(chunk,...rest)=>{chunks.push(String(chunk));return out(chunk,...rest)}
 process.stderr.write=(chunk,...rest)=>{chunks.push(String(chunk));return err(chunk,...rest)}
 return {text:()=>chunks.join(''),stop(){process.stdout.write=out;process.stderr.write=err}}
}
