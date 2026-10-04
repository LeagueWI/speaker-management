(()=>{
  const nativeFetch=window.fetch.bind(window);
  let fullState={events:[],sessions:[],speakers:[],communications:[]};
  let selectedArchiveId='';
  let emailIncludeArchived=false;
  let programIncludeArchived=false;
  let applyQueued=false;

  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt',"'":'&#039;','"':'&quot;'}[c]));
  const normState=s=>({events:s?.events||[],sessions:s?.sessions||[],speakers:s?.speakers||[],communications:s?.communications||[]});
  const parseDate=v=>{if(!v)return null;const d=new Date(`${v}T12:00:00`);return Number.isNaN(d.getTime())?null:d};
  const fmtDate=v=>{const d=parseDate(v);return d?d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):''};
  const fmtDateTime=v=>{if(!v)return'';const d=new Date(v);return Number.isNaN(d.getTime())?v:d.toLocaleString()};
  const today=()=>{const d=new Date();d.setHours(0,0,0,0);return d};
  const archiveDate=e=>{const d=parseDate(e?.endDate||e?.startDate);if(!d)return null;d.setDate(d.getDate()+30);d.setHours(0,0,0,0);return d};
  const isAutoArchived=e=>{const d=archiveDate(e);return !!d&&today()>=d};
  const isArchived=e=>e?.status==='Archived'||isAutoArchived(e);
  const archivedEvents=()=>fullState.events.filter(isArchived);
  const archivedIds=()=>new Set(archivedEvents().map(e=>e.id));
  const eventById=id=>fullState.events.find(e=>e.id===id);
  const sessionById=id=>fullState.sessions.find(s=>s.id===id);
  const readiness=s=>[s.bioStatus&&s.bioStatus!=='Missing',s.headshotStatus&&s.headshotStatus!=='Missing',!['Missing',''].includes(s.slidesStatus),['Complete','Not required'].includes(s.registrationStatus),['Sent','Acknowledged'].includes(s.logisticsStatus)].filter(Boolean).length;
  const needsAttention=s=>!['Declined','Complete'].includes(s.speakerStatus)&&readiness(s)<5;
  const badge=value=>{const success=['Active','Ready','Complete','Approved','Received','Sent','Acknowledged','Confirmed'].includes(value),danger=value==='Declined',warning=['Planning','Invited','Missing','Not sent','Not started'].includes(value);return `<span class="badge ${success?'success':danger?'danger':warning?'warning':'neutral'}">${esc(value||'—')}</span>`};

  function requestUrl(input){try{return new URL(typeof input==='string'?input:input?.url,location.href)}catch{return null}}
  window.fetch=async(...args)=>{
    const response=await nativeFetch(...args);
    const url=requestUrl(args[0]);
    if(url?.pathname==='/api/state'&&response.ok){
      response.clone().json().then(data=>cacheState(data.state||{})).catch(()=>{});
    }
    return response;
  };

  function cacheState(s){
    fullState=normState(s);
    scheduleApply();
    if(document.getElementById('view-archive')?.classList.contains('active'))renderArchive();
  }

  async function refreshFullState(){
    const r=await nativeFetch('/api/state',{headers:{'cache-control':'no-store'}});
    const data=await r.json().catch(()=>({}));
    if(!r.ok||data.ok===false)throw new Error(data.error||`Could not load archive data (${r.status}).`);
    cacheState(data.state||{});
    return fullState;
  }

  async function recordApi(path,options={}){
    const r=await nativeFetch(path,{...options,headers:{'content-type':'application/json',...(options.headers||{})}});
    const data=await r.json().catch(()=>({}));
    if(!r.ok||data.ok===false)throw new Error(data.error||`Request failed (${r.status}).`);
    return data;
  }

  function scheduleApply(){
    if(applyQueued)return;
    applyQueued=true;
    requestAnimationFrame(()=>{
      applyQueued=false;
      applyActiveFilters();
      enhanceEmailCenter();
      enhanceProgramFlow();
    });
  }

  function setHtml(el,html){if(el&&el.innerHTML!==html)el.innerHTML=html}

  function renderActiveDashboard(){
    const archived=archivedIds();
    const events=fullState.events.filter(e=>!archived.has(e.id));
    const ids=new Set(events.map(e=>e.id));
    const sessions=fullState.sessions.filter(s=>ids.has(s.eventId));
    const speakers=fullState.speakers.filter(s=>ids.has(s.eventId));
    const active=events.filter(e=>['Planning','Active'].includes(e.status)).length;
    const ready=speakers.filter(s=>s.speakerStatus==='Ready'||readiness(s)===5).length;
    const attention=speakers.filter(needsAttention).length;
    const cards=[['Active events',active,'Planning or active'],['Sessions',sessions.length,'Current event schedule records'],['Speakers',speakers.length,'Across current events'],['Needs attention',attention,`${ready} speaker(s) ready`]].map(([l,v,sub])=>`<div class="card"><div class="label">${l}</div><div class="value">${v}</div><div class="sub">${sub}</div></div>`).join('');
    setHtml(document.getElementById('dashboardCards'),cards);

    const readinessHtml=events.length?`<table><thead><tr><th>Event</th><th>Dates</th><th>Status</th><th>Sessions</th><th>Speakers</th><th>Ready</th><th>Needs attention</th></tr></thead><tbody>${events.map(e=>{const ss=speakers.filter(s=>s.eventId===e.id),ses=sessions.filter(s=>s.eventId===e.id);return `<tr><td><strong>${esc(e.name)}</strong><br><span class="muted">${esc(e.location||'')}</span></td><td>${esc(fmtDate(e.startDate))}${e.endDate&&e.endDate!==e.startDate?' – '+esc(fmtDate(e.endDate)):''}</td><td>${badge(e.status)}</td><td>${ses.length}</td><td>${ss.length}</td><td>${ss.filter(s=>s.speakerStatus==='Ready'||readiness(s)===5).length}</td><td>${ss.filter(needsAttention).length}</td></tr>`}).join('')}</tbody></table>`:'<div class="empty">No current events. Archived events are available in Archive.</div>';
    setHtml(document.getElementById('eventReadiness'),readinessHtml);

    const items=speakers.filter(needsAttention).slice(0,12);
    const attentionHtml=items.length?`<table><thead><tr><th>Speaker</th><th>Event</th><th>Session</th><th>Outstanding</th></tr></thead><tbody>${items.map(s=>{const m=[];if(!s.bioStatus||s.bioStatus==='Missing')m.push('Bio');if(!s.headshotStatus||s.headshotStatus==='Missing')m.push('Headshot');if(!s.slidesStatus||s.slidesStatus==='Missing')m.push('Slides');if(!['Complete','Not required'].includes(s.registrationStatus))m.push('Registration');if(!['Sent','Acknowledged'].includes(s.logisticsStatus))m.push('Logistics');return `<tr><td><strong>${esc(s.firstName)} ${esc(s.lastName)}</strong></td><td>${esc(eventById(s.eventId)?.name||'')}</td><td>${esc(sessionById(s.sessionId)?.title||'Unassigned')}</td><td>${m.map(x=>`<span class="badge warning">${x}</span>`).join(' ')}</td></tr>`}).join('')}</tbody></table>`:'<div class="empty">No current speaker records need attention.</div>';
    setHtml(document.getElementById('attentionList'),attentionHtml);
  }

  function idFromOnclick(row,kind){
    const btn=[...row.querySelectorAll('button[onclick]')].find(b=>(b.getAttribute('onclick')||'').includes(`${kind}('`));
    const m=(btn?.getAttribute('onclick')||'').match(new RegExp(`${kind}\\('([^']+)'\\)`));
    return m?.[1]||'';
  }

  function filterNormalTables(){
    const archived=archivedIds();
    document.querySelectorAll('#eventsTable tbody tr').forEach(row=>{
      const id=idFromOnclick(row,'editEvent');
      const hide=id&&archived.has(id);
      row.style.display=hide?'none':'';
      if(id&&!hide&&!row.querySelector('[data-archive-event]')){
        const cell=row.lastElementChild;
        const btn=document.createElement('button');
        btn.className='btn small';btn.type='button';btn.textContent='Archive';btn.dataset.archiveEvent=id;btn.style.marginLeft='4px';
        btn.addEventListener('click',()=>manualArchive(id));
        cell?.insertBefore(btn,cell.querySelector('.danger'));
      }
    });
    document.querySelectorAll('#sessionsTable tbody tr').forEach(row=>{const id=idFromOnclick(row,'editSession'),eventId=sessionById(id)?.eventId;row.style.display=eventId&&archived.has(eventId)?'none':''});
    document.querySelectorAll('#speakersTable tbody tr').forEach(row=>{const id=idFromOnclick(row,'editSpeaker'),speaker=fullState.speakers.find(s=>s.id===id);row.style.display=speaker?.eventId&&archived.has(speaker.eventId)?'none':''});
  }

  function syncSelect(select,includeArchived=false,labelArchived=false){
    if(!select)return;
    const archived=archivedIds();
    const current=select.value;
    if(includeArchived){
      for(const e of archivedEvents().sort((a,b)=>(b.endDate||b.startDate||'').localeCompare(a.endDate||a.startDate||''))){
        if(![...select.options].some(o=>o.value===e.id)){
          const o=document.createElement('option');o.value=e.id;o.textContent=e.name+(labelArchived?' (Archived)':'');select.appendChild(o);
        }
      }
    }else{
      [...select.options].forEach(o=>{if(archived.has(o.value))o.remove()});
      if(current&&archived.has(current)){select.value='';select.dispatchEvent(new Event('change',{bubbles:true}))}
    }
  }

  function filterNormalSelects(){
    ['speakerEventFilter','sessionEventFilter','speakerEventId','sessionEventId'].forEach(id=>syncSelect(document.getElementById(id),false));
  }

  function applyActiveFilters(){
    if(!fullState.events.length&&!fullState.sessions.length&&!fullState.speakers.length)return;
    renderActiveDashboard();
    filterNormalTables();
    filterNormalSelects();
  }

  async function manualArchive(id){
    const e=eventById(id);if(!e)return;
    if(!confirm(`Archive “${e.name}” now? Its sessions, speakers, and communication history will remain available in Archive.`))return;
    try{
      const payload={...e,status:'Archived'};delete payload.id;delete payload._updatedAt;
      await recordApi('/api/record',{method:'POST',body:JSON.stringify({type:'event',id:e.id,payload})});
      await refreshFullState();
      document.getElementById('refreshDataBtn')?.click();
    }catch(err){alert('Could not archive event: '+err.message)}
  }

  function installArchiveView(){
    if(document.querySelector('.nav button[data-view="archive"]'))return;
    const nav=document.querySelector('.nav'),content=document.querySelector('.content');if(!nav||!content)return;
    const btn=document.createElement('button');btn.type='button';btn.dataset.view='archive';btn.textContent='Archive';
    const importBtn=nav.querySelector('button[data-view="import"]');nav.insertBefore(btn,importBtn||null);
    const section=document.createElement('section');section.className='view';section.id='view-archive';section.innerHTML=`
      <div class="toolbar"><div><div class="hint">Events move here automatically 30 days after their end date, or immediately when manually archived. Records are retained; nothing is moved or duplicated.</div></div><button class="btn small" id="archiveRefresh">Refresh archive</button></div>
      <div class="panel"><div class="toolbar"><div><h3>Archived events</h3><div class="hint">Search past programs without adding them back to current-event work queues.</div></div><div class="toolbar-right"><input id="archiveSearch" placeholder="Search archived events" style="min-width:260px"></div></div><div class="table-wrap" id="archiveTable"><div class="empty">Loading archive…</div></div></div>
      <div id="archiveDetails"></div>`;
    content.appendChild(section);
    btn.addEventListener('click',async()=>{
      document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('active',b===btn));
      document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v===section));
      document.getElementById('pageTitle').textContent='Archive';
      document.getElementById('pageSubtitle').textContent='Past events retained outside current work queues';
      try{await refreshFullState();renderArchive()}catch(e){setHtml(document.getElementById('archiveTable'),`<div class="notice error">Could not load archive: ${esc(e.message)}</div>`)}
    });
    document.getElementById('archiveRefresh').addEventListener('click',async()=>{try{await refreshFullState();renderArchive()}catch(e){alert(e.message)}});
    document.getElementById('archiveSearch').addEventListener('input',renderArchive);
    section.addEventListener('click',e=>{
      const view=e.target.closest('[data-archive-view]');if(view){selectedArchiveId=view.dataset.archiveView;renderArchive();return}
      const edit=e.target.closest('[data-archive-edit]');if(edit){window.SM?.editEvent?.(edit.dataset.archiveEdit);return}
      const del=e.target.closest('[data-archive-delete]');if(del)deleteArchivedEvent(del.dataset.archiveDelete);
    });
  }

  function archiveReason(e){
    if(e.status==='Archived'&&!isAutoArchived(e))return 'Manually archived';
    const d=archiveDate(e);return d?`Automatic · ${d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}`:'Manually archived';
  }

  function renderArchive(){
    const table=document.getElementById('archiveTable');if(!table)return;
    const q=(document.getElementById('archiveSearch')?.value||'').trim().toLowerCase();
    let events=archivedEvents().filter(e=>!q||[e.name,e.location,e.owner,e.status].some(v=>String(v||'').toLowerCase().includes(q)));
    events.sort((a,b)=>(b.endDate||b.startDate||'').localeCompare(a.endDate||a.startDate||''));
    if(!events.some(e=>e.id===selectedArchiveId))selectedArchiveId=events[0]?.id||'';
    const html=events.length?`<table><thead><tr><th>Event</th><th>Dates</th><th>Status</th><th>Sessions</th><th>Speakers</th><th>Communications</th><th>Archive</th><th></th></tr></thead><tbody>${events.map(e=>`<tr><td><strong>${esc(e.name)}</strong><br><span class="muted">${esc(e.location||'')}</span></td><td>${esc(fmtDate(e.startDate))}${e.endDate&&e.endDate!==e.startDate?' – '+esc(fmtDate(e.endDate)):''}</td><td>${badge(e.status)}</td><td>${fullState.sessions.filter(s=>s.eventId===e.id).length}</td><td>${fullState.speakers.filter(s=>s.eventId===e.id).length}</td><td>${fullState.communications.filter(c=>c.eventId===e.id).length}</td><td>${esc(archiveReason(e))}</td><td><button class="btn small" data-archive-view="${esc(e.id)}">View details</button></td></tr>`).join('')}</tbody></table>`:'<div class="empty">No archived events yet.</div>';
    setHtml(table,html);
    renderArchiveDetails(selectedArchiveId);
  }

  function renderArchiveDetails(id){
    const wrap=document.getElementById('archiveDetails');if(!wrap)return;
    const e=eventById(id);if(!e||!isArchived(e)){setHtml(wrap,'');return}
    const sessions=fullState.sessions.filter(s=>s.eventId===id).sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.time||'').localeCompare(b.time||'')||(a.title||'').localeCompare(b.title||''));
    const speakers=fullState.speakers.filter(s=>s.eventId===id).sort((a,b)=>(a.lastName||'').localeCompare(b.lastName||'')||(a.firstName||'').localeCompare(b.firstName||''));
    const comms=fullState.communications.filter(c=>c.eventId===id).sort((a,b)=>(b.sentAt||b._updatedAt||'').localeCompare(a.sentAt||a._updatedAt||''));
    const sessionRows=sessions.length?`<table><thead><tr><th>Date / time</th><th>Session</th><th>Room</th><th>Speakers</th><th>Owner</th></tr></thead><tbody>${sessions.map(s=>`<tr><td>${esc(fmtDate(s.date))}${s.time?'<br><span class="muted">'+esc(s.time)+'</span>':''}</td><td><strong>${esc(s.title)}</strong></td><td>${esc(s.room||'')}</td><td>${speakers.filter(p=>p.sessionId===s.id).length}</td><td>${esc(s.owner||'')}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">No sessions stored for this event.</div>';
    const speakerRows=speakers.length?`<table><thead><tr><th>Speaker</th><th>Session</th><th>Status</th><th>Bio</th><th>Headshot</th><th>Slides</th><th>Registration</th><th>Logistics</th></tr></thead><tbody>${speakers.map(s=>`<tr><td><strong>${esc(s.firstName)} ${esc(s.lastName)}</strong><br><span class="muted">${esc(s.organization||'')}<br>${esc(s.email||'')}</span></td><td>${esc(sessionById(s.sessionId)?.title||'Unassigned')}</td><td>${badge(s.speakerStatus)}</td><td>${badge(s.bioStatus)}</td><td>${badge(s.headshotStatus)}</td><td>${badge(s.slidesStatus)}</td><td>${badge(s.registrationStatus)}</td><td>${badge(s.logisticsStatus)}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">No speakers stored for this event.</div>';
    const commRows=comms.length?`<table><thead><tr><th>Date</th><th>Recipient</th><th>Type</th><th>Subject</th><th>Staff sender</th><th>Status</th></tr></thead><tbody>${comms.slice(0,100).map(c=>`<tr><td>${esc(fmtDateTime(c.sentAt||c._updatedAt))}</td><td><strong>${esc(c.recipientName||'')}</strong><br><span class="muted">${esc(c.to||'')}</span></td><td>${esc(c.templateName||c.messageType||'')}</td><td>${esc(c.subject||'')}</td><td>${esc(c.senderName||'')}<br><span class="muted">${esc(c.staffContactEmail||'')}</span></td><td>${badge(c.status||'Submitted')}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">No dashboard communication history stored for this event.</div>';
    const html=`<div class="panel"><div class="toolbar"><div><h3>${esc(e.name)}</h3><div class="hint">${esc(fmtDate(e.startDate))}${e.endDate&&e.endDate!==e.startDate?' – '+esc(fmtDate(e.endDate)):''}${e.location?' · '+esc(e.location):''} · ${esc(archiveReason(e))}</div></div><div class="toolbar-right"><button class="btn small" data-archive-edit="${esc(e.id)}">Edit event</button><button class="btn small danger" data-archive-delete="${esc(e.id)}">Delete permanently</button></div></div><div class="notice">Archived records remain in the shared data store. Edit the event to change a manually archived status; events older than the 30-day retention window remain automatically archived.</div></div><div class="panel table-wrap"><h3>Sessions</h3>${sessionRows}</div><div class="panel table-wrap"><h3>Speakers</h3>${speakerRows}</div><div class="panel table-wrap"><h3>Communication history</h3>${commRows}</div>`;
    setHtml(wrap,html);
  }

  async function deleteArchivedEvent(id){
    const e=eventById(id);if(!e)return;
    const speakers=fullState.speakers.filter(s=>s.eventId===id),sessions=fullState.sessions.filter(s=>s.eventId===id),comms=fullState.communications.filter(c=>c.eventId===id);
    if(!confirm(`Permanently delete “${e.name}”, ${sessions.length} session(s), ${speakers.length} speaker record(s), and ${comms.length} communication record(s)? This cannot be undone from the dashboard.`))return;
    try{
      for(const c of comms)await recordApi(`/api/record?type=communication&id=${encodeURIComponent(c.id)}`,{method:'DELETE'});
      for(const s of speakers)await recordApi(`/api/record?type=speaker&id=${encodeURIComponent(s.id)}`,{method:'DELETE'});
      for(const s of sessions)await recordApi(`/api/record?type=session&id=${encodeURIComponent(s.id)}`,{method:'DELETE'});
      try{await nativeFetch(`/api/program-template?eventId=${encodeURIComponent(id)}`,{method:'DELETE'})}catch{}
      await recordApi(`/api/record?type=event&id=${encodeURIComponent(id)}`,{method:'DELETE'});
      selectedArchiveId='';
      await refreshFullState();
      document.getElementById('refreshDataBtn')?.click();
      renderArchive();
    }catch(err){alert(`Delete did not finish cleanly. Refresh before retrying. ${err.message}`);try{await refreshFullState();renderArchive()}catch{}}
  }

  function enhanceEmailCenter(){
    const select=document.getElementById('emailEventFilter');if(!select)return;
    if(!document.getElementById('emailIncludeArchived')){
      const field=select.closest('.field');
      if(field){const row=document.createElement('label');row.className='hint';row.style.display='flex';row.style.gap='8px';row.style.alignItems='center';row.style.marginTop='-4px';row.innerHTML='<input id="emailIncludeArchived" type="checkbox" style="width:auto"> Include archived events';field.after(row);row.querySelector('input').checked=emailIncludeArchived;row.querySelector('input').addEventListener('change',ev=>{emailIncludeArchived=ev.target.checked;syncSelect(select,emailIncludeArchived,true)})}
    }
    syncSelect(select,emailIncludeArchived,true);
  }

  function enhanceProgramFlow(){
    const select=document.getElementById('pfEvent');if(!select)return;
    if(!document.getElementById('pfIncludeArchived')){
      const field=select.closest('.field');
      if(field){const row=document.createElement('label');row.className='hint';row.style.display='flex';row.style.gap='8px';row.style.alignItems='center';row.style.marginTop='-4px';row.innerHTML='<input id="pfIncludeArchived" type="checkbox" style="width:auto"> Include archived events';field.after(row);row.querySelector('input').checked=programIncludeArchived;row.querySelector('input').addEventListener('change',ev=>{programIncludeArchived=ev.target.checked;syncSelect(select,programIncludeArchived,true)})}
    }
    syncSelect(select,programIncludeArchived,true);
  }

  function initDom(){
    installArchiveView();
    const observer=new MutationObserver(scheduleApply);observer.observe(document.body,{childList:true,subtree:true});
    refreshFullState().catch(()=>{});
    scheduleApply();
    window.SMArchive={refresh:refreshFullState,isArchived};
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initDom);else initDom();
})();
