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
function cell(parts,span=1,shading='FFFFFF',vCenter=false){
 const width=span===13?13760:span===12?11760:span*980;
 return '<w:tc><w:tcPr><w:tcW w:w="'+width+'" w:type="dxa"/>'+
 (span>1?'<w:gridSpan w:val="'+span+'"/>':'')+
 '<w:shd w:fill="'+shading+'"/><w:vAlign w:val="'+(vCenter?'center':'top')+'"/></w:tcPr>'+
 (parts&&parts.length?parts.join(''):para(''))+'</w:tc>';
}
const row=cells=>'<w:tr><w:trPr><w:cantSplit/></w:trPr>'+cells.join('')+'</w:tr>';
function speakersOf(s,session){
 return (s.speakers||[]).filter(p=>p.sessionId===session.id&&p.speakerStatus!=='Declined')
   .map(p=>[[(p.firstName||''),(p.lastName||'')].filter(Boolean).join(' ').trim(),p.title,p.organization].filter(Boolean).join(', ')).filter(Boolean);
}
function sessionParagraphs(s,x){
 const parts=[para(x.title||'Untitled session',{bold:true,size:19})];
 if(x.room)parts.push(para('Room: '+x.room,{size:16,color:'526574'}));
 const speakers=speakersOf(s,x);
 if(speakers.length){parts.push(para('Speakers:',{bold:true,size:16}));speakers.forEach(p=>parts.push(para(p,{size:16})));}
 if(x.notes)parts.push(para(x.notes,{size:15,color:'526574'}));
 return parts;
}
function sortRows(a,b){
 return (a.date||'').localeCompare(b.date||'')||
 (a.time||'').localeCompare(b.time||'')||
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
function makeTable(s,id){
 const {event,rows:items}=rowsFor(s,id),layouts=event.programLayouts||[];
 const ss=(s.sessions||[]).filter(x=>x.eventId===id);
 const tableRows=[];let lastDay=null;
 for(const b of items){
  if(b.date!==lastDay){
   lastDay=b.date;
   tableRows.push(row([cell([para(DAY(b.date),{bold:true,size:22,center:true})],13,'D4D4D4',true)]));
  }
  const assigned=b.singleSession?[b.singleSession]:ss.filter(x=>x.blockId===b.id);
  const layout=layouts.find(l=>l.id===b.layoutId);
  const columns=Array.isArray(layout?.columns)?layout.columns:[];
  if(b.kind==='activity'){
   const isBreak=/\bbreak\b|\btransition\b/i.test(b.title||'');
   tableRows.push(row([
    cell([para(b.time||'',{size:17})],1,'FFFFFF',true),
    cell([para(b.title||'Activity',{bold:true,size:18,color:isBreak?'B3261E':'222222'}),...(b.notes?[para(b.notes,{size:16})]:[])],12,isBreak?'FFFFFF':'F1F1F1',true)
   ]));
   continue;
  }
  if(columns.length>1){
   if(columns.length>3)throw Error('Structured Word output currently supports up to three columns per layout. Reduce the layout or use the standard template.');
   tableRows.push(row([cell([para(b.title||layout.name||'Concurrent sessions',{bold:true,size:19,center:true,color:'B3261E'})],13,'D4D4D4',true)]));
   const span=12/columns.length,cells=[cell([para(b.time||'',{size:17})],1,'FFFFFF')];
   for(const col of columns){
    const group=assigned.filter(x=>x.columnId===col.id);
    const parts=[para(col.name||'Track',{bold:true,size:18,center:true})];
    if(col.room)parts.push(para('Room: '+col.room,{size:15,center:true,color:'526574'}));
    if(!group.length)parts.push(para('No session assigned',{italic:true,size:16,color:'66788A'}));
    for(const ses of group)parts.push(...sessionParagraphs(s,ses));
    cells.push(cell(parts,span,'FFFFFF'));
   }
   const leftovers=assigned.filter(x=>!columns.some(c=>c.id===x.columnId));
   tableRows.push(row(cells));
   for(const ses of leftovers)tableRows.push(row([cell([para(b.time||'',{size:16})],1),cell([para('Unassigned track',{bold:true,color:'B3261E'}),...sessionParagraphs(s,ses)],12)]));
  }else{
   if(assigned.length){
    for(let i=0;i<assigned.length;i++){
     const x=assigned[i];
     tableRows.push(row([cell([para(b.time||x.time||'',{size:17})],1,'FFFFFF',true),
       cell(sessionParagraphs(s,x),12,i===0?'EDEDED':'FFFFFF')]));
    }
   }else{
    tableRows.push(row([cell([para(b.time||'',{size:17})],1),cell([para(b.title||'Session TBD',{bold:true,size:18}),...(b.notes?[para(b.notes,{size:16})]:[])],12,'EDEDED')]));
   }
  }
 }
 if(!tableRows.length)tableRows.push(row([cell([para('No scheduled program blocks or sessions have been added.',{italic:true})],13)]));
 const grid='<w:tblGrid><w:gridCol w:w="2000"/>'+Array(12).fill('<w:gridCol w:w="980"/>').join('')+'</w:tblGrid>';
 const border='<w:top w:val="single" w:sz="5" w:color="666666"/><w:left w:val="single" w:sz="5" w:color="666666"/><w:bottom w:val="single" w:sz="5" w:color="666666"/><w:right w:val="single" w:sz="5" w:color="666666"/><w:insideH w:val="single" w:sz="5" w:color="666666"/><w:insideV w:val="single" w:sz="5" w:color="666666"/>';
 return '<w:tbl><w:tblPr><w:tblW w:w="13760" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>'+border+'</w:tblBorders><w:tblCellMar><w:top w:w="90" w:type="dxa"/><w:bottom w:w="90" w:type="dxa"/><w:left w:w="110" w:type="dxa"/><w:right w:w="110" w:type="dxa"/></w:tblCellMar></w:tblPr>'+grid+tableRows.join('')+'</w:tbl>';
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
 title+location+datesLine+heading+makeTable(s,id)+sect+'</w:body></w:document>';
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
