import {zipSync,strToU8} from 'fflate'
import {readFile} from 'node:fs/promises'
export async function wordFixture({headings=3,rows=6,images=1,tokens=true,prefix='Synthetic section'}={}){
 const files={},p=(text,heading=false)=>'<w:p>'+(heading?'<w:pPr><w:pStyle w:val="Heading1"/></w:pPr>':'')+'<w:r><w:t>'+text+'</w:t></w:r></w:p>',cell=text=>'<w:tc>'+p(text)+'</w:tc>'
 const body=Array.from({length:headings},(_,i)=>p(prefix+' '+(i+1),true)+p((i===0&&tokens?'[Client.Company] [Sender.FirstName] [Unmapped.Case] ':'')+'Paragraph '+(i+1))).join('')+(rows?'<w:tbl>'+['SKU\tName\tQuantity\tPrice',...Array.from({length:rows},(_,i)=>'SKU'+(i+1)+'\tSynthetic product '+(i+1)+'\t'+(i+1)+'\t'+(10+i)+'.00')].map(r=>'<w:tr>'+r.split('\t').map(cell).join('')+'</w:tr>').join('')+'</w:tbl>':'')+Array.from({length:images},(_,i)=>'<w:p><w:r><w:drawing><a:blip r:embed="image'+i+'"/></w:drawing></w:r></w:p>').join('')
 files['word/document.xml']=strToU8('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>'+body+'</w:body></w:document>')
 files['word/_rels/document.xml.rels']=strToU8('<Relationships>'+Array.from({length:images},(_,i)=>'<Relationship Id="image'+i+'" Target="media/image'+i+'.png"/>').join('')+'</Relationships>')
 for(let i=0;i<images;i++)files['word/media/image'+i+'.png']=new Uint8Array(await readFile('fixtures/business/brand.png'))
 return zipSync(files)
}
export async function uploadDocument(h,id,version,bytes,name,extra={},status=200,cookie=h.owner){
 await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{cookie:h.owner,origin:h.origin,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'})
 const form=new FormData();for(const [key,value]of Object.entries({id,version:String(version),consent:'yes',...extra}))form.set(key,String(value));form.set('file',new File([bytes],name,{type:name.endsWith('.pdf')?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}))
 const request=new Request(h.origin+'/app/document-import',{method:'POST',headers:{cookie,origin:h.origin,accept:'application/json'},body:form}),response=await h.mf.dispatchFetch(request.url,{method:'POST',headers:request.headers,body:await request.arrayBuffer()}),text=await response.text()
 if(response.status!==status)throw Error('Document upload '+response.status+': '+text)
 return JSON.parse(text)
}
