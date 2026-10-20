// Hand-calculated cents include half-cent and fractional-quantity boundaries.
export const pricingFixture = () => [
 {optionId:'one',name:'Project services',lines:[
  ['Discovery', '1.5','hour','10.01',1502],['Workshop','2.25','hour','2.22',500],['Rounding consultation','0.125','hour','0.04',1],
  ['Delivery','3','day','100.00',30000],['Licence','1','project','9.99',999],['Follow-up','0.001','hour','5.00',1],
 ].map(([name,quantity,unit,unitPrice,expected],i)=>({name,description:`Agreed ${name.toLowerCase()} service`,quantity,unit,unitPrice,group:i<3?'Discovery group':'Delivery group',expected}))},
 {optionId:'one',name:'Retained support',lines:[
  ['Support','2','month','20.00',4000],['Training','0.5','day','3.33',167],['Review','1.111','hour','9.99',1110],
  ['Asset','4','each','0.01',4],['Maintenance','2.005','hour','10.00',2005],['Handover','1','project','1.00',100],
 ].map(([name,quantity,unit,unitPrice,expected],i)=>({name,description:`Agreed ${name.toLowerCase()} service`,quantity,unit,unitPrice,group:i<3?'Support group':'Completion group',expected}))},
]
export const pricingExpected = {tableCents:[33003,7386],groupCents:[[2003,31000],[5277,2109]],grandCents:40389,depositCents:10097}
