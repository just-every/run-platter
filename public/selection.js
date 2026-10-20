// A different package starts with no optional items from the previous package.
for(const form of document.querySelectorAll('form[data-package-selection]')) {
 form.querySelector('select[name=optionId]')?.addEventListener('change',()=>{
  for(const input of form.querySelectorAll('input[type=checkbox]'))input.checked=false;
 });
}
