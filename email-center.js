(()=>{
  const $=id=>document.getElementById(id);
  const SETTINGS_KEY='leagueSpeakerManagement.settings.v2';
  const defaultTemplates=[
    {id:'tmpl_invitation',name:'Invitation',messageType:'invitation',subject:'Invitation to present at {{event_name}}',body:'Hi {{first_name}},\n\nWe would like to invite you to present at {{event_name}}. Your proposed session is “{{session_title}}.”\n\nPlease reply to confirm whether you are available to participate.\n\nThank you,'},
    {id:'tmpl_materials',name:'Speaker materials reminder',messageType:'materials',subject:'{{event_name}} speaker materials',body:'Hi {{first_name}},\n\nWe are preparing speaker materials for {{event_name}} and are following up on your session, “{{session_title}}.”\n\nPlease send any outstanding materials at your earliest convenience.\n\nThank you,'},
    {id:'tmpl_bio_headshot',name:'Bio & headshot reminder',messageType:'materials',subject:'Bio and headshot needed for {{event_name}}',body:'Hi {{first_name}},\n\nWe are finalizing speaker information for {{event_name}} and still need your bio and/or headshot for “{{session_title}}.”\n\nPlease send the outstanding item(s) at your earliest convenience.\n\nThank you,'},
    {id:'tmpl_slides',name:'Slides reminder',messageType:'materials',subject:'Slides reminder for {{event_name}}',body:'Hi {{first_name}},\n\nWe are preparing for {{event_name}} and are following up on slides for your session, “{{session_title}}.”\n\nPlease send your final slides at your earliest convenience.\n\nThank you,'},
    {id:'tmpl_registration',name:'Registration reminder',messageType:'registration',subject:'Registration reminder for {{event_name}}',body:'Hi {{first_name}},\n\nOur records show that your registration for {{event_name}} is not yet complete. Please complete registration when you are able.\n\nSession: {{session_title}}\n\nThank you,'},
    {id:'tmpl_logistics',name:'Final logistics',messageType:'logistics',subject:'Final logistics for {{event_name}}',body:'Hi {{first_name}},\n\nBelow are the final details for your session at {{event_name}}.\n\nSession: {{session_title}}\nDate: {{session_date}}\nTime: {{session_time}}\nRoom: {{room}}\n\nThank you for joining us as a presenter.'},
    {id:'tmpl_thanks',name:'Thank you',messageType:'thanks',subject:'Thank you for presenting at {{event_name}}',body:'Hi {{first_name}},\n\nThank you for presenting at {{event_name}}. We appreciate the time and expertise you shared with our members through “{{session_title}}.”\n\nThank you,'}
  ];

  let mailState={events:[],sessions:[],speakers:[],communications:[],emailTemplates:[]};
  let initialized=false;
  let rendering=false;

  function esc(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt',"'":'&#039;','"':'&quot;'}[c]))}
  function norm(v){return String(v??'').trim()}
  function uid(prefix='id'){return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`}
  function eventById(id){return mailState.events.find(e=>e.id===id)}
  function sessionById(id){return mailState.sessions.find(s=>s.id===id)}
  function sessionForSpeaker(s){return sessionById(s?.sessionId)}
  function fmtDate(v){if(!v)return'';const d=new Date(v+'T12:00:00');return Number.isNaN(d.getTime())?v:d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}
  function localSettings(){try{return{fromName:'',fromEmail:'',...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')}}catch{return{fromName:'',fromEmail:''}}}

  async function api(path,options={}){
    const r=await fetch(path,{...options,headers:{'content-type':'application/json',...(options.headers||{})}});
    let body;try{body=await r.json()}catch{body={ok:false,error:`Non-JSON response (${r.status})`}}
    if(!r.ok)throw new Error(body.error||`Request failed (${r.status})`);
    return body;
  }

  async function loadState(){
    const data=await api('/api/state');
    mailState={events:[],sessions:[],speakers:[],communications:[],emailTemplates:[],...(data.state||{})};
    return mailState;
  }

  async function seedTemplates(){
    if(mailState.emailTemplates.length)return;
    const records=defaultTemplates.map(t=>({type:'email-template',id:t.id,payload:{name:t.name,messageType:t.messageType,subject:t.subject,body:t.body}}));
    await api('/api/batch',{method:'POST',body:JSON.stringify({records})});
    await loadState();
  }

  function shell(){
    const view=$('view-email');
    if(!view)return;
    view.innerHTML=`
      <div class="grid email-grid">
        <div class="panel">
          <div class="toolbar"><div><h3>Recipients</h3><div class="hint">Filter the event roster, then choose exactly who should receive this message.</div></div><span id="emailRecipientCount" class="badge neutral">0 selected</span></div>
          <div class="form-grid two">
            <div class="field span-2"><label>Event</label><select id="emailEventFilter"><option value="">Choose an event</option></select></div>
            <div class="field"><label>Session</label><select id="emailSessionFilter"><option value="">Any session</option></select></div>
            <div class="field"><label>Speaker status</label><select id="emailStatusFilter"><option value="">Any status</option><option>Invited</option><option>Confirmed</option><option>Ready</option><option>Complete</option></select></div>
            <div class="field span-2"><label>Outstanding item</label><select id="emailNeedFilter"><option value="">Any readiness status</option><option value="bio">Bio missing</option><option value="headshot">Headshot missing</option><option value="slides">Slides missing</option><option value="registration">Registration incomplete</option><option value="logistics">Logistics not sent</option></select></div>
          </div>
          <div class="toolbar" style="margin-top:10px"><div class="toolbar-left"><button class="btn small" id="emailSelectAll">Select all shown</button><button class="btn small" id="emailSelectNone">Clear selection</button></div></div>
          <div class="recipient-list" id="recipientList"><div class="empty">Choose an event to load speakers.</div></div>
        </div>

        <div class="panel">
          <div class="toolbar"><div><h3>Compose & send</h3><div class="hint">Templates are shared across authorized League staff.</div></div></div>
          <div class="form-grid two">
            <div class="field span-2"><label>Shared template</label><select id="emailTemplate"></select></div>
            <div class="field"><label>Template name</label><input id="emailTemplateName"></div>
            <div class="field"><label>Message type</label><select id="emailMessageType"><option value="invitation">Invitation</option><option value="materials">Materials</option><option value="registration">Registration</option><option value="logistics">Final logistics</option><option value="thanks">Thank you</option><option value="custom">Custom</option></select></div>
            <div class="field span-2"><label>Subject</label><input id="emailSubject"></div>
            <div class="field span-2"><label>Message</label><textarea id="emailBody" class="email-body"></textarea></div>
          </div>
          <p class="hint">Merge fields: {{first_name}}, {{last_name}}, {{email}}, {{title}}, {{organization}}, {{event_name}}, {{event_location}}, {{event_start_date}}, {{event_end_date}}, {{session_title}}, {{session_date}}, {{session_time}}, {{room}}.</p>
          <div class="toolbar"><div class="toolbar-left"><button class="btn small" id="emailNewTemplate">New template</button><button class="btn small" id="emailSaveTemplate">Save shared template</button><button class="btn small danger" id="emailDeleteTemplate">Delete template</button></div></div>
          <hr style="border:0;border-top:1px solid #e5e7eb;margin:18px 0">
          <div class="form-grid two">
            <div class="field"><label>Staff sender name</label><input id="emailSenderName"></div>
            <div class="field"><label>Staff contact email</label><input id="emailReplyTo" type="email"></div>
            <div class="field span-2"><div class="hint">These values are recorded in communication history. The actual autoresponder Reply-To address is controlled in Jotform and is configured once during setup.</div></div>
            <div class="field span-2"><label>Test recipient email</label><input id="emailTestAddress" type="email" placeholder="Send a proof to yourself before the batch"></div>
          </div>
          <div class="toolbar"><div class="toolbar-left"><button class="btn" id="previewEmailBtn">Preview first selected</button><button class="btn" id="emailSendTest">Send test</button></div><button class="btn primary" id="sendConnectedBtn">Send through Jotform</button></div>
          <div id="emailSendNotice" class="notice" style="margin-top:12px">Direct sending is ready in the dashboard once the Jotform dispatcher autoresponder is configured.</div>
          <div id="emailPreviewWrap" class="hidden"><div class="email-preview" id="emailPreview"></div></div>
        </div>
      </div>
      <div class="panel" style="margin-top:18px">
        <div class="toolbar"><div><h3>Communication history</h3><div class="hint">Successful dashboard sends are logged here. “Submitted” means Jotform accepted the form submission; it is not a mailbox-delivery receipt.</div></div><button class="btn small" id="emailRefresh">Refresh</button></div>
        <div class="table-wrap" id="emailHistory"></div>
      </div>`;

    const st=localSettings();
    $('emailSenderName').value=st.fromName||'League of Wisconsin Municipalities';
    $('emailReplyTo').value=st.fromEmail||'';
  }

  function populateEventOptions(){
    const el=$('emailEventFilter'); if(!el)return;
    const prior=el.value;
    el.innerHTML='<option value="">Choose an event</option>'+mailState.events.map(e=>`<option value="${esc(e.id)}">${esc(e.name)}</option>`).join('');
    if(mailState.events.some(e=>e.id===prior))el.value=prior;
  }

  function populateSessionOptions(){
    const eventId=$('emailEventFilter')?.value||'';
    const el=$('emailSessionFilter'); if(!el)return;
    const prior=el.value;
    const sessions=mailState.sessions.filter(s=>!eventId||s.eventId===eventId).sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.time||'').localeCompare(b.time||'')||(a.title||'').localeCompare(b.title||''));
    el.innerHTML='<option value="">Any session</option>'+sessions.map(s=>`<option value="${esc(s.id)}">${esc(s.title)}</option>`).join('');
    if(sessions.some(s=>s.id===prior))el.value=prior;
  }

  function filteredRecipients(){
    const eventId=$('emailEventFilter')?.value||'',sessionId=$('emailSessionFilter')?.value||'',status=$('emailStatusFilter')?.value||'',need=$('emailNeedFilter')?.value||'';
    if(!eventId)return[];
    let ss=mailState.speakers.filter(s=>s.eventId===eventId&&s.email&&s.speakerStatus!=='Declined');
    if(sessionId)ss=ss.filter(s=>s.sessionId===sessionId);
    if(status)ss=ss.filter(s=>s.speakerStatus===status);
    if(need==='bio')ss=ss.filter(s=>!s.bioStatus||s.bioStatus==='Missing');
    if(need==='headshot')ss=ss.filter(s=>!s.headshotStatus||s.headshotStatus==='Missing');
    if(need==='slides')ss=ss.filter(s=>!s.slidesStatus||s.slidesStatus==='Missing');
    if(need==='registration')ss=ss.filter(s=>!['Complete','Not required'].includes(s.registrationStatus));
    if(need==='logistics')ss=ss.filter(s=>!['Sent','Acknowledged'].includes(s.logisticsStatus));
    return ss.sort((a,b)=>(a.lastName||'').localeCompare(b.lastName||'')||(a.firstName||'').localeCompare(b.firstName||''));
  }

  function renderRecipients(){
    if(rendering)return; rendering=true;
    try{
      const el=$('recipientList'); if(!el)return;
      const ss=filteredRecipients();
      if(!$('emailEventFilter')?.value){el.innerHTML='<div class="empty">Choose an event to load speakers.</div>';updateCount();return}
      el.innerHTML=ss.length?ss.map(s=>`<label class="recipient-row"><input class="recipientCheck" type="checkbox" value="${esc(s.id)}" checked><span><strong>${esc(s.firstName)} ${esc(s.lastName)}</strong><br><span class="muted">${esc(s.email)} · ${esc(sessionForSpeaker(s)?.title||'Unassigned')}</span></span></label>`).join(''):'<div class="empty">No speakers match the current filters.</div>';
      el.querySelectorAll('.recipientCheck').forEach(c=>c.addEventListener('change',updateCount));
      updateCount();
    }finally{rendering=false}
  }

  function selectedRecipients(){return [...document.querySelectorAll('#recipientList .recipientCheck:checked')].map(c=>mailState.speakers.find(s=>s.id===c.value)).filter(Boolean)}
  function updateCount(){const n=selectedRecipients().length,total=document.querySelectorAll('#recipientList .recipientCheck').length;const el=$('emailRecipientCount');if(el)el.textContent=`${n} selected${total?` of ${total}`:''}`}

  function merge(text,s){
    const e=eventById(s.eventId)||{},ses=sessionForSpeaker(s)||{};
    const f={first_name:s.firstName,last_name:s.lastName,email:s.email,title:s.title,organization:s.organization,event_name:e.name,event_location:e.location,event_start_date:fmtDate(e.startDate),event_end_date:fmtDate(e.endDate),session_title:ses.title,session_date:fmtDate(ses.date),session_time:ses.time,room:ses.room};
    return String(text||'').replace(/\{\{(\w+)\}\}/g,(_,k)=>f[k]??'');
  }

  function renderTemplateOptions(selected=''){
    const el=$('emailTemplate'); if(!el)return;
    const sorted=[...mailState.emailTemplates].sort((a,b)=>(a.name||'').localeCompare(b.name||''));
    el.innerHTML=sorted.map(t=>`<option value="${esc(t.id)}">${esc(t.name||'Untitled template')}</option>`).join('')+'<option value="__custom">Custom / unsaved</option>';
    if(sorted.some(t=>t.id===selected))el.value=selected;else if(sorted.length)el.value=sorted[0].id;else el.value='__custom';
    applySelectedTemplate();
  }

  function applySelectedTemplate(){
    const id=$('emailTemplate')?.value;
    const t=mailState.emailTemplates.find(x=>x.id===id);
    if(!t){$('emailTemplateName').value='';$('emailMessageType').value='custom';$('emailSubject').value='';$('emailBody').value='';return}
    $('emailTemplateName').value=t.name||'';$('emailMessageType').value=t.messageType||'custom';$('emailSubject').value=t.subject||'';$('emailBody').value=t.body||'';
  }

  async function saveTemplate(){
    const name=norm($('emailTemplateName').value),subject=norm($('emailSubject').value),body=norm($('emailBody').value),messageType=$('emailMessageType').value;
    if(!name||!subject||!body)return alert('Template name, subject, and message are required.');
    const current=$('emailTemplate').value;
    const id=current&&current!=='__custom'?current:uid('tmpl');
    $('emailSaveTemplate').disabled=true;
    try{
      await api('/api/record',{method:'POST',body:JSON.stringify({type:'email-template',id,payload:{name,messageType,subject,body}})});
      await loadState();renderTemplateOptions(id);renderHistory();
      setNotice(`Shared template “${name}” saved.`,'success');
    }catch(e){setNotice('Could not save template: '+e.message,'error')}finally{$('emailSaveTemplate').disabled=false}
  }

  async function deleteTemplate(){
    const id=$('emailTemplate').value,t=mailState.emailTemplates.find(x=>x.id===id);
    if(!t)return alert('Choose a saved template first.');
    if(!confirm(`Delete the shared template “${t.name}”?`))return;
    try{await api(`/api/record?type=email-template&id=${encodeURIComponent(id)}`,{method:'DELETE'});await loadState();renderTemplateOptions();setNotice('Template deleted.','success')}catch(e){setNotice('Could not delete template: '+e.message,'error')}
  }

  function newTemplate(){
    $('emailTemplate').value='__custom';$('emailTemplateName').value='';$('emailMessageType').value='custom';$('emailSubject').value='';$('emailBody').value='';$('emailTemplateName').focus();
  }

  function preview(){
    const s=selectedRecipients()[0];if(!s)return alert('Select at least one recipient.');
    $('emailPreview').textContent=`To: ${s.email}\nSubject: ${merge($('emailSubject').value,s)}\n\n${merge($('emailBody').value,s)}`;$('emailPreviewWrap').classList.remove('hidden');
  }

  function setNotice(text,type=''){const el=$('emailSendNotice');if(!el)return;el.className='notice'+(type==='error'?' error':type==='warning'?' warning':'');el.textContent=text}

  function messageFor(s,toOverride=''){
    return {to:toOverride||s.email,recipientName:`${s.firstName||''} ${s.lastName||''}`.trim(),senderName:norm($('emailSenderName').value)||'League of Wisconsin Municipalities',replyTo:norm($('emailReplyTo').value),subject:merge($('emailSubject').value,s),body:merge($('emailBody').value,s),speakerId:s.id,eventId:s.eventId,messageType:$('emailMessageType').value||'custom'};
  }

  async function sendPayload(messages){
    const r=await fetch('/api/email',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({messages})});
    let body;try{body=await r.json()}catch{throw new Error(`Jotform bridge returned HTTP ${r.status}`)}
    if(!r.ok&&r.status!==207)throw new Error(body.error||`Jotform bridge returned HTTP ${r.status}`);
    return body;
  }

  async function sendTest(){
    const s=selectedRecipients()[0];if(!s)return alert('Select at least one speaker so the test can use real merge data.');
    const to=norm($('emailTestAddress').value);if(!to)return alert('Enter a test recipient email address.');
    $('emailSendTest').disabled=true;setNotice(`Submitting a test message to ${to}…`);
    try{const result=await sendPayload([{...messageFor(s,to),messageType:'test',speakerId:'',eventId:s.eventId}]);const ok=result.results?.[0]?.ok;if(ok)setNotice(`Test submitted to Jotform for ${to}. Check the inbox before sending the batch.`,'success');else setNotice(`Jotform did not accept the test message. ${result.results?.[0]?.error||''}`,'error')}catch(e){setNotice('Test send failed: '+e.message,'error')}finally{$('emailSendTest').disabled=false}
  }

  async function sendBatch(){
    const recipients=selectedRecipients();if(!recipients.length)return alert('Select at least one recipient.');
    const subject=norm($('emailSubject').value),body=norm($('emailBody').value);if(!subject||!body)return alert('Subject and message are required.');
    const event=eventById($('emailEventFilter').value),template=mailState.emailTemplates.find(t=>t.id===$('emailTemplate').value),label=template?.name||norm($('emailTemplateName').value)||'Custom message';
    if(!confirm(`Send ${recipients.length} personalized email${recipients.length===1?'':'s'} through Jotform?\n\nEvent: ${event?.name||''}\nTemplate: ${label}\n\nEach successful submission will be recorded in Communication History.`))return;
    const messages=recipients.map(s=>messageFor(s));
    $('sendConnectedBtn').disabled=true;setNotice(`Submitting ${messages.length} personalized message${messages.length===1?'':'s'} to Jotform…`);
    let result;
    try{result=await sendPayload(messages)}catch(e){setNotice('Send failed before completion: '+e.message,'error');$('sendConnectedBtn').disabled=false;return}
    const now=new Date().toISOString(),records=[],speakerUpdates=new Map();
    (result.results||[]).forEach((r,i)=>{
      if(!r.ok)return;
      const s=recipients[i],m=messages[i];if(!s)return;
      records.push({type:'communication',id:uid('comm'),payload:{eventId:s.eventId,sessionId:s.sessionId,speakerId:s.id,recipientName:m.recipientName,to:m.to,templateId:template?.id||'',templateName:label,messageType:m.messageType,subject:m.subject,body:m.body,senderName:m.senderName,staffContactEmail:m.replyTo,status:'Submitted',provider:'Jotform',providerStatus:r.status,sentAt:now}});
      if(m.messageType==='logistics'&&s.logisticsStatus==='Not sent'){
        const updated={...s,logisticsStatus:'Sent'};delete updated.id;delete updated._updatedAt;speakerUpdates.set(s.id,{type:'speaker',id:s.id,payload:updated});
      }
    });
    records.push(...speakerUpdates.values());
    try{
      if(records.length)await api('/api/batch',{method:'POST',body:JSON.stringify({records})});
      await loadState();populateEventOptions();populateSessionOptions();renderRecipients();renderHistory();
      const sent=result.sent||0,failed=result.failed||0;
      setNotice(`${sent} message${sent===1?'':'s'} submitted to Jotform${failed?`; ${failed} failed and were not logged`:''}. ${speakerUpdates.size?`${speakerUpdates.size} logistics status${speakerUpdates.size===1?'':'es'} updated to Sent.`:''}`,failed?'warning':'success');
    }catch(e){setNotice(`Jotform accepted ${result.sent||0} message(s), but the dashboard could not finish communication logging/status updates. Do not resend until you refresh and verify history. Error: ${e.message}`,'error')}
    finally{$('sendConnectedBtn').disabled=false}
  }

  function renderHistory(){
    const el=$('emailHistory');if(!el)return;
    const eventId=$('emailEventFilter')?.value||'';
    let rows=[...mailState.communications];if(eventId)rows=rows.filter(c=>c.eventId===eventId);
    rows.sort((a,b)=>(b.sentAt||b._updatedAt||'').localeCompare(a.sentAt||a._updatedAt||''));
    if(!rows.length){el.innerHTML='<div class="empty">No dashboard communications have been logged for this selection.</div>';return}
    el.innerHTML=`<table><thead><tr><th>Date</th><th>Recipient</th><th>Event / session</th><th>Type</th><th>Subject</th><th>Staff sender</th><th>Status</th></tr></thead><tbody>${rows.slice(0,100).map(c=>{const e=eventById(c.eventId),ses=sessionById(c.sessionId),d=c.sentAt?new Date(c.sentAt):null;return `<tr><td>${esc(d&&!Number.isNaN(d.getTime())?d.toLocaleString():c.sentAt||'')}</td><td><strong>${esc(c.recipientName||'')}</strong><br><span class="muted">${esc(c.to||'')}</span></td><td>${esc(e?.name||'')}<br><span class="muted">${esc(ses?.title||'')}</span></td><td>${esc(c.templateName||c.messageType||'')}</td><td>${esc(c.subject||'')}</td><td>${esc(c.senderName||'')}<br><span class="muted">${esc(c.staffContactEmail||'')}</span></td><td><span class="badge success">${esc(c.status||'Submitted')}</span></td></tr>`}).join('')}</tbody></table>`;
  }

  function bind(){
    $('emailEventFilter').onchange=()=>{populateSessionOptions();renderRecipients();renderHistory()};
    $('emailSessionFilter').onchange=renderRecipients;$('emailStatusFilter').onchange=renderRecipients;$('emailNeedFilter').onchange=renderRecipients;
    $('emailSelectAll').onclick=()=>{document.querySelectorAll('#recipientList .recipientCheck').forEach(c=>c.checked=true);updateCount()};
    $('emailSelectNone').onclick=()=>{document.querySelectorAll('#recipientList .recipientCheck').forEach(c=>c.checked=false);updateCount()};
    $('emailTemplate').onchange=applySelectedTemplate;$('emailNewTemplate').onclick=newTemplate;$('emailSaveTemplate').onclick=saveTemplate;$('emailDeleteTemplate').onclick=deleteTemplate;
    $('previewEmailBtn').onclick=preview;$('emailSendTest').onclick=sendTest;$('sendConnectedBtn').onclick=sendBatch;$('emailRefresh').onclick=refresh;
    const list=$('recipientList');if(list)new MutationObserver(()=>{if(!rendering)queueMicrotask(renderRecipients)}).observe(list,{childList:true});
    const nav=document.querySelector('.nav button[data-view="email"]');if(nav)nav.addEventListener('click',()=>setTimeout(refresh,0));
  }

  async function refresh(){
    try{await loadState();await seedTemplates();populateEventOptions();populateSessionOptions();renderTemplateOptions($('emailTemplate')?.value||'');renderRecipients();renderHistory();setNotice('Email Center is connected. Use Send test before the first production batch.','success')}catch(e){setNotice('Email Center could not load shared data: '+e.message,'error')}
  }

  async function init(){
    if(initialized)return;initialized=true;shell();bind();await refresh();
    window.SMEmailCenter={refresh,renderRecipients};
  }
  init();
})();
