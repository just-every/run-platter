import { need } from './model'

export function selectionItems(input: Record<string, any>): unknown {
 if (input.items !== undefined) {
  if (typeof input.items !== 'string') return input.items
  try { return JSON.parse(input.items) } catch { need(false, 'Invalid optional-item selection') }
 }
 return Object.keys(input).filter(key => key.startsWith('add.')).map(key => ({ id: key.slice(4), quantity: input['qty.' + key.slice(4)] }))
}

/** One server calculation for preview, review, PDF and the frozen agreement. */
export function offerSelection(options: any[], depositBps: number, optionId: unknown, input: unknown = []) {
 const offered = options.find(option => option.id === optionId)
 need(offered, 'Choose one offered option')
 need(Array.isArray(input), 'Optional-item selection must be a list')
 const seen = new Set<string>()
 const items = input.map((choice: any) => {
  need(choice && typeof choice === 'object' && !Array.isArray(choice), 'Invalid optional-item selection')
  const item = (offered.optionalItems ?? []).find((item: any) => item.id === choice.id)
  need(item && !seen.has(choice.id), 'Choose each offered optional item at most once')
  seen.add(choice.id)
  const raw = String(choice.quantity ?? '')
  need(/^\d+$/.test(raw), 'Optional-item quantity must be a whole number')
  const quantity = Number(raw)
  need(Number.isSafeInteger(quantity) && quantity >= item.min && quantity <= item.max, `Quantity for ${item.label} must be from ${item.min} to ${item.max}`)
  need(item.editable || quantity === item.quantity, `Quantity for ${item.label} is fixed`)
  const totalCents = quantity * item.unitCents
  need(Number.isSafeInteger(totalCents), 'Invalid optional-item total')
  return { id: item.id, label: item.label, quantity, unitCents: item.unitCents, totalCents }
 })
 // Freeze items in the sender's order, independent of request order.
 items.sort((a: any, b: any) => offered.optionalItems.findIndex((x: any) => x.id === a.id) - offered.optionalItems.findIndex((x: any) => x.id === b.id))
 const cents = offered.cents + items.reduce((sum: number, item: any) => sum + item.totalCents, 0)
 need(Number.isSafeInteger(cents) && cents <= 1000000000, 'Selected total must not exceed $10,000,000')
 return { option: { ...offered, cents }, items, baseCents: offered.cents, deposit: Math.round(cents * depositBps / 10000) }
}
