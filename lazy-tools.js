(()=>{
  const loaded=new Set();
  function script(src){return new Promise((resolve,reject)=>{if(loaded.has(src))return resolve();const s=document.createElement('script');s.src=src;s.onload=()=>{loaded.add(src);resolve()};s.onerror=()=>reject(new Error(`Could not load ${src}`));document.body.appendChild(s)})}
  async function loadEmail(){if(loaded.has('/email-center.js'))return;try{await script('/email-center.js')}catch(e){console.error(e);alert('The Email Center could not load. Refresh the page and try again.') }}
  async function loadProgramFlow(){if(loaded.has('/program-flow.js'))return;try{await script('https://unpkg.com/pizzip@3.2.0/dist/pizzip.js');await script('https://unpkg.com/docxtemplater@3.71.0/build/docxtemplater.js');await script('/program-flow.js')}catch(e){console.error(e);alert('Program Flow tools could not load. Refresh the page and try again.') }}
  document.querySelector('.nav button[data-view="email"]')?.addEventListener('click',loadEmail);
  document.querySelector('.nav button[data-view="events"]')?.addEventListener('click',loadProgramFlow);
})();
