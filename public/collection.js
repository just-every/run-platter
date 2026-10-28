(() => {
 const start=document.querySelector('[data-collection]'),pay=document.querySelector('[data-stripe-payment]'),feedback=document.querySelector('[data-payment-feedback]');if(!start||!pay)return;
 let stripe,elements,quote;
 const copy=JSON.parse(document.documentElement.dataset.clientCopy||'{}'),t=text=>copy[text]||text;
 const loadStripe=()=>window.Stripe?Promise.resolve():new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://js.stripe.com/v3/';script.onload=resolve;script.onerror=()=>reject(Error('Secure payment could not load. Refresh the payment status before trying again.'));document.head.append(script);});
 const report=message=>{feedback.textContent=String(t(message)).replace(/\b(?:pk|sk|rk)_(?:test|live)_[A-Za-z0-9*]+/g,'[Stripe credential]').replace(/\bpi_[A-Za-z0-9]+_secret_[A-Za-z0-9]+/g,'[payment credential]');feedback.focus();};
 start.addEventListener('submit',async event=>{
  event.preventDefault();const button=start.querySelector('button');button.disabled=true;
  try{
   const response=await fetch(start.action,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(start)))}),value=await response.json();
   if(!response.ok)throw Error(value.error||'Payment could not be prepared.');
   if(value.status==='succeeded'){location.reload();return;}
   await loadStripe();
   if(!value.clientSecret||!window.Stripe)throw Error('Secure payment is unavailable. Refresh the status or contact the firm.');
   quote=value.quote;stripe=window.Stripe(value.publishableKey);elements=stripe.elements({clientSecret:value.clientSecret,locale:document.documentElement.lang==='pt'?'pt-BR':document.documentElement.lang});
   const element=elements.create('payment',{wallets:{link:'never',applePay:value.methods.includes('apple_pay')?'auto':'never',googlePay:value.methods.includes('google_pay')?'auto':'never'}});const payButton=pay.querySelector('button');payButton.disabled=true;element.on('change',event=>{payButton.disabled=!event.complete;});element.mount('[data-payment-element]');
   start.hidden=true;pay.hidden=false;
   const summary=document.createElement('dl');
   for(const [label,cents] of [['Deposit',value.quote.depositCents],...(value.quote.feeCents?[['Card fee',value.quote.feeCents]]:[]),['Total payment',value.quote.cents]]){
    const term=document.createElement('dt'),amount=document.createElement('dd');term.textContent=t(label);amount.textContent=(cents/100).toFixed(2)+' USD';summary.append(term,amount);
   }
   pay.prepend(summary);pay.querySelector('button').textContent=t('Pay ')+(value.quote.cents/100).toFixed(2)+t(' USD deposit');report(value.authorization);
  }catch(error){report(error.message);}finally{button.disabled=false;}
 });
 pay.addEventListener('submit',async event=>{
  event.preventDefault();const button=pay.querySelector('button');button.disabled=true;
  try{
   const consent=await fetch(location.pathname+'/payment-consent.json',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({consent:true,cents:quote.cents})});if(!consent.ok)throw Error('Review the exact payment total before paying.');
   const result=await stripe.confirmPayment({elements,confirmParams:{return_url:location.origin+location.pathname},redirect:'if_required'});
   const response=await fetch(location.pathname+'/payment-status.json',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}),value=await response.json();
   if(!response.ok)throw Error(value.error||'Refresh payment status before trying again.');
   if(result.error){report(result.error.message);return;}
   location.reload();
  }catch(error){report(error.message);}finally{button.disabled=false;}
 });
})();
