export const packageFixture = () => ['one','two','three'].map((id,i)=>({id,label:['Essential','Growth','Complete'][i],price:['1000','2000','3000'][i],optionalItems:[
 {id:'rush',label:'Rush delivery',unitPrice:'75.25',min:1,max:10,quantity:1,editable:true},
 {id:'training',label:'Team training',unitPrice:'100',min:1,max:1,quantity:1,editable:false},
]}))
export const packageSelection = [{id:'rush',quantity:4}]
export const packageExpected = {totalCents:230100,depositCents:57525}

export const scheduleFixture=()=>({netDays:15,milestones:[{label:'Design approved',event:'Design approval',percent:50},{label:'Final delivery',date:'2099-03-01',percent:50}],retainer:{percent:10,startsOn:'2099-01-31',months:2}})
export const scheduleExpected=(total,deposit)=>({netDays:15,rows:[{kind:'deposit',label:'Deposit',event:'Acceptance',amountCents:deposit,netDays:0},{kind:'milestone',label:'Design approved',event:'Design approval',amountCents:Math.round((total-deposit)/2),netDays:15},{kind:'milestone',label:'Final delivery',date:'2099-03-01',amountCents:total-deposit-Math.round((total-deposit)/2),netDays:15},{kind:'retainer',label:'Monthly retainer',date:'2099-01-31',amountCents:Math.round(total*.1),netDays:15},{kind:'retainer',label:'Monthly retainer',date:'2099-02-28',amountCents:Math.round(total*.1),netDays:15}]})

// Independently calculated: 3301.00 taxable at 6.25%, 1% and 1%,
// rounded per jurisdiction, is 206.31 + 33.01 + 33.01 = 272.33.
// Total 3573.33; 30% deposit 1072.00; balance 2501.33 splits 1250.67 and 1250.66.
export const previewExpected={taxCents:27233,totalCents:357333,depositCents:107200,componentCents:[20631,0,3301,3301],paymentSchedule:{netDays:15,rows:[
 {kind:'deposit',label:'Deposit',event:'Acceptance',amountCents:107200,netDays:0},
 {kind:'milestone',label:'Design approved',event:'Design approval',amountCents:125067,netDays:15},
 {kind:'milestone',label:'Final delivery',date:'2099-03-01',amountCents:125066,netDays:15},
]}}
export const previewSelection=[{id:'rush',quantity:4}]
export const previewFixture=()=>({title:'Synthetic Platter combined preview',scope:'Synthetic Platter delivery scope.',terms:'Premium timeline: strategy in week one, delivery in week four.',sectionConditions:{terms:'premium'},depositPercent:30,
 packages:['basic','standard','premium'].map((id,i)=>({id,label:['Basic','Standard','Premium'][i],price:String((i+1)*1000),taxable:true,taxCode:'synthetic-platter-service',optionalItems:[{id:'rush',label:'Rush delivery',unitPrice:'75.25',min:1,max:10,quantity:1,editable:true,taxable:true,taxCode:'synthetic-platter-service'}]})),
 paymentTerms:{netDays:15,milestones:[{label:'Design approved',event:'Design approval',percent:50},{label:'Final delivery',date:'2099-03-01',percent:50}]}})
