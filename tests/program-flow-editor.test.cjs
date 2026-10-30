const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const context={window:{}};
vm.runInNewContext(fs.readFileSync('program-flow-model.js','utf8'),context);
vm.runInNewContext(fs.readFileSync('structured-word.js','utf8'),context);
const model=context.window.LeagueProgramModel;
const word=context.window.LeagueStructuredWord;
const sessions=[
 {id:'a',eventId:'e',date:'2027-05-13',time:'9:00–10:20 AM',title:'Opening General Session',room:'Assembly'},
 {id:'b',eventId:'e',date:'2027-05-13',time:'10:30–11:20 AM',title:'Public Records',room:'Room A'},
 {id:'c',eventId:'e',date:'2027-05-13',time:'10:30 - 11:20 am',title:'Open Meetings',room:'Room B'},
 {id:'d',eventId:'e',date:'2027-05-14',time:'9:30–10:20 AM',title:'Roundtable 1'},
 {id:'other',eventId:'unrelated',date:'2027-05-13',time:'9:00 AM',title:'Other conference'}
];
const event={id:'e',name:'Spring Exchange & Capitol Connections',startDate:'2027-05-13',endDate:'2027-05-14',location:'Madison, WI'};
function data(flowRows){return{events:[event],sessions,speakers:[{id:'sp1',sessionId:'c',firstName:'Jane',lastName:'Speaker',speakerStatus:'Confirmed'}],programBlocks:[],programFlowRows:flowRows};}

test('auto groups only concurrent sessions for the selected event',()=>{
 const rows=model.build(sessions,'e');
 assert.equal(rows.length,3);
 assert.equal(rows[0].sessionIds[0],'a');
 assert.deepEqual(Array.from(rows[1].sessionIds),['b','c']);
 assert.equal(rows[2].sessionIds[0],'d');
});

test('preserves manual headings, agenda items and ordered sessions after session updates',()=>{
 const rows=model.build(sessions,'e');
 const group=rows[1];group.heading='Concurrent Breakouts';group.sessionIds.reverse();
 rows.splice(1,0,{id:'break',kind:'activity',date:'2027-05-13',time:'10:20–10:30 AM',title:'BREAK',notes:'Coffee',sessionIds:[],labels:{}});
 const newer=[...sessions,{id:'new',eventId:'e',date:'2027-05-14',time:'11:30 AM',title:'Closing Session'}];
 const updated=model.reconcile(rows,newer,'e');
 assert.equal(updated.some(x=>x.id==='break'&&x.title==='BREAK'),true);
 assert.equal(updated.find(x=>x.id===group.id).heading,'Concurrent Breakouts');
 assert.deepEqual(Array.from(updated.find(x=>x.id===group.id).sessionIds),['c','b']);
 assert.equal(updated.some(x=>x.sessionIds.includes('new')),true);
 assert.equal(updated.flatMap(x=>x.sessionIds).filter(x=>x==='b').length,1);
});

test('deleted sessions are removed from layout but agenda items remain',()=>{
 const rows=model.build(sessions,'e');
 rows.push({id:'meal',kind:'activity',date:'2027-05-14',time:'12:30 PM',title:'Lunch',sessionIds:[]});
 const changed=model.reconcile(rows,sessions.filter(s=>s.id!=='c'),'e');
 assert.equal(changed.flatMap(r=>r.sessionIds).includes('c'),false);
 assert.equal(changed.some(r=>r.title==='Lunch'),true);
});

test('editable Word program uses visual row order, headings, speakers and rooms',()=>{
 const rows=model.build(sessions,'e');
 rows[1].heading='Breakout Sessions 1';
 rows[1].labels={'b':'Track One','c':'Track Two'};
 rows.push({id:'reception',kind:'activity',date:'2027-05-14',time:'5:00 PM',title:'Reception',notes:'Atrium',sessionIds:[]});
 const xml=word.documentXML(data(rows),'e');
 assert.match(xml,/w:orient="landscape"/);
 assert.match(xml,/Spring Exchange &amp; Capitol Connections/);
 for(const value of ['Breakout Sessions 1','Track One','Track Two','Public Records','Open Meetings','Jane Speaker','Room A','Room B','Reception','Atrium']){
   assert.ok(xml.includes(value),value+' is missing');
 }
 const all=[...xml.matchAll(/<w:tr>([\s\S]*?)<\/w:tr>/g)];
 for(const m of all){
   const cells=[...m[1].matchAll(/<w:tc>([\s\S]*?)<\/w:tc>/g)];
   const span=cells.reduce((n,c)=>n+Number(c[1].match(/<w:gridSpan w:val="(\d+)"/)?.[1]||1),0);
   assert.equal(span,14);
 }
});

test('Word output excludes speakers marked declined',()=>{
 const rows=model.build(sessions,'e');
 const fixture=data(rows);
 fixture.speakers.push({id:'declined',sessionId:'c',firstName:'Declined',lastName:'Person',speakerStatus:'Declined'});
 assert.doesNotMatch(word.documentXML(fixture,'e'),/Declined Person/);
});
