import { need } from './model'

/** All offer selections use integer cents and nearest-cent deposit rounding. */
export function offerSelection(options: {id:string; cents:number; label:string}[], depositBps:number, optionId:unknown) {
 const option=options.find(option=>option.id===optionId)
 need(option,'Choose one offered option')
 return {option,deposit:Math.round(option.cents*depositBps/10000)}
}
