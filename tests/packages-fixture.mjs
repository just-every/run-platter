export const packageFixture = () => ['one','two','three'].map((id,i)=>({id,label:['Essential','Growth','Complete'][i],price:['1000','2000','3000'][i],optionalItems:[
 {id:'rush',label:'Rush delivery',unitPrice:'75.25',min:1,max:10,quantity:1,editable:true},
 {id:'training',label:'Team training',unitPrice:'100',min:1,max:1,quantity:1,editable:false},
]}))
export const packageSelection = [{id:'rush',quantity:4}]
export const packageExpected = {totalCents:230100,depositCents:57525}
