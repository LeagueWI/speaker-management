(()=>{
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const model=window.LeagueProgramModel;
const uid=()=> 'flow_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);
let data={events:[],sessions:[],speakers:[],programBlocks:[],programFlows:[]},eventId='',rows=[],dirty=false,busy=false;
const event=()=>data.events.find(e=>e.id===eventId);
const sess=id=>data.sessions.find(s=>s.id===id&&s.eventId===eventId);
const ix=id=>rows.findIndex(r=>r.id===id);
const labelDate=x=>x?new Date(x+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}):'Date not assigned';
function room(s){
 if(!s)return'';
 if(String(s.room||'').trim())return s.room;
 const b=data.programBlocks.find(b=>b.id===s.blockId);
 const l=(event()?.programLayouts||[]).find(l=>l.id===b?.layoutId);
 return l?.columns?.find(c=>c.id===s.columnId)?.room||'';
}
function speakerNames(id){
 return data.speakers.filter(x=>x.sessionId===id&&x.speakerStatus!=='Declined').map(x=>[x.firstName,x.lastName].filter(Boolean).join(' ')).filter(Boolean).join(', ');
}
function message(s,bad=false){
 const x=$('pfeMessage');if(!x)return;x.hidden=false;x.textContent=s;x.className=bad?'notice error':'notice';
}
const option=(value,text)=>'<option value="'+esc(value)+'">'+esc(text)+'</option>';
const button=(action,id,symbol,title,sid,disabled=false)=>'<button type="button" class="btn small" data-pfe-action="'+action+'" data-pfe-id="'+esc(id)+'"'+(sid?' data-pfe-sid="'+esc(sid)+'"':'')+' title="'+esc(title)+'" aria-label="'+esc(title)+'"'+(disabled?' disabled':'')+'>'+symbol+'</button>';
function rowTools(r,position){
 return '<div class="pfe-tools">'+button('up',r.id,'↑','Move row up','',position===0)+button('down',r.id,'↓','Move row down','',position===rows.length-1)+
 (r.kind==='sessions'?'':button('edit',r.id,'Edit','Edit agenda item')+button('remove',r.id,'Remove','Remove agenda item'))+'</div>';
}
function moveMenu(id,r){
 const candidates=rows.filter(t=>t.kind==='sessions'&&t.id!==r.id&&t.date===r.date&&model.timeKey(t.time)===model.timeKey(r.time));
 return '<select data-pfe-move="'+esc(id)+'" data-pfe-from="'+esc(r.id)+'" aria-label="Move or group session"><option value="">Move or group…</option><option value="new">Separate into new row</option>'+
 candidates.map(t=>option(t.id,'Group with '+(t.sessionIds.map(sid=>sess(sid)?.title).filter(Boolean).join(' / ')||'empty row'))).join('')+'</select>';
}
function sessionCard(sid,r,n){
 const s=sess(sid);if(!s)return'';
 const p=r.sessionIds.indexOf(sid),speakers=speakerNames(sid),place=room(s);
 return '<div class="pfe-card">'+
 (r.sessionIds.length>1?'<div class="pfe-card-head"><input data-pfe-label="'+esc(sid)+'" data-pfe-row="'+esc(r.id)+'" aria-label="Optional column label" placeholder="Column label (optional)" value="'+esc(r.labels?.[sid]||'')+'">'+button('left',r.id,'←','Move left',sid,p===0)+button('right',r.id,'→','Move right',sid,p===r.sessionIds.length-1)+'</div>':'')+
 '<strong>'+esc(s.title||'Untitled session')+'</strong>'+
 (place?'<small>'+esc(place)+'</small>':'')+(speakers?'<small>'+esc(speakers)+'</small>':'')+
 (r.date!==s.date||model.timeKey(r.time)!==model.timeKey(s.time)?'<small class="pfe-warning">Session date or time differs from this display row</small>':'')+
 moveMenu(sid,r)+'</div>';
}
function render(){
 const preview=$('pfeRows');if(!preview)return;
 const editor=$('pfeEditor');editor.hidden=!eventId;
 $('pfeSave').disabled=!eventId||busy;
 $('pfeExport').disabled=!eventId||busy;
 $('pfeRebuild').disabled=!eventId||busy;
 $('pfeAddHeading').disabled=!eventId;
 $('pfeAddActivity').disabled=!eventId;
 $('pfeSaveState').textContent=dirty?'Unsaved layout changes':'Saved layout';
 if(!rows.length){preview.innerHTML='<div class="empty">No sessions yet. Add a session or an agenda item to get started.</div>';return;}
 let last=null;
 preview.innerHTML=rows.map((r,i)=>{
  const day=r.date===last?'':'<div class="pfe-day">'+esc(labelDate(r.date))+'</div>';last=r.date;
  if(r.kind==='heading')return day+'<div class="pfe-heading"><strong>'+esc(r.title)+'</strong>'+rowTools(r,i)+'</div>';
  if(r.kind==='activity')return day+'<div class="pfe-row"><div class="pfe-time">'+esc(r.time)+'</div><div class="pfe-activity"><strong>'+esc(r.title)+'</strong>'+(r.notes?'<small>'+esc(r.notes)+'</small>':'')+'</div>'+rowTools(r,i)+'</div>';
  return day+'<div class="pfe-row"><div class="pfe-time">'+esc(r.time||'Time TBD')+'</div><div class="pfe-session-area"><div class="pfe-row-header">'+
  (r.sessionIds.length>1?'<input data-pfe-heading="'+esc(r.id)+'" placeholder="Section heading (optional)" aria-label="Section heading" value="'+esc(r.heading||'')+'">':'<span class="pfe-muted">Session</span>')+
  rowTools(r,i)+'</div><div class="pfe-concurrent" style="--pfe-columns:'+Math.min(r.sessionIds.length||1,12)+'">'+
  (r.sessionIds.length?r.sessionIds.map(id=>sessionCard(id,r,r.sessionIds.length)).join(''):'<div class="pfe-empty">Empty row. Move a session here to fill it.</div>')+
  '</div></div></div>';
 }).join('');
}
function changed(){dirty=true;render();}
async function api(path,options={}){
 const response=await fetch(path,{...options,headers:{'content-type':'application/json',...(options.headers||{})}});
 const body=await response.json().catch(()=>({error:'Invalid server response'}));
 if(!response.ok||body.ok===false)throw Error(body.error||'Request failed: '+response.status);
 return body;
}
async function refresh(preferred=''){
 const incoming=await api('/api/state');
 data={events:[],sessions:[],speakers:[],programBlocks:[],programFlows:[],...(incoming.state||{})};
 const select=$('pfeEvent'),previous=preferred||eventId||select.value;
 select.innerHTML=option('','Choose an event')+data.events.map(e=>option(e.id,e.name)).join('');
 eventId=data.events.some(e=>e.id===previous)?previous:(data.events.find(e=>['Planning','Active'].includes(e.status))?.id||data.events[0]?.id||'');
 select.value=eventId;loadRows();
}
function loadRows(){
 const flow=data.programFlows.find(x=>x.eventId===eventId||x.id===eventId);
 rows=model.reconcile(flow?.rows,data.sessions,eventId);dirty=false;render();
 message('Program assembled from your existing session records. Arrange it below, then export to Word.');
}
function rowMove(id,direction){const p=ix(id),q=p+direction;if(p<0||q<0||q>=rows.length)return;[rows[p],rows[q]]=[rows[q],rows[p]];changed();}
function columnMove(id,sid,direction){
 const r=rows[ix(id)];if(!r)return;
 const p=r.sessionIds.indexOf(sid),q=p+direction;
 if(p<0||q<0||q>=r.sessionIds.length)return;
 [r.sessionIds[p],r.sessionIds[q]]=[r.sessionIds[q],r.sessionIds[p]];changed();
}
function assign(from,id,target){
 const r=rows[ix(from)];if(!r||!r.sessionIds.includes(id)||!target)return;
 let into;
 if(target==='new'){
  into={id:uid(),kind:'sessions',date:r.date,time:r.time,heading:'',notes:'',labels:{},sessionIds:[]};
  rows.splice(ix(from)+1,0,into);
 }else{
  into=rows[ix(target)];
  if(!into||into.kind!=='sessions'||into.date!==r.date||model.timeKey(into.time)!==model.timeKey(r.time))return;
 }
 r.sessionIds=r.sessionIds.filter(sid=>sid!==id);into.sessionIds.push(id);
 if(r.labels?.[id]){into.labels[id]=r.labels[id];delete r.labels[id];}
 if(!r.sessionIds.length)rows.splice(ix(r.id),1);changed();
}
function editItem(r,kind){
 $('pfeDialogHeading').textContent=r?'Edit agenda item':kind==='heading'?'Add section heading':'Add agenda item';
 $('pfeItemId').value=r?.id||'';
 $('pfeItemKind').value=r?.kind||kind;
 $('pfeItemDate').value=r?.date||rows[rows.length-1]?.date||event()?.startDate||'';
 $('pfeItemTime').value=r?.time||'';
 $('pfeItemTitle').value=r?.title||'';
 $('pfeItemNotes').value=r?.notes||'';
 $('pfeTimeField').hidden=(r?.kind||kind)==='heading';
 $('pfeDialog').showModal();
}
function saveItem(){
 const kind=$('pfeItemKind').value,id=$('pfeItemId').value;
 const item={id:id||uid(),kind,date:$('pfeItemDate').value,time:kind==='heading'?'':$('pfeItemTime').value.trim(),title:$('pfeItemTitle').value.trim(),notes:$('pfeItemNotes').value.trim(),sessionIds:[],labels:{}};
 if(!item.title||!item.date)return alert('Title and date are required.');
 const p=ix(id);
 if(p>=0)rows[p]=item;
 else{const q=rows.findIndex(r=>model.compare(item,r)<0);rows.splice(q<0?rows.length:q,0,item);}
 $('pfeDialog').close();changed();
}
async function save(){
 if(!eventId||busy)return;
 busy=true;render();
 try{
  const payload={eventId,version:1,rows:rows.map(model.cleanRow)};
  await api('/api/record',{method:'POST',body:JSON.stringify({type:'program-flow',id:eventId,payload})});
  data.programFlows=data.programFlows.filter(x=>x.eventId!==eventId&&x.id!==eventId);
  data.programFlows.push({...payload,id:eventId});dirty=false;
  message('Layout saved. Sessions, rooms and speakers have not been modified.');
 }catch(e){message('Could not save: '+e.message,true);throw e;}
 finally{busy=false;render();}
}
function download(blob,name){
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),10000);
}
async function exportDoc(){
 if(!eventId)return;
 try{
  if(dirty)await save();
  const output={...data,programFlowRows:rows.map(model.cleanRow)};
  const doc=await window.LeagueStructuredWord.generate(output,eventId);
  download(doc,(event()?.name||'Event').replace(/[\\/:*?"<>|]+/g,'-')+' - Program Flow.docx');
  message('Word document generated. Open it to make any final formatting edits.');
 }catch(e){message('Could not generate Word document: '+e.message,true);console.error(e);}
}
function init(){
 const view=$('view-events'),list=view?.querySelector('.panel.table-wrap');
 if(!view||!list||$('programFlowEditorPanel'))return;
 const div=document.createElement('section');div.className='panel';div.id='programFlowEditorPanel';
 div.innerHTML=[
 '<div class="toolbar"><div><h3>Program Flow Editor</h3><p class="hint">The schedule is assembled from your sessions. Arrange it visually, then export to Word. No separate track or block setup.</p></div><button type="button" class="btn small" id="pfeRefresh">Refresh sessions</button></div>',
 '<div class="field"><label for="pfeEvent">Event</label><select id="pfeEvent"></select></div>',
 '<div id="pfeEditor" hidden><div class="toolbar"><div class="toolbar-left"><button type="button" class="btn small" id="pfeAddHeading">+ Section heading</button><button type="button" class="btn small" id="pfeAddActivity">+ Agenda item</button></div>',
 '<div class="toolbar-left"><button type="button" class="btn small" id="pfeRebuild">Rebuild from sessions</button><button type="button" class="btn" id="pfeSave">Save layout</button><button type="button" class="btn primary" id="pfeExport">Export Word</button></div></div>',
 '<div class="pfe-save-state" id="pfeSaveState"></div><div id="pfeRows" class="pfe-preview"></div>',
 '<p class="hint">Use arrows to change the order. The Move or group menu lets you combine or separate simultaneous sessions. Headings and column labels are optional. This does not change your session records.</p></div>',
 '<div id="pfeMessage" class="notice" hidden></div>'
 ].join('');
 view.insertBefore(div,list);
 const modal=document.createElement('dialog');modal.id='pfeDialog';
 modal.innerHTML=[
 '<form method="dialog"><div class="modal-head"><h3 id="pfeDialogHeading">Agenda item</h3><button type="button" class="btn small" id="pfeDialogClose">Close</button></div>',
 '<div class="modal-body"><input type="hidden" id="pfeItemId"><input type="hidden" id="pfeItemKind"><div class="form-grid two">',
 '<div class="field span-2"><label>Title *</label><input id="pfeItemTitle"></div>',
 '<div class="field"><label>Date *</label><input id="pfeItemDate" type="date"></div>',
 '<div class="field" id="pfeTimeField"><label>Time</label><input id="pfeItemTime" placeholder="10:20–10:30 AM"></div>',
 '<div class="field span-2"><label>Notes (optional)</label><textarea id="pfeItemNotes"></textarea></div></div></div>',
 '<div class="modal-foot"><button type="button" class="btn" id="pfeDialogCancel">Cancel</button><button type="button" class="btn primary" id="pfeItemSave">Save</button></div></form>'
 ].join('');
 document.body.appendChild(modal);
 $('pfeEvent').addEventListener('change',()=>{
  if(dirty&&!confirm('Discard unsaved layout changes?')){$('pfeEvent').value=eventId;return;}
  eventId=$('pfeEvent').value;loadRows();
 });
 $('pfeRefresh').addEventListener('click',async()=>{
  if(dirty&&!confirm('Discard unsaved changes and refresh session information?'))return;
  try{await refresh(eventId)}catch(e){message(e.message,true);}
 });
 $('pfeSave').addEventListener('click',()=>save().catch(()=>{}));
 $('pfeExport').addEventListener('click',exportDoc);
 $('pfeRebuild').addEventListener('click',()=>{
  if(!confirm('Rebuild from the sessions? Custom arrangement, headings and agenda-only items will be cleared. No session or speaker records will be changed.'))return;
  rows=model.build(data.sessions,eventId);changed();
 });
 $('pfeAddHeading').addEventListener('click',()=>editItem(null,'heading'));
 $('pfeAddActivity').addEventListener('click',()=>editItem(null,'activity'));
 $('pfeDialogClose').addEventListener('click',()=>$('pfeDialog').close());
 $('pfeDialogCancel').addEventListener('click',()=>$('pfeDialog').close());
 $('pfeItemSave').addEventListener('click',saveItem);
 $('pfeRows').addEventListener('click',e=>{
  const b=e.target.closest('[data-pfe-action]');if(!b)return;
  const action=b.dataset.pfeAction,id=b.dataset.pfeId;
  if(action==='up'||action==='down')rowMove(id,action==='up'?-1:1);
  if(action==='left'||action==='right')columnMove(id,b.dataset.pfeSid,action==='left'?-1:1);
  if(action==='edit')editItem(rows[ix(id)],rows[ix(id)]?.kind);
  if(action==='remove'){
   const r=rows[ix(id)];if(r&&r.kind!=='sessions'&&confirm('Remove '+r.title+' from the program?')){rows.splice(ix(id),1);changed();}
  }
 });
 $('pfeRows').addEventListener('change',e=>{
  const t=e.target;
  if(t.dataset.pfeMove){assign(t.dataset.pfeFrom,t.dataset.pfeMove,t.value);return;}
  if(t.dataset.pfeHeading){const r=rows[ix(t.dataset.pfeHeading)];if(r){r.heading=t.value;dirty=true;$('pfeSaveState').textContent='Unsaved layout changes';}}
  if(t.dataset.pfeLabel){const r=rows[ix(t.dataset.pfeRow)];if(r){r.labels[t.dataset.pfeLabel]=t.value;dirty=true;$('pfeSaveState').textContent='Unsaved layout changes';}}
 });
 refresh().catch(e=>message('Could not load events: '+e.message,true));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
