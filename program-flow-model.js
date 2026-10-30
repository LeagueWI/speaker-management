/*
 * Pure schedule presentation model. Sessions remain authoritative; only rows,
 * display order, headings, and agenda-only items are persisted.
 */
(()=>{
'use strict';
const norm=s=>String(s??'').trim();
function parseClock(raw,inherit=''){
 const m=norm(raw).match(/^(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i);
 if(!m)return null;
 let h=Number(m[1]),min=Number(m[2]||0);
 const suffix=(m[3]||inherit).replace(/\./g,'').toLowerCase();
 if(suffix)h=h%12+(suffix.startsWith('p')?12:0);
 else if(h>=1&&h<=6)h+=12;
 return h*60+min;
}
function timeKey(value){
 const parts=norm(value).split(/[–—−-]/).map(p=>p.trim()).filter(Boolean);
 if(!parts.length)return '';
 const endPart=parts[parts.length-1];
 const suffix=(endPart.match(/(a\.?m\.?|p\.?m\.?)\s*$/i)||[])[1]||'';
 const end=parseClock(endPart);
 let start=parseClock(parts[0],suffix);
 if(start===null)return norm(value).toLowerCase().replace(/\s+/g,'').replace(/\./g,'');
 if(parts.length>1&&end!==null){
  if(start>end&&suffix.toLowerCase().startsWith('p')&&start-end>60)start-=720;
  return String(start)+'-'+String(end);
 }
 return String(start);
}
function minutes(value){
 const start=timeKey(value).split('-')[0];
 const n=Number(start);return start!==''&&Number.isFinite(n)?n:1500;
}
function compare(a,b){return norm(a.date).localeCompare(norm(b.date))||minutes(a.time)-minutes(b.time)||timeKey(a.time).localeCompare(timeKey(b.time))||norm(a.title).localeCompare(norm(b.title))||norm(a.time).localeCompare(norm(b.time));}
function slotKey(s){const date=norm(s.date),time=timeKey(s.time);return date&&time?date+'|'+time:date+'|unscheduled|'+norm(s.id);}
function stableId(s){
 const key=slotKey(s),hash=Array.from(key).reduce((n,c)=>Math.imul(n^c.charCodeAt(0),16777619)>>>0,2166136261);
 return 'auto_'+hash.toString(36);
}
function makeRow(s){return{id:stableId(s),kind:'sessions',date:norm(s.date),time:norm(s.time),heading:'',notes:'',labels:{},sessionIds:[]};}
function build(sessions,eventId,legacyBlocks=[]){
 const list=(sessions||[]).filter(s=>s.eventId===eventId).sort(compare);
 const groups=new Map();
 for(const s of list){
  const key=slotKey(s)||('undated|'+s.id);
  if(!groups.has(key))groups.set(key,makeRow(s));
  groups.get(key).sessionIds.push(s.id);
 }
 const result=[...groups.values()];
 for(const b of legacyBlocks||[]){
  if(b.eventId!==eventId)continue;
  if(b.kind==='activity'){
   result.push({id:'legacy_activity_'+b.id,kind:'activity',date:norm(b.date),time:norm(b.time),title:norm(b.title),notes:norm(b.notes),sessionIds:[],labels:{}});
  }else{
   const r=result.find(x=>x.kind==='sessions'&&x.date===b.date&&timeKey(x.time)===timeKey(b.time));
   if(r&&r.sessionIds.length>1&&!r.heading)r.heading=norm(b.title);
   else if(!r&&norm(b.title))result.push({id:'legacy_item_'+b.id,kind:'activity',date:norm(b.date),time:norm(b.time),title:norm(b.title),notes:norm(b.notes),sessionIds:[],labels:{}});
  }
 }
 return result.sort(compare);
}
function cleanRow(row){
 const kind=['sessions','activity','heading'].includes(row?.kind)?row.kind:'sessions';
 return {id:norm(row?.id),kind,date:norm(row?.date),time:norm(row?.time),
   heading:norm(row?.heading),title:norm(row?.title),notes:norm(row?.notes),
   labels:row?.labels&&typeof row.labels==='object'&&!Array.isArray(row.labels)?{...row.labels}:{},
   sessionIds:Array.isArray(row?.sessionIds)?row.sessionIds.map(norm).filter(Boolean):[]};
}
function reconcile(saved,sessions,eventId,legacyBlocks=[]){
 const list=(sessions||[]).filter(s=>s.eventId===eventId).sort(compare);
 if(!saved?.length)return build(list,eventId,legacyBlocks);
 const known=new Map(list.map(s=>[s.id,s])),used=new Set(),rows=[];
 for(const raw of saved){
  const row=cleanRow(raw);
  if(!row.id)continue;
  if(row.kind==='sessions'){
   row.sessionIds=row.sessionIds.filter(id=>{
     if(!known.has(id)||used.has(id))return false;
     const current=known.get(id);
     if(current.date!==row.date||timeKey(current.time)!==timeKey(row.time))return false;
     used.add(id);return true;
   });
   if(!row.sessionIds.length)continue;
  }else row.sessionIds=[];
  rows.push(row);
 }
 const pending=list.filter(s=>!used.has(s.id));
 for(const s of pending){
  const key=slotKey(s);
  let r=norm(s.date)&&norm(s.time)?rows.find(x=>x.kind==='sessions'&&x.date===s.date&&timeKey(x.time)===timeKey(s.time)):null;
  if(!r){
   r=makeRow(s);
   if(rows.some(x=>x.id===r.id))r.id+='_'+s.id;
   const i=rows.findIndex(x=>compare(s,x)<0);
   rows.splice(i<0?rows.length:i,0,r);
  }
  r.sessionIds.push(s.id);
 }
 // Sessions update by reference, and their saved layout order stays intact.
 return rows;
}
window.LeagueProgramModel={build,reconcile,minutes,timeKey,compare,cleanRow};
})();
