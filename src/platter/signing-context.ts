/** Record only the signing request's reported agent and trusted coarse edge location. */
export function signingContext(request:Request){
 const clean=(value:unknown,limit:number)=>typeof value==='string'?value.replace(/[\x00-\x1f\x7f]/g,'').trim().slice(0,limit):''
 const cf=request.cf as any
 const country=clean(cf?.country,2)
 const location=[clean(cf?.city,100),clean(cf?.region,100),/^[A-Z]{2}$/.test(country)?country:''].filter(Boolean).join(', ')
 return {location:location||'not recorded',userAgent:clean(request.headers.get('user-agent'),1000)||'not recorded'}
}
