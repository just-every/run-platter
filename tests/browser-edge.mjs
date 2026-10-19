import { createServer } from 'node:https'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
// TLS/HTTP bridge to the real compiled Worker. No application routes replaced.
export async function browserEdge() {
 const directory=await mkdtemp(join(tmpdir(),'platter-browser-tls-'))
 const key=join(directory,'key.pem'),cert=join(directory,'cert.pem')
 let worker
 try{
  await promisify(execFile)('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=127.0.0.1'])
  const server=createServer({key:await readFile(key),cert:await readFile(cert)},async(req,res)=>{
   try{
    const chunks=[];for await(const chunk of req)chunks.push(chunk)
    const response=await worker.mf.dispatchFetch(origin+req.url,{method:req.method,headers:req.headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(chunks)}),redirect:'manual'})
    const headers=Object.fromEntries(response.headers);delete headers['transfer-encoding'];delete headers['content-length'];delete headers['content-encoding']
    res.writeHead(response.status,headers);res.end(Buffer.from(await response.arrayBuffer()))
   }catch{res.writeHead(500);res.end('Worker transport failed')}
  })
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
  const origin='https://127.0.0.1:'+server.address().port
  return {origin,attach:h=>{worker=h},close:async()=>{await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true})}}
 }catch(error){await rm(directory,{recursive:true,force:true});throw error}
}
