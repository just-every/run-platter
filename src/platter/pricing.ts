import { allocateNet, fixedDiscount, scopedNet, percentBps } from './discounts'
import { recurrenceInput, type Recurrence } from './recurring'
import { calendarDate } from './expiry-time'
import { dollars, need, text } from './model'

export interface PriceLine {
 catalogId?: string; recurrence?: Recurrence; name: string; description: string; quantity: string; unit: string; unitPrice: string; group: string; lineTotalCents: number; grossCents?:number; discountBps?:number; discountFixedCents?:number; groupDiscountBps?:number; groupDiscountFixedCents?:number
}
export interface PriceTable {
 name: string; lines: PriceLine[]; groups: { name: string; subtotalCents: number }[]; subtotalCents: number; thresholdBps?:number
}
const object = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value)
const boundedTotal = (value: bigint) => {
 need(value <= 1000000000n, 'Package total must not exceed $10,000,000')
 return Number(value)
}

/** Quantity is thousandths of a unit; round each extended line half up to a cent. */
export function tableInputs(input: unknown): any[] {
 let tables: unknown = input ?? []
 if (typeof tables === 'string') { try { tables = JSON.parse(tables) } catch { need(false, 'Invalid pricing tables') } }
 need(Array.isArray(tables), 'Pricing tables must be a list')
 return tables
}

export function pricedOptions(options: { id: string; label: string; cents: number; discountBps?:number; discountFixedCents?:number; concealDiscount?:boolean; discountExpiresOn?:string }[], input: unknown) {
 const tables=tableInputs(input)
 const priced = options.map(option => ({ ...option, tables: [] as PriceTable[] }))
 for (const table of tables) {
  need(object(table), 'Invalid pricing table')
  const option = priced.find(option => option.id === table.optionId)
  need(option, 'Choose a package for each pricing table')
  need(Array.isArray(table.lines) && table.lines.length > 0, 'A pricing table needs at least one line')
  const groups = new Map<string, number>()
  const lines: PriceLine[] = table.lines.map((line: unknown) => {
   need(object(line), 'Invalid pricing line')
   const quantity = String(line.quantity ?? '')
   need(/^\d{1,7}(\.\d{1,3})?$/.test(quantity), 'Quantity must be positive with at most three decimal places')
   const [whole, fraction = ''] = quantity.split('.')
   const mills = BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, '0'))
   need(mills > 0n && mills <= 1000000000n, 'Quantity must be from 0.001 to 1,000,000')
   const cents = dollars(line.unitPrice)
   const recurring=recurrenceInput(line),grossCents = boundedTotal(((mills * BigInt(cents) + 500n) / 1000n)*BigInt(recurring.recurrence?.term??1)),discountBps=percentBps(line.discountPercent,'a line discount'),discountFixedCents=fixedDiscount(line.discountAmount),groupDiscountBps=percentBps(line.groupDiscountPercent,'a group discount'),groupDiscountFixedCents=fixedDiscount(line.groupDiscountAmount),lineTotalCents=scopedNet(grossCents,discountBps,discountFixedCents)
   const description = line.description ?? '', group = line.group ?? ''
   need(typeof description === 'string' && description.length <= 2000, 'Description must be text up to 2000 characters')
   need(typeof group === 'string' && group.length <= 200, 'Group must be text up to 200 characters')
   const name = text(line.name, 'a line name'), unit = text(line.unit, 'a unit', 40)
   groups.set(group.trim(), boundedTotal(BigInt(groups.get(group.trim()) ?? 0) + BigInt(lineTotalCents)))
   return { ...recurring, ...(line.catalogId?{catalogId:text(line.catalogId,'a catalog item')}:{}),name, description, quantity, unit, unitPrice: (cents / 100).toFixed(2), group: group.trim(), lineTotalCents,...(discountBps||discountFixedCents||groupDiscountBps||groupDiscountFixedCents?{grossCents,discountBps,discountFixedCents,groupDiscountBps,groupDiscountFixedCents}:{}) }
  })
  let thresholdBps=Math.max(0,...lines.map(l=>l.grossCents?Math.ceil((l.grossCents-l.lineTotalCents)*10000/l.grossCents):0))
  for(const group of groups.keys()){
   const members=lines.filter(l=>l.group===group),rules=members.filter(l=>l.groupDiscountBps||l.groupDiscountFixedCents)
   if(!rules.length)continue
   need(group.length>0,'Name a group before discounting it')
   const rule=rules[0];need(rules.every(l=>l.groupDiscountBps===rule.groupDiscountBps&&l.groupDiscountFixedCents===rule.groupDiscountFixedCents),'Use the same discount for each entry in a group')
   const amounts=members.map(l=>l.lineTotalCents),net=scopedNet(amounts.reduce((n,v)=>n+v,0),rule.groupDiscountBps??0,rule.groupDiscountFixedCents??0),allocation=allocateNet(amounts,net)
   thresholdBps=Math.max(thresholdBps,amounts.reduce((n,v)=>n+v,0)?Math.ceil((amounts.reduce((n,v)=>n+v,0)-net)*10000/amounts.reduce((n,v)=>n+v,0)):0)
   members.forEach((line,i)=>{line.grossCents??=line.lineTotalCents;line.lineTotalCents=allocation[i]});groups.set(group,net)
  }
  const subtotalCents = boundedTotal(lines.reduce((sum, line) => sum + BigInt(line.lineTotalCents), 0n))
  option.tables.push({ ...(thresholdBps?{thresholdBps}:{}),name: text(table.name, 'a table name'), lines, groups: [...groups].map(([name, subtotalCents]) => ({ name, subtotalCents })), subtotalCents })
 }
 return priced.map(({ tables, ...option }) => {
  const {discountBps=0,discountFixedCents=0,...publicOption}=option,gross=tables.length?boundedTotal(tables.reduce((sum,table)=>sum+BigInt(table.subtotalCents),0n)):option.cents,cents=scopedNet(gross,discountBps,discountFixedCents),pricingGrossCents=tables.reduce((n,t)=>n+t.lines.reduce((m,l)=>m+(l.grossCents??l.lineTotalCents),0),0)
  need(cents>0,'Package total after discount must be at least $0.01')
  return {...publicOption,cents,...(tables.length?{tables}:{}),...(pricingGrossCents>gross?{pricingGrossCents}:{}),...(discountBps||discountFixedCents?{discount:{bps:discountBps,grossCents:gross,cents:gross-cents,...(discountFixedCents?{fixedCents:discountFixedCents}:{})}}:{})}
 })
}

/** Lossless editable input reconstructed from a frozen or current option set. */
export function pricingInput(options: any[]) {
 return options.flatMap(option => (option.tables ?? []).map((table: PriceTable) => ({
  optionId: option.id, name: table.name,
  lines: table.lines.map(({ catalogId, recurrence, name, description, quantity, unit, unitPrice, group, discountBps, discountFixedCents, groupDiscountBps, groupDiscountFixedCents }) => ({ ...(recurrence?{recurrence}:{}), ...(catalogId?{catalogId}:{}),name, description, quantity, unit, unitPrice, group,...(discountBps||discountFixedCents||groupDiscountBps||groupDiscountFixedCents?{discountPercent:(discountBps??0)/100,discountAmount:((discountFixedCents??0)/100).toFixed(2),groupDiscountPercent:(groupDiscountBps??0)/100,groupDiscountAmount:((groupDiscountFixedCents??0)/100).toFixed(2)}:{}) })),
 })))
}

/** Native package input; historical two-option commands remain valid. */
export function packageInputs(input: unknown, tables: any[]) {
 let packages: any = input
 if (typeof packages === 'string') { try { packages = JSON.parse(packages) } catch { need(false, 'Invalid packages') } }
 need(Array.isArray(packages) && packages.length > 0, 'Offer at least one package')
 const ids = new Set<string>()
 return packages.map((item: any) => {
  need(object(item), 'Invalid package')
  const id = text(item.id, 'a package id', 80)
  need(/^[a-zA-Z0-9_-]+$/.test(id) && !ids.has(id), 'Package ids must be unique letters, numbers, hyphens or underscores')
  ids.add(id)
  const optional = item.optionalItems ?? []
  need(Array.isArray(optional), 'Optional items must be a list')
  const itemIds = new Set<string>()
  const optionalItems = optional.map((extra: any) => {
   need(object(extra), 'Invalid optional item')
   const id = text(extra.id, 'an optional-item id', 80)
   need(/^[a-zA-Z0-9_-]+$/.test(id) && !itemIds.has(id), 'Optional-item ids must be unique letters, numbers, hyphens or underscores')
   itemIds.add(id)
   const integer = (value: unknown) => { need(/^\d+$/.test(String(value)), 'Quantity limits must be positive whole numbers'); const n = Number(value); need(Number.isSafeInteger(n) && n >= 1 && n <= 1000000, 'Quantity limits must be from 1 to 1,000,000'); return n }
   const min = integer(extra.min), max = integer(extra.max), quantity = integer(extra.quantity)
   need(min <= quantity && quantity <= max, 'Default quantity must be within its minimum and maximum')
   need(typeof extra.editable === 'boolean', 'Choose whether quantity is client-editable')
   return { ...recurrenceInput(extra),id, label: text(extra.label, 'an optional-item name'), unitCents: dollars(extra.unitPrice), min, max, quantity, editable: extra.editable }
  })
  const discountBps=percentBps(item.discountPercent,'a package discount',9999)
  const discountFixedCents=fixedDiscount(item.discountAmount)
  need(item.showDiscount===undefined||[true,false,'yes','no'].includes(item.showDiscount),'Choose whether to show discounts')
  const concealDiscount=item.showDiscount===false||item.showDiscount==='no',discountExpiresOn=item.discountExpiresOn?calendarDate(item.discountExpiresOn):undefined
  return { ...(concealDiscount?{concealDiscount:true}:{}),...(discountExpiresOn?{discountExpiresOn}:{}),...(discountBps?{discountBps}:{}),...(discountFixedCents?{discountFixedCents}:{}),id, label: text(item.label, 'a package name'), cents: tables.some(t => t?.optionId === id) ? 1 : dollars(item.price, 'package:' + id), ...(optionalItems.length ? { optionalItems } : {}) }
 })
}

export const editablePackages = (options: any[]) => options.map(option => ({ id: option.id, label: option.label,showDiscount:option.concealDiscount?'no':'yes',discountExpiresOn:option.discountExpiresOn??'', price: ((option.discount?.grossCents??option.cents) / 100).toFixed(2),discountPercent:((option.discount?.bps??0)/100).toString(),discountAmount:((option.discount?.fixedCents??0)/100).toFixed(2), optionalItems: (option.optionalItems ?? []).map((item: any) => ({ ...item, unitPrice: (item.unitCents / 100).toFixed(2) })) }))
