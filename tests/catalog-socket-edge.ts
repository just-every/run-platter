// Network-edge double only: the application still resolves, pins, validates,
// parses HTTP, verifies bytes, fingerprints and commits through real doors.
export function connect(address:{hostname:string;port:number},options:any):any {
 const endpoint=address.hostname+':'+address.port
 const base={opened:Promise.resolve({remoteAddress:endpoint}),closed:Promise.resolve(),async close(){}}
 return {...base,startTls(tls:any){
  let controller:ReadableStreamDefaultController<Uint8Array>
  const readable=new ReadableStream<Uint8Array>({start(value){controller=value}})
  return {...base,readable,writable:new WritableStream<Uint8Array>({async write(bytes){
   const response=await fetch('https://socket-edge.invalid/file',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({address,options,tls,request:new TextDecoder().decode(bytes)})})
   controller.enqueue(new Uint8Array(await response.arrayBuffer()));controller.close()
  }})}
 }}
}
