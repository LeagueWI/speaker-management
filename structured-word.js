/*
 * Structured editable Word Program Flow.
 * Uses PizZip and the existing valid starter .docx as an OpenXML container.
 * Unlike the legacy session loop, this renderer constructs merged table cells
 * according to the selected Event's program blocks and layout definitions.
 */
(()=>{
'use strict';
const X=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const D=v=>{if(!v)return null;const d=new Date(v+'T12:00:00');return Number.isNaN(d.getTime())?null:d};
const DAY=v=>D(v)?.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})||v||'Date not assigned';
const shortDate=v=>D(v)?.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})||v||'';
function dates(e){
 if(!e.startDate)return shortDate(e.endDate);
 if(!e.endDate||e.startDate===e.endDate)return shortDate(e.startDate);
 return shortDate(e.startDate)+' – '+shortDate(e.endDate);
}
function para(t,{bold=false,size=18,color='222222',center=false,italic=false,space=40}={}){
 const ppr='<w:pPr>'+(center?'<w:jc w:val="center"/>':'')+'<w:spacing w:after="'+space+'"/></w:pPr>';
 const rpr='<w:rPr>'+(bold?'<w:b/>':'')+(italic?'<w:i/>':'')+'<w:color w:val="'+color+'"/><w:sz w:val="'+size+'"/></w:rPr>';
 return '<w:p>'+ppr+'<w:r>'+rpr+'<w:t xml:space="preserve">'+X(t)+'</w:t></w:r></w:p>';
}
function cell(parts,span=1,shading='FFFFFF',vCenter=false,customWidth=0){
 const width=customWidth||(span===14?13800:span===13?11950:span===12?10200:span*850);
 return '<w:tc><w:tcPr><w:tcW w:w="'+width+'" w:type="dxa"/>'+
 (span>1?'<w:gridSpan w:val="'+span+'"/>':'')+
 '<w:shd w:fill="'+shading+'"/><w:vAlign w:val="'+(vCenter?'center':'top')+'"/></w:tcPr>'+
 (parts&&parts.length?parts.join(''):para(''))+'</w:tc>';
}
const timeCell=parts=>cell(parts,1,'FFFFFF',true,1750);
const notesCell=parts=>cell(parts,1,'FFFFFF',true,1850);
const row=cells=>'<w:tr><w:trPr><w:cantSplit/></w:trPr>'+cells.join('')+'</w:tr>';
function speakersOf(s,session){
 return (s.speakers||[]).filter(p=>p.sessionId===session.id&&p.speakerStatus!=='Declined')
   .map(p=>[[(p.firstName||''),(p.lastName||'')].filter(Boolean).join(' ').trim(),p.title,p.organization].filter(Boolean).join(', ')).filter(Boolean);
}
function roomFor(s,x){if(String(x.room||'').trim())return x.room;const b=(s.programBlocks||[]).find(b=>b.id===x.blockId),e=s.events.find(e=>e.id===x.eventId),l=(e?.programLayouts||[]).find(l=>l.id===b?.layoutId),c=l?.columns?.find(c=>c.id===x.columnId);return c?.room||'';}
function sessionParagraphs(s,x,showRoom=true){
 const parts=[para(x.title||'Untitled session',{bold:true,size:19})];
 if(showRoom&&roomFor(s,x))parts.push(para('Room: '+roomFor(s,x),{size:16,color:'526574'}));
 const speakers=speakersOf(s,x);
 if(speakers.length){parts.push(para('Speakers:',{bold:true,size:16}));speakers.forEach(p=>parts.push(para(p,{size:16})));}
 if(x.notes)parts.push(para(x.notes,{size:15,color:'526574'}));
 return parts;
}
function clock(v){const t=String(v||'').split(/[–-]/)[0].trim(),m=t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);if(!m)return 9999;let h=Number(m[1]),min=Number(m[2]||0);if(m[3])h=h%12+(m[3].toLowerCase()==='pm'?12:0);else if(h>=1&&h<=6)h+=12;return h*60+min;}
function sortRows(a,b){
 return (a.date||'').localeCompare(b.date||'')||
 clock(a.time)-clock(b.time)||
 (Number(a.order)||0)-(Number(b.order)||0)||
 (a.title||'').localeCompare(b.title||'');
}
function rowsFor(s,id){
 const e=s.events.find(ev=>ev.id===id);
 if(!e)throw Error('Event not found.');
 const blocks=(s.programBlocks||[]).filter(b=>b.eventId===id).map(b=>({...b,unassigned:false}));
 const used=new Set(blocks.map(b=>b.id));
 const other=(s.sessions||[]).filter(x=>x.eventId===id&&(!x.blockId||!used.has(x.blockId)))
   .map(x=>({id:'legacy_'+x.id,eventId:id,date:x.date||'',time:x.time||'',title:x.title||'',order:0,kind:'sessions',layoutId:'',singleSession:x}));
 return {event:e,rows:blocks.concat(other).sort(sortRows)};
}

/* The visual editor supplies its final row order. It never changes session records. */
function visualTable(s,id){
 const sessions=new Map((s.sessions||[]).filter(x=>x.eventId===id).map(x=>[x.id,x]));
 const rows=s.programFlowRows||[],result=[];let lastDay=null;
 for(const entry of rows){
  const date=entry.date||'';
  if(lastDay!==date){
   lastDay=date;
   result.push(row([cell([para(DAY(date),{bold:true,size:22,center:true})],13,'D4D4D4',true),cell([para('ROOM / NOTES',{bold:true,size:15,center:true})],1,'D4D4D4',true,1850)]));
  }
  if(entry.kind==='heading'){
   result.push(row([cell([para(entry.title||'Section heading',{bold:true,size:19,center:true})],14,'D4D4D4',true)]));
   continue;
  }
  if(entry.kind==='activity'){
   const isBreak=/\bbreak\b|\btransition\b/i.test(entry.title||'');
   result.push(row([timeCell([para(entry.time||'',{size:17})]),cell([para(entry.title||'Activity',{bold:true,size:19,color:isBreak?'B3261E':'222222'})],12,isBreak?'FFFFFF':'F1F1F1',true),notesCell(entry.notes?[para(entry.notes,{size:15})]:[])]));
   continue;
  }
  const ids=(entry.sessionIds||[]).filter(x=>sessions.has(x));
  if(entry.heading)result.push(row([cell([para(entry.heading,{bold:true,size:19,center:true,color:'B3261E'})],14,'D4D4D4',true)]));
  if(!ids.length){
   result.push(row([timeCell([para(entry.time||'',{size:17})]),cell([para('Session not yet assigned',{size:17,italic:true})],12),notesCell([])]));continue;
  }
  for(let start=0;start<ids.length;start+=12){
   const batch=ids.slice(start,start+12);
   if(batch.length===1){
    const x=sessions.get(batch[0]);
    result.push(row([timeCell([para(entry.time||x.time||'',{size:17})]),cell(sessionParagraphs(s,x,false),12,'EDEDED'),notesCell([...(roomFor(s,x)?[para(roomFor(s,x),{size:16})]:[]),...(entry.notes?[para(entry.notes,{size:15})]:[])])]));
   }else{
    const spans=batch.map((_,i)=>Math.floor(12/batch.length)+(i<12%batch.length?1:0));
    const cells=[timeCell([para(entry.time||'',{size:17})])];
    batch.forEach((sid,i)=>{
     const x=sessions.get(sid),parts=[];
     const label=entry.labels?.[sid];
     if(label)parts.push(para(label,{bold:true,size:18,center:true}));
     parts.push(...sessionParagraphs(s,x,true));
     cells.push(cell(parts,spans[i],'FFFFFF'));
    });
    cells.push(notesCell(entry.notes?[para(entry.notes,{size:15})]:[]));
    result.push(row(cells));
   }
  }
 }
 if(!result.length)result.push(row([cell([para('No program items have been added.',{italic:true})],14)]));
 const grid='<w:tblGrid><w:gridCol w:w="1750"/>'+Array(12).fill('<w:gridCol w:w="850"/>').join('')+'<w:gridCol w:w="1850"/></w:tblGrid>';
 const border='<w:top w:val="single" w:sz="5" w:color="666666"/><w:left w:val="single" w:sz="5" w:color="666666"/><w:bottom w:val="single" w:sz="5" w:color="666666"/><w:right w:val="single" w:sz="5" w:color="666666"/><w:insideH w:val="single" w:sz="5" w:color="666666"/><w:insideV w:val="single" w:sz="5" w:color="666666"/>';
 return '<w:tbl><w:tblPr><w:tblW w:w="13800" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>'+border+'</w:tblBorders><w:tblCellMar><w:top w:w="90" w:type="dxa"/><w:bottom w:w="90" w:type="dxa"/><w:left w:w="110" w:type="dxa"/><w:right w:w="110" w:type="dxa"/></w:tblCellMar></w:tblPr>'+grid+result.join('')+'</w:tbl>';
}

function makeTable(s,id){
 const {event,rows:items}=rowsFor(s,id),layouts=event.programLayouts||[];
 const ss=(s.sessions||[]).filter(x=>x.eventId===id);
 const tableRows=[];let lastDay=null;
 for(const b of items){
  if(b.date!==lastDay){
   lastDay=b.date;
   tableRows.push(row([cell([para(DAY(b.date),{bold:true,size:22,center:true})],13,'D4D4D4',true),cell([para('ROOM / NOTES',{bold:true,size:15,center:true})],1,'D4D4D4',true,1850)]));
  }
  const assigned=b.singleSession?[b.singleSession]:ss.filter(x=>x.blockId===b.id);
  const layout=layouts.find(l=>l.id===b.layoutId);
  const columns=Array.isArray(layout?.columns)?layout.columns:[];
  if(b.kind==='activity'){
   const isBreak=/\bbreak\b|\btransition\b/i.test(b.title||'');
   tableRows.push(row([
    timeCell([para(b.time||'',{size:17})]),
    cell([para(b.title||'Activity',{bold:true,size:18,color:isBreak?'B3261E':'222222'})],12,isBreak?'FFFFFF':'F1F1F1',true),
    notesCell(b.notes?[para(b.notes,{size:15})]:[])
   ]));
   continue;
  }
  if(columns.length>1){
   if(columns.length>12)throw Error('Structured Word output supports up to twelve columns per layout.');
   tableRows.push(row([cell([para(b.title||layout.name||'Concurrent sessions',{bold:true,size:19,center:true,color:'B3261E'})],14,'D4D4D4',true)]));
   const spans=columns.map((_,i)=>Math.floor(12/columns.length)+(i<12%columns.length?1:0)),cells=[timeCell([para(b.time||'',{size:17})])];
   for(const [index,col] of columns.entries()){
    const group=assigned.filter(x=>x.columnId===col.id);
    const parts=[para(col.name||'Track',{bold:true,size:18,center:true})];
    if(col.room)parts.push(para('Room: '+col.room,{size:15,center:true,color:'526574'}));
    if(!group.length)parts.push(para('No session assigned',{italic:true,size:16,color:'66788A'}));
    for(const ses of group)parts.push(...sessionParagraphs(s,ses,Boolean(ses.room&&ses.room!==col.room)));
    cells.push(cell(parts,spans[index],'FFFFFF'));
   }
   const leftovers=assigned.filter(x=>!columns.some(c=>c.id===x.columnId));
   cells.push(notesCell(b.notes?[para(b.notes,{size:15})]:[]));
   tableRows.push(row(cells));
   for(const ses of leftovers)tableRows.push(row([timeCell([para(b.time||'',{size:16})]),cell([para('Unassigned track',{bold:true,color:'B3261E'}),...sessionParagraphs(s,ses)],12),notesCell([])]));
  }else{
   if(assigned.length){
    for(let i=0;i<assigned.length;i++){
     const x=assigned[i];
     tableRows.push(row([timeCell([para(b.time||x.time||'',{size:17})]),
       cell(sessionParagraphs(s,x,false),12,i===0?'EDEDED':'FFFFFF'),
       notesCell([...(roomFor(s,x)?[para(roomFor(s,x),{size:16})]:[]),...(b.notes?[para(b.notes,{size:15})]:[])])]));
    }
   }else{
    tableRows.push(row([timeCell([para(b.time||'',{size:17})]),cell([para(b.title||'Session TBD',{bold:true,size:18})],12,'EDEDED'),notesCell(b.notes?[para(b.notes,{size:15})]:[])]));
   }
  }
 }
 if(!tableRows.length)tableRows.push(row([cell([para('No scheduled program blocks or sessions have been added.',{italic:true})],14)]));
 const grid='<w:tblGrid><w:gridCol w:w="1750"/>'+Array(12).fill('<w:gridCol w:w="850"/>').join('')+'<w:gridCol w:w="1850"/></w:tblGrid>';
 const border='<w:top w:val="single" w:sz="5" w:color="666666"/><w:left w:val="single" w:sz="5" w:color="666666"/><w:bottom w:val="single" w:sz="5" w:color="666666"/><w:right w:val="single" w:sz="5" w:color="666666"/><w:insideH w:val="single" w:sz="5" w:color="666666"/><w:insideV w:val="single" w:sz="5" w:color="666666"/>';
 return '<w:tbl><w:tblPr><w:tblW w:w="13800" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>'+border+'</w:tblBorders><w:tblCellMar><w:top w:w="90" w:type="dxa"/><w:bottom w:w="90" w:type="dxa"/><w:left w:w="110" w:type="dxa"/><w:right w:w="110" w:type="dxa"/></w:tblCellMar></w:tblPr>'+grid+tableRows.join('')+'</w:tbl>';
}
function documentXML(s,id){
 const e=s.events.find(x=>x.id===id);
 if(!e)throw Error('Event not found.');
 const title=para(e.name||'Program Flow',{bold:true,size:28,center:true,space:80});
 const location=para(e.location||'',{size:19,center:true});
 const datesLine=para(dates(e),{size:19,center:true,space:140});
 const heading=para('PROGRAM FLOW',{bold:true,size:21,space:120});
 const sect='<w:sectPr><w:pgSz w:w="15840" w:h="12240" w:orient="landscape"/><w:pgMar w:top="840" w:right="900" w:bottom="840" w:left="900" w:header="400" w:footer="400" w:gutter="0"/></w:sectPr>';
 return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
 '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+
 title+location+datesLine+heading+(Array.isArray(s.programFlowRows)?visualTable(s,id):makeTable(s,id))+sect+'</w:body></w:document>';
}
async function generate(s,id){
 if(!window.PizZip)throw Error('Word generation library has not loaded.');
 const response=await fetch('/program-flow-starter.docx');
 if(!response.ok)throw Error('The Word starter template could not be loaded.');
 const zip=new PizZip(await response.arrayBuffer());
 zip.file('word/document.xml',documentXML(s,id));
 return zip.generate({type:'blob',compression:'DEFLATE',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}
window.LeagueStructuredWord={generate,documentXML};
})();
