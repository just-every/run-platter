import { escape } from './shared'
export function recurrenceEditor(item:any,kind:string):string {
 const r=item.recurrence
 return '<label>Billing interval<select data-'+kind+'-field="interval">'+['one-off','weekly','monthly','quarterly','annual'].map(interval=>'<option value="'+interval+'"'+(interval===(r?.interval??'one-off')?' selected':'')+'>'+interval+'</option>').join('')+'</select></label><label>Recurring installments<input data-'+kind+'-field="term" type="number" min="1" max="120" value="'+escape(r?.term??'')+'"></label><label>Recurring start date<input data-'+kind+'-field="startsOn" type="date" value="'+escape(r?.startsOn??'')+'"></label>'
}
