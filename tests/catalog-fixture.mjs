export const catalogCsv=()=>['id,name,sku,price,cost,currency,description,unit_name,billing_frequency,tax_exempt,tax_code,income_account',...Array.from({length:50},(_,i)=>['synthetic-platter-'+(6200+i),'Synthetic imported service '+(i+1),'synthetic-platter-'+(6100+i),i===0?'100.00':'200.00','25.00','USD','Reviewed CSV service','each',i===0?'monthly':'one-off',i===2?'false':'true',i===0||i===2?'service-tax':'','service-income'].join(','))].join('\n')
export async function promoteImported(h,ids,cookie=h.owner){
 const input={itemIds:ids,fallbackUnit:'each'},preview=await h.cmd('business-import.promote-preview',input,cookie)
 return h.cmd('business-import.promote',{...input,fingerprint:preview.fingerprint},cookie)
}
