export const documentFixture = () => ({version:1,brand:{name:'Synthetic Platter Studio',accent:'#7c144a',ink:'#1c1c24',paper:'#ffffff',font:'serif',cover:'A considered proposal'},blocks:[
 {id:'cover',type:'cover',title:'A considered proposal',text:'Prepared for the synthetic client.'},
 {id:'intro',type:'heading',title:'The project',text:''},
 {id:'story',type:'text',title:'Our approach',text:'A **careful** plan, _clear_ communication.\n- Research\n- Delivery'},
 {id:'columns',type:'columns',title:'Two perspectives',text:'First column content.',second:'Second column content.'},
 {id:'quote',type:'quote',title:'Client testimonial',text:'A thoughtful creative partner.'},
 {id:'bio',type:'bio',title:'Your team',text:'Synthetic Platter lead designer.'},
 {id:'case',type:'case_study',title:'Previous project',text:'A measurable improvement.'},
 {id:'terms',type:'terms',title:'Document terms',text:'Delivery after written approval.'},
 {id:'page',type:'page_break',title:'',text:''},
 {id:'extra',type:'text',title:'Campaign timeline',text:'Only the second package includes this timeline.',condition:'two'},
]})
