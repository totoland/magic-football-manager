// Load data.js by stubbing window, then exercise the pure domain logic.
const fs = require('fs');
const code = fs.readFileSync('js/data.js','utf8');
const window = {};
new Function('window', code)(window);
const FM = window.FM;
let pass=0, fail=0;
const eq=(a,b,m)=>{const A=JSON.stringify(a),B=JSON.stringify(b); if(A===B){pass++}else{fail++;console.log('FAIL',m,'\n  got',A,'\n  exp',B);}};

// --- §5.1 scoring: per-slot deltas ---
const a = { s0:{starter:'x',sub:'y'}, s1:{starter:'z',sub:null}, s2:{starter:null,sub:'w'}, s3:{starter:null,sub:null} };
eq(FM.halfDeltas(a), {x:0.5,y:0.5,z:1.0,w:1.0}, '§5.1 mixed slots');

// --- computePlaytime only counts completed halves ---
const players=[{id:'x'},{id:'y'},{id:'z'},{id:'w'}];
const halves=[
  {completed:true, assignments:a},
  {completed:false, assignments:{s0:{starter:'x',sub:null}}},   // not counted
];
eq(FM.computePlaytime(players,halves), {x:0.5,y:0.5,z:1.0,w:1.0}, 'completed-only totals');

// --- §5.2 status ---
eq([FM.statusFor(0,1),FM.statusFor(0.5,1),FM.statusFor(1.5,1)], ['not-played','low','high'], '§5.2 status');

// --- §5.3 parser ---
const txt = [
  '1. Alex Morgan, GK',
  '2) Sam - DF',
  'Jordan FW + Riley MF',
  '  *Bo•  ',
  'Jean-Luc',
  'Pat, XX',          // invalid pos -> UNKNOWN, comma kept? name "Pat" pos UNKNOWN
  '   ',              // empty
  '3- Casey',
].join('\n');
eq(FM.parseImport(txt), [
  {name:'Alex Morgan',pos:'GK'},
  {name:'Sam',pos:'DF'},
  {name:'Jordan',pos:'FW'},
  {name:'Riley',pos:'MF'},
  {name:'Bo',pos:'UNKNOWN'},
  {name:'Jean-Luc',pos:'UNKNOWN'},
  {name:'Pat, XX',pos:'UNKNOWN'},
  {name:'Casey',pos:'UNKNOWN'},
], '§5.3 parser');

// --- FR-1.4 dedup ---
const base=[{id:'1',name:'Alex',pos:'GK'}];
const r=FM.addUnique(base,[{name:'alex',pos:'GK'},{name:'Alex ',pos:'GK'},{name:'Alex',pos:'DF'}]);
eq([r.added,r.skipped, r.players.length], [1,2,2], 'dedup normalized name+pos');

// --- FR-2.7 remap by label ---
const fa = FM.emptyAssignments('4-3-3');
fa.s0={starter:'GK1',sub:null};   // GK
fa.s9={starter:'ST1',sub:'ST2'};  // ST in 4-3-3
const rm = FM.remapFormation('4-3-3','4-4-2',fa);
// 4-4-2: GK is s0 (label GK); ST labels are s9,s10. First ST occupant -> s9.
eq([rm.s0, rm.s9], [{starter:'GK1',sub:null},{starter:'ST1',sub:'ST2'}], 'remap GK+ST by label');

// --- changedSlots vs baseline ---
const bl={s0:{starter:'a',sub:null}}, cur={s0:{starter:'b',sub:null}};
eq(FM.changedSlots('4-3-3',bl,cur).s0, true, 'changed slot detected');
eq(FM.changedSlots('4-3-3',{s0:{starter:'a',sub:null}},{s0:{starter:'a',sub:null}}).s0, false, 'unchanged slot');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
