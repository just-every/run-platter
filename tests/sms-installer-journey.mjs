import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {cp,mkdir,mkdtemp,rm,symlink,writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'

/** Use the actual installer page; no install or provider request is approved. */
export async function smsInstallerJourney(browser){
 const temporary=await mkdtemp(join(tmpdir(),'platter-sms-installer-'))
 let child,stopped
 try{
  for(const path of ['scripts','public','package.json','rer-setup.json','deploy.json'])await cp(path,join(temporary,path),{recursive:true})
  await mkdir(join(temporary,'src'));await cp('src/branding.json',join(temporary,'src/branding.json'))
  await symlink(resolve('node_modules'),join(temporary,'node_modules'),'dir')
  const answers=join(temporary,'answers.json')
  await writeFile(answers,JSON.stringify({APP_NAME:'Synthetic Platter firm',PRIMARY_COLOR:'#1F2121',OWNER_EMAIL:'synthetic-platter-1@example.invalid',MAIL_PROVIDER:'development',SMS_PROVIDER:'twilio',TWILIO_FROM:'+15005550006'}),{mode:0o600})
  child=spawn(process.execPath,['scripts/install.mjs','--no-open','--answers',answers],{cwd:temporary,stdio:['ignore','pipe','pipe']})
  stopped=new Promise(resolve=>child.once('exit',resolve))
  const origin=await new Promise((resolve,reject)=>{
   let output=''
   const timeout=setTimeout(()=>reject(Error('The installer did not start within 30 seconds')),30000)
   child.stdout.on('data',data=>{output+=data;const match=output.match(/installer: (http:\/\/[^\s]+)/);if(match){clearTimeout(timeout);resolve(match[1])}})
   child.once('exit',code=>{clearTimeout(timeout);reject(Error('Installer exited '+code))})
   child.stderr.on('data',()=>{})
  })
  for(const width of [1440,390]){
   const context=await browser.newContext({viewport:{width,height:1000}})
   try{
    const page=await context.newPage();await page.goto(origin)
    await page.getByRole('heading',{name:'Optional proposal texts',exact:true}).waitFor()
    await page.getByText('Your answers',{exact:true}).click()
    await page.getByRole('button',{name:'Edit Optional proposal texts',exact:true}).click()
    await page.locator('#SMS_PROVIDER').selectOption('twilio')
    for(const key of ['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_FROM'])assert.equal(await page.locator('#'+key).isVisible(),true)
    assert.equal(await page.locator('#continue').isDisabled(),true,'missing credentials prevent setup from continuing')
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
    if(process.env.PLATTER_SCREENSHOTS)await page.screenshot({path:join(process.env.PLATTER_SCREENSHOTS,'SEND-008-installer-'+width+'.png'),fullPage:true})
    await page.locator('#TWILIO_ACCOUNT_SID').fill('synthetic-platter-1')
    await page.locator('#TWILIO_AUTH_TOKEN').fill('synthetic-platter-2')
    await page.locator('#TWILIO_FROM').fill('+15005550006')
    assert.equal(await page.locator('#continue').isEnabled(),true)
    await page.locator('#SMS_PROVIDER').selectOption('disabled')
    assert.equal(await page.locator('#TWILIO_AUTH_TOKEN').count(),0,'disabled SMS requires no provider credentials')
    await page.locator('#SMS_PROVIDER').selectOption('twilio')
   }finally{await context.close()}
  }
 }finally{
  if(child){child.kill('SIGTERM');await stopped}
  await rm(temporary,{recursive:true,force:true})
 }
}
