/*
 * League Speaker Management: Program Structure
 * A lightweight extension to the existing Event -> Session -> Speaker model.
 * Program Block records are stored in Jotform's generic record store.
 * Layout definitions are stored on their parent Event.
 */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=p=>p+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,9);
const clean=s=>String(s??'').trim();
let data={events:[],sessions:[],speakers:[],programBlocks:[]};
let draft=[];
let selectedEvent='';
const lookup=id=>data.events.find(x=>x.id===id);
const block=id=>data.programBlocks.find(x=>x.id===id);
const layouts=id=>Array.isArray(lookup(id)?.programLayouts)?lookup(id).programLayouts:[];
const current=e=>!(window.SMArchive?.isArchived?.(e)??(e.status==='Archived'));
const byDate=(a,b)=>(a.date||'').localeCompare(b.date||'')||(Number(a.order)||0)-(Number(b.order)||0)||(a.time||'').localeCompare(b.time||'')||(a.title||'').localeCompare(b.title||'');
async function api(path,options={}){
 const r=await fetch(path,{...options,headers:{'content-type':'application/json',...(options.headers||{})}});
 const j=await r.json().catch(()=>({error:'Unexpected response'}));
 if(!r.ok||j.ok===false)throw Error(j.error||'Request failed: '+r.status);
 return j;
}
function layoutEditor(){
 const host=$('eventLayoutRows');if(!host)return;
 host.innerHTML=draft.length?draft.map((layout,index)=>{
 const columns=(layout.columns||[]).map((column,i)=>'<div class="ps-column"><input data-field="columnName" data-layout="'+index+'" data-column="'+i+'" aria-label="Column '+(i+1)+' name" placeholder="Track '+(i+1)+'" value="'+esc(column.name)+'"><input data-field="columnRoom" data-layout="'+index+'" data-column="'+i+'" aria-label="Column '+(i+1)+' default room" placeholder="Default room (optional)" value="'+esc(column.room||'')+'"><button type="button" class="btn small" data-remove-column="'+index+':'+i+'" title="Remove column">Remove</button></div>').join('');
 return '<div class="ps-layout"><div class="toolbar"><input data-field="layoutName" data-layout="'+index+'" aria-label="Layout name" value="'+esc(layout.name)+'" placeholder="e.g., Breakout tracks"><button type="button" class="btn small danger" data-remove-layout="'+index+'">Remove layout</button></div><div class="ps-columns">'+columns+'</div><button type="button" class="btn small" data-add-column="'+index+'">+ Add column</button></div>';
 }).join(''):'<p class="hint">No multi-column layouts. Your program will use full-width activities and sessions.</p>';
}
function openEvent(e){
 draft=(Array.isArray(e?.programLayouts)?e.programLayouts:[]).map(l=>({
   id:l.id||uid('layout'),name:l.name||'',columns:(l.columns||[]).map(c=>({id:c.id||uid('col'),name:c.name||'',room:c.room||''}))
 }));
 layoutEditor();
}
function getLayouts(){return draft.map(l=>({id:l.id,name:clean(l.name),columns:l.columns.map(c=>({id:c.id,name:clean(c.name),room:clean(c.room)}))}));}
function validateLayouts(next,old,state){
 const list=next.programLayouts||[];
 if(list.some(l=>!l.name||l.columns.length<1||l.columns.some(c=>!c.name)))return 'Every program layout and column needs a name.';
 const ids=new Set(list.map(x=>x.id));
 const oldIds=new Set((old?.programLayouts||[]).map(x=>x.id));
 const blocks=(state.programBlocks||[]).filter(b=>b.eventId===next.id);
 if(blocks.some(b=>b.layoutId&&oldIds.has(b.layoutId)&&!ids.has(b.layoutId)))return 'A scheduled program block uses a removed layout. Reassign that block before deleting its layout.';
 for(const b of blocks){
  const oldLayout=(old?.programLayouts||[]).find(l=>l.id===b.layoutId),newLayout=list.find(l=>l.id===b.layoutId);
  if(oldLayout&&newLayout){
   const validCols=new Set(newLayout.columns.map(c=>c.id));
   if((state.sessions||[]).some(s=>s.blockId===b.id&&s.columnId&&!validCols.has(s.columnId)))return 'A scheduled session uses a removed track. Reassign that session before removing the column.';
  }
 }
 return '';
}
function option(value,label,selected){return '<option value="'+esc(value)+'"'+(value===selected?' selected':'')+'>'+esc(label)+'</option>';}
function renderBlockSelect(eventId,selected){
 const select=$('sessionBlockId');if(!select)return;
 const list=data.programBlocks.filter(b=>b.eventId===eventId&&b.kind!=='activity').sort(byDate);
 select.innerHTML=option('','Not assigned','')+list.map(b=>option(b.id,(b.date||'No date')+' '+(b.time||'')+'  '+b.title,selected)).join('');
 select.value=list.some(x=>x.id===selected)?selected:'';
 renderColumnSelect();
}
function renderColumnSelect(preferred){
 const blockId=$('sessionBlockId')?.value||'',b=block(blockId),layout=layouts(b?.eventId).find(l=>l.id===b?.layoutId),select=$('sessionColumnId');
 if(!select)return;
 const cols=layout?.columns||[];
 select.innerHTML=option('',cols.length?'Choose a track / column':'Full width / none','')+cols.map(c=>option(c.id,c.name,preferred)).join('');
 if(preferred&&cols.some(c=>c.id===preferred))select.value=preferred;
 else if(cols.length===1)select.value=cols[0].id;
 select.disabled=!cols.length;
 if(b){
  $('sessionDate').value=b.date||'';
  $('sessionTime').value=b.time||'';
  const column=cols.find(c=>c.id===select.value);
  if(column?.room&&!clean($('sessionRoom').value))$('sessionRoom').value=column.room;
 }
 $('sessionDate').readOnly=!!b;
 $('sessionTime').readOnly=!!b;
}
function openSession(s,eventId){renderBlockSelect(eventId,s?.eventId===eventId?s?.blockId||'':'');renderColumnSelect(s?.columnId||'');}
function sessionAssignment(eventId){
 const b=block($('sessionBlockId')?.value);
 if(!b||b.eventId!==eventId||b.kind==='activity')return {blockId:'',columnId:''};
 const layout=layouts(eventId).find(l=>l.id===b.layoutId);
 const chosen=layout?.columns?.some(c=>c.id===$('sessionColumnId')?.value)?$('sessionColumnId').value:'';
 return {blockId:b.id,columnId:chosen,date:b.date||'',time:b.time||''};
}
function validateSession(eventId){
 const b=block($('sessionBlockId')?.value);
 if(b&&b.eventId!==eventId)return 'This program block belongs to a different event.';
 const l=layouts(eventId).find(x=>x.id===b?.layoutId);
 if(l&&l.columns.length>1&&!l.columns.some(c=>c.id===$('sessionColumnId').value))return 'Choose a track or column for this session.';
 if(b&&b.kind==='activity')return 'An activity block cannot contain speaker sessions.';
 return '';
}
function ensureUI(){
 if($('programStructurePanel'))return;
 const wrap=document.createElement('div');
 wrap.id='programStructurePanel';wrap.className='panel';wrap.innerHTML='<div class="toolbar"><div><h3>Program Structure</h3><p class="hint">Set up scheduled blocks, breaks, and concurrent tracks. Track names are managed in Edit Event → Program layouts.</p></div><button class="btn primary" type="button" id="psAddBlock">+ Add program block</button></div><div class="field"><label for="psEvent">Event</label><select id="psEvent"><option value="">Choose an event</option></select></div><div class="table-wrap" id="psBlockTable"><div class="empty">Choose an event.</div></div>';
 const view=$('view-events'),table=view.querySelector('.panel.table-wrap');
 view.insertBefore(wrap,table);
 const dialog=document.createElement('dialog');
 dialog.id='psBlockDialog';
 dialog.innerHTML='<form method="dialog"><div class="modal-head"><h3 id="psDialogTitle">Add program block</h3><button class="btn small" value="cancel">Close</button></div><div class="modal-body"><input type="hidden" id="psBlockId"><div class="form-grid two"><div class="field span-2"><label>Program block title *</label><input id="psTitle" placeholder="Breakout Sessions 1" required></div><div class="field"><label>Date *</label><input id="psDate" type="date"></div><div class="field"><label>Time *</label><input id="psTime" placeholder="10:30–11:20 AM"></div><div class="field"><label>Type</label><select id="psKind"><option value="sessions">Scheduled session(s)</option><option value="activity">Activity / break / meal</option></select></div><div class="field"><label>Layout</label><select id="psLayout"></select></div><div class="field"><label>Order within day</label><input id="psOrder" type="number" step="1" min="0"></div><div class="field span-2"><label>Notes (optional)</label><textarea id="psNotes" rows="2"></textarea></div></div></div><div class="modal-foot"><button class="btn" value="cancel">Cancel</button><button type="button" id="psSave" class="btn primary">Save block</button></div></form>';
 document.body.appendChild(dialog);
 $('psEvent').addEventListener('change',()=>{selectedEvent=$('psEvent').value;renderBlocks();});
 $('psAddBlock').addEventListener('click',()=>openBlock());
 $('psSave').addEventListener('click',saveBlock);
 $('psKind').addEventListener('change',()=>{$('psLayout').disabled=$('psKind').value==='activity';});
 $('psBlockTable').addEventListener('click',e=>{
  const edit=e.target.closest('[data-ps-edit]'),del=e.target.closest('[data-ps-delete]');
  if(edit)openBlock(block(edit.dataset.psEdit));
  if(del)removeBlock(del.dataset.psDelete);
 });
 const layoutHost=$('eventProgramLayouts');
 layoutHost.addEventListener('input',e=>{
  const t=e.target,i=Number(t.dataset.layout),k=Number(t.dataset.column);
  if(!draft[i])return;
  if(t.dataset.field==='layoutName')draft[i].name=t.value;
  if(t.dataset.field==='columnName'&&draft[i].columns[k])draft[i].columns[k].name=t.value;
  if(t.dataset.field==='columnRoom'&&draft[i].columns[k])draft[i].columns[k].room=t.value;
 });
 layoutHost.addEventListener('click',e=>{
  const t=e.target;
  if(t.id==='addProgramLayoutBtn'){draft.push({id:uid('layout'),name:'New layout',columns:[{id:uid('col'),name:'Track 1',room:''},{id:uid('col'),name:'Track 2',room:''}]});layoutEditor();}
  if(t.dataset.addColumn!==undefined){const l=draft[Number(t.dataset.addColumn)];if(l)l.columns.push({id:uid('col'),name:'Track '+(l.columns.length+1),room:''});layoutEditor();}
  if(t.dataset.removeLayout!==undefined){draft.splice(Number(t.dataset.removeLayout),1);layoutEditor();}
  if(t.dataset.removeColumn!==undefined){const [i,k]=t.dataset.removeColumn.split(':').map(Number);if(draft[i]?.columns.length>1)draft[i].columns.splice(k,1);else alert('A layout requires at least one column.');layoutEditor();}
 });
 $('sessionEventId').addEventListener('change',e=>renderBlockSelect(e.target.value,''));
 $('sessionBlockId').addEventListener('change',()=>renderColumnSelect());
 $('sessionColumnId').addEventListener('change',()=>{
  const b=block($('sessionBlockId').value),l=layouts(b?.eventId).find(x=>x.id===b?.layoutId);
  const col=l?.columns?.find(c=>c.id===$('sessionColumnId').value);
  if(col?.room&&!clean($('sessionRoom').value))$('sessionRoom').value=col.room;
 });
}
function refresh(next){
 if(next)data=next;
 ensureUI();
 const el=$('psEvent'),old=selectedEvent||el.value;
 el.innerHTML=option('','Choose an event','')+data.events.filter(current).map(e=>option(e.id,e.name,old)).join('');
 selectedEvent=data.events.some(e=>e.id===old&&current(e))?old:'';
 el.value=selectedEvent;
 renderBlocks();
}
function renderBlocks(){
 const host=$('psBlockTable');if(!host)return;
 $('psAddBlock').disabled=!selectedEvent;
 if(!selectedEvent){host.innerHTML='<div class="empty">Choose an event to view its program blocks.</div>';return;}
 const items=data.programBlocks.filter(b=>b.eventId===selectedEvent).sort(byDate);
 if(!items.length){host.innerHTML='<div class="empty">No program blocks yet. Add a block to build the schedule.</div>';return;}
 const e=lookup(selectedEvent);
 host.innerHTML='<table><thead><tr><th>Date / time</th><th>Program block</th><th>Layout</th><th>Sessions</th><th></th></tr></thead><tbody>'+items.map(b=>{
  const l=(e?.programLayouts||[]).find(x=>x.id===b.layoutId);
  const sessions=data.sessions.filter(s=>s.blockId===b.id);
  return '<tr><td>'+esc(b.date||'')+'<br><span class="muted">'+esc(b.time||'')+'</span></td><td><strong>'+esc(b.title)+'</strong><br><span class="muted">'+(b.kind==='activity'?'Activity / break':'Scheduled sessions')+'</span></td><td>'+esc(l?.name||'Full width')+'</td><td>'+sessions.length+'</td><td><button type="button" class="btn small" data-ps-edit="'+esc(b.id)+'">Edit</button> <button type="button" class="btn small danger" data-ps-delete="'+esc(b.id)+'">Delete</button></td></tr>';
 }).join('')+'</tbody></table>';
}
function openBlock(b){
 if(!selectedEvent)return;
 $('psDialogTitle').textContent=b?'Edit program block':'Add program block';
 $('psBlockId').value=b?.id||'';
 $('psTitle').value=b?.title||'';
 $('psDate').value=b?.date||lookup(selectedEvent)?.startDate||'';
 $('psTime').value=b?.time||'';
 $('psKind').value=b?.kind||'sessions';
 $('psOrder').value=b?.order??(data.programBlocks.filter(x=>x.eventId===selectedEvent).length+1)*10;
 $('psNotes').value=b?.notes||'';
 $('psLayout').innerHTML=option('','Full width','')+layouts(selectedEvent).map(l=>option(l.id,l.name,b?.layoutId||'')).join('');
 $('psLayout').value=b?.layoutId||'';
 $('psLayout').disabled=$('psKind').value==='activity';
 $('psBlockDialog').showModal();
}
async function saveBlock(){
 const title=clean($('psTitle').value),date=$('psDate').value,time=clean($('psTime').value);
 if(!selectedEvent||!title||!date||!time)return alert('Program block title, date and time are required.');
 const old=block($('psBlockId').value),kind=$('psKind').value,layoutId=kind==='activity'?'':$('psLayout').value;
 const linked=data.sessions.filter(s=>s.blockId===old?.id);
 if(kind==='activity'&&linked.length)return alert('Move the '+linked.length+' assigned session(s) before changing this block to an activity.');
 const newLayout=layouts(selectedEvent).find(l=>l.id===layoutId);
 const validCol=new Set((newLayout?.columns||[]).map(c=>c.id));
 const rec={id:old?.id||uid('block'),eventId:selectedEvent,title,date,time,kind,layoutId,order:Number($('psOrder').value)||0,notes:clean($('psNotes').value)};
 const records=[{type:'program-block',id:rec.id,payload:{...rec}}];
 delete records[0].payload.id;
 for(const s of linked){
  const updated={...s,date,time,columnId:validCol.has(s.columnId)?s.columnId:''};
  delete updated.id;delete updated._updatedAt;
  records.push({type:'session',id:s.id,payload:updated});
 }
 $('psSave').disabled=true;
 try{
  const response=await api('/api/batch',{method:'POST',body:JSON.stringify({records})});
  if(response.failed)throw Error('Some records were not saved. Refresh before trying again.');
  $('psBlockDialog').close();
  await reload();
 }catch(e){alert('Could not save program block: '+e.message);}
 finally{$('psSave').disabled=false;}
}
async function removeBlock(id){
 const b=block(id);if(!b)return;
 const sessions=data.sessions.filter(s=>s.blockId===id);
 if(!confirm('Delete "'+b.title+'"? '+sessions.length+' assigned session(s) will be ungrouped, not deleted.'))return;
 try{
  if(sessions.length){
   const records=sessions.map(s=>{const payload={...s,blockId:'',columnId:''};delete payload.id;delete payload._updatedAt;return {type:'session',id:s.id,payload};});
   await api('/api/batch',{method:'POST',body:JSON.stringify({records})});
  }
  await api('/api/record?type=program-block&id='+encodeURIComponent(id),{method:'DELETE'});
  await reload();
 }catch(e){alert('Could not remove block: '+e.message);}
}
async function reload(){
 if(window.LeagueRefreshSharedState)await window.LeagueRefreshSharedState();
 else {const r=await api('/api/state');refresh(r.state||{events:[],sessions:[],programBlocks:[]});}
}
window.ProgramStructure={refresh,openEvent,getLayouts,validateLayouts,openSession,sessionAssignment,validateSession};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>refresh(window.LeagueSharedState?.()));else refresh(window.LeagueSharedState?.());
})();
