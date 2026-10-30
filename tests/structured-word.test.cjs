const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const scope = { window: {} };
vm.runInNewContext(fs.readFileSync('structured-word.js', 'utf8'), scope);
const { documentXML } = scope.window.LeagueStructuredWord;

function fixture(columns = 2) {
  const cols = Array.from({length:columns}, (_,i)=>({id:'col'+i,name:'Track '+(i+1),room:'Room '+(i+1)}));
  return {
    events:[{id:'e',name:'Spring Exchange & Capitol Connections',location:'Madison, WI',
      startDate:'2027-05-13',endDate:'2027-05-14',
      programLayouts:[{id:'layout',name:'Breakouts',columns:cols}]}],
    programBlocks:[
      {id:'general',eventId:'e',date:'2027-05-13',time:'9:00 AM',kind:'sessions',title:'Opening General Session'},
      {id:'breakouts',eventId:'e',date:'2027-05-13',time:'10:30 AM',kind:'sessions',title:'Breakout Sessions 1',layoutId:'layout'},
      {id:'break',eventId:'e',date:'2027-05-13',time:'11:20 AM',kind:'activity',title:'BREAK'},
      {id:'roundtables',eventId:'e',date:'2027-05-14',time:'9:30 AM',kind:'sessions',title:'Learning Roundtables',layoutId:'layout'}
    ],
    sessions:[
      {id:'s1',eventId:'e',blockId:'general',title:'Opening',date:'2027-05-13',time:'9:00 AM'},
      {id:'s2',eventId:'e',blockId:'breakouts',columnId:'col0',title:'Public Records',date:'2027-05-13',room:'A'},
      {id:'s3',eventId:'e',blockId:'roundtables',columnId:'col'+(columns-1),title:'Municipal Authority',date:'2027-05-14'}
    ],
    speakers:[
      {id:'sp1',sessionId:'s2',firstName:'Jane',lastName:'Presenter',speakerStatus:'Confirmed'},
      {id:'sp2',sessionId:'s2',firstName:'Declined',lastName:'Person',speakerStatus:'Declined'}
    ]
  };
}

test('creates landscape Word XML with day headings, activities, and speakers',()=>{
  const xml=documentXML(fixture(), 'e');
  assert.match(xml,/w:orient="landscape"/);
  assert.match(xml,/Thursday, May 13, 2027/);
  assert.match(xml,/Friday, May 14, 2027/);
  assert.match(xml,/Breakout Sessions 1/);
  assert.match(xml,/Jane Presenter/);
  assert.doesNotMatch(xml,/Declined Person/);
  assert.match(xml,/Spring Exchange &amp; Capitol Connections/);
  assert.match(xml,/BREAK/);
});

test('all merged table rows use the entire table width for 1, 2, 3, and 5 columns',()=>{
  for (const columns of [1,2,3,5]) {
    const xml=documentXML(fixture(columns),'e');
    const rows=[...xml.matchAll(/<w:tr>([\s\S]*?)<\/w:tr>/g)].map(m=>m[1]);
    assert.ok(rows.length>=5);
    for (const row of rows) {
      const cells=[...row.matchAll(/<w:tc>([\s\S]*?)<\/w:tc>/g)].map(m=>m[1]);
      const spans=cells.map(cell=>Number(cell.match(/<w:gridSpan w:val="(\d+)"/)?.[1]||1));
      assert.equal(spans.reduce((a,b)=>a+b,0),14,'Grid span mismatch for '+columns+' columns');
    }
  }
});

test('unassigned sessions are preserved instead of being dropped',()=>{
  const s=fixture();
  s.sessions.push({id:'orphan',eventId:'e',date:'2027-05-14',time:'12:30 PM',title:'Unassigned session'});
  assert.match(documentXML(s,'e'),/Unassigned session/);
});

test('missing events are reported',()=>{
  assert.throws(()=>documentXML(fixture(),'not_an_event'),/Event not found/);
});

test('track room is inherited unless an individual session overrides it',()=>{
  const data=fixture();
  data.sessions.find(s=>s.id==='s2').room='';
  let xml=documentXML(data,'e');
  assert.match(xml,/Room 1/);
  assert.doesNotMatch(xml,/Room: A/);
  data.sessions.find(s=>s.id==='s2').room='Overflow Room';
  xml=documentXML(data,'e');
  assert.match(xml,/Overflow Room/);
  assert.match(xml,/Room 1/);
});
