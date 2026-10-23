/** Trusted edge geolocation is derived from the connected address. Never retain the address or trust location headers. */
export function requestLocation(request:Request){
 const cf=(request as Request & {cf?:{city?:string;region?:string;country?:string}}).cf
 const label=(value:unknown)=>typeof value==='string'?value.replace(/[\r\n]/g,' ').slice(0,100):'Unknown'
 return {city:label(cf?.city),region:label(cf?.region),country:cf?.country&&/^[A-Z]{2}$/.test(cf.country)?new Intl.DisplayNames(['en'],{type:'region'}).of(cf.country)??label(cf.country):label(cf?.country)}
}
