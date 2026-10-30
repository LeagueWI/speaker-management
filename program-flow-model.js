/*
 * Pure schedule presentation model. Sessions remain authoritative; only rows,
 * display order, headings, and agenda-only items are persisted.
 */
(()=>{
'use strict';
const norm=s=>String(s??'').trim();
const timeKey=s=>norm(s).toLowerCase().replace(/[–—−-]/g,'-').replace(/\s+/g,'').replace(/\./g,'');
function minutes(s){
 const first=norm(s).split(/[–—−-]/)[0].trim();
 const m=first.match(/^(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i);
 if(!m)return 1500;
 let h=+m[1],min=+(m[2]||0);
 if(m[3])h=h%12+(/^p/i.test(m[3])?12:0);
 else if(h>=1&&h<=6)h+=12;
 return h*60+min;
}
function compare(a,b){return norm(a.date).localeCompare(norm(b.date))||minutes(a.time)-minutes(b.time)||norm(a.time).localeCompare(norm(b.time))||norm(a.title).localeCompare(norm(b.title));}
function slotKey(s){return norm(s.date)+'|'+timeKey(s.time);}
function stableId(s){
 const key=slotKey(s),hash=Array.from(key).reduce((n,c)=>Math.imul(n^c.charCodeAt(0),16777619)>>>0,2166136261);
 return 'auto_'+hash.toString(36);
}
function makeRow(s){return{id:stableId(s),kind:'sessions',date:norm(s.date),time:norm(s.time),heading:'',notes:'',labels:{},sessionIds:[]};}
function build(sessions,eventId){
 const list=(sessions||[]).filter(s=>s.eventId===eventId).sort(compare);
 const groups=new Map();
 for(const s of list){
  const key=slotKey(s)||('undated|'+s.id);
  if(!groups.has(key))groups.set(key,makeRow(s));
  groups.get(key).sessionIds.push(s.id);
 }
 return [...groups.values()];
}
function cleanRow(row){
 const kind=['sessions','activity','heading'].includes(row?.kind)?row.kind:'sessions';
 return {id:norm(row?.id),kind,date:norm(row?.date),time:norm(row?.time),
   heading:norm(row?.heading),title:norm(row?.title),notes:norm(row?.notes),
   labels:row?.labels&&typeof row.labels==='object'&&!Array.isArray(row.labels)?{...row.labels}:{},
   sessionIds:Array.isArray(row?.sessionIds)?row.sessionIds.map(norm).filter(Boolean):[]};
}
function reconcile(saved,sessions,eventId){
 const list=(sessions||[]).filter(s=>s.eventId===eventId).sort(compare);
 if(!saved?.length)return build(list,eventId);
 const known=new Map(list.map(s=>[s.id,s])),used=new Set(),rows=[];
 for(const raw of saved){
  const row=cleanRow(raw);
  if(!row.id)continue;
  if(row.kind==='sessions'){
   row.sessionIds=row.sessionIds.filter(id=>{
     if(!known.has(id)||used.has(id))return false;
     used.add(id);return true;
   });
   if(!row.sessionIds.length&&row.id.startsWith('auto_'))continue;
  }else row.sessionIds=[];
  rows.push(row);
 }
 const pending=list.filter(s=>!used.has(s.id));
 for(const s of pending){
  const key=slotKey(s);
  let r=rows.find(x=>x.kind==='sessions'&&x.date===s.date&&timeKey(x.time)===timeKey(s.time));
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
