const assert=require('node:assert/strict');
const {context,html}=require('./context.cjs');
function setup(code='') {
    const c=context();
    c.run(`members=normalizeMembers([{name:'A'},{name:'B'},{name:'C'}]); currentSchedule={}; historyArchive=[]; holidays=[]; currentOff=[]; slotsConfig={san:['Thứ 2']}; ${code}`);
    return c;
}
(async()=>{
    let c=setup(`currentSchedule={'Thứ 2':{san:{name:'A',isDebt:true,status:'pending',debt:{day:'Thứ 3',task:'fridge',frozen:false}}}}; slotsConfig={};`);
    c.run('const retry=tryGenerate(false,false,false)');
    assert.equal(c.run('retry.tempMembers[0].debts[0].task'),'fridge','reroll must return original debt');
    assert.equal(c.run('members[0].debts.length'),0,'tentative attempts must not mutate live members');

    c=setup(`currentSchedule={'Thứ 2':{san:{name:'A',isDebt:true,status:'pending'}}};`);
    await c.run('chotTuan()');
    assert.equal(c.run('members[0].debts.length'),1,'uncharted debt must survive close');
    assert.equal(c.run('members[0].stats.done'),0);
    assert.equal(c.run('historyArchive.length'),1);

    c=setup(`holidays=['Thứ 2']; currentSchedule={'Thứ 2':{san:{name:'A',isDebt:true,status:'done'}}};`);
    await c.run('chotTuan()');
    assert.equal(c.run('members[0].debts.length'),1,'holiday must refund assigned debt');
    assert.equal(c.run('members[0].stats.debtsPaid'),0);

    c=setup(`currentSchedule={'Thứ 2':{san:{name:'A',isDebt:true,status:'done'},tret:{name:'B',status:'done'},fridge:{name:'C',status:'missed'}}};`);
    await c.run('chotTuan()');
    assert.equal(c.run('members[0].stats.done'),0,'debt work must not inflate normal score');
    assert.equal(c.run('members[0].stats.debtsPaid'),1);
    assert.equal(c.run('members[1].stats.done'),1);
    assert.equal(c.run('members[1].nvsCycle'),true);
    assert.equal(c.run('members[2].stats.missed'),1);
    assert.equal(c.run('members[2].debts.length'),1);
    assert.ok(c.alerts.some(a=>a.includes('Chốt tuần thành công')),'success must wait for save');

    c=setup(`currentOff=['A']; currentSchedule={'Thứ 2':{san:{name:'A',isDebt:true,status:'pending',debt:{day:'Thứ 3',task:'fridge',frozen:false}}}};`);
    c.run('resetData()');
    assert.equal(c.run('members[0].debts[0].task'),'fridge');
    assert.equal(c.run('currentOff.length'),0);

    c=setup(`currentSchedule={'Thứ 2':{san:{name:'⚖️ A',status:'pending'}}};`);
    c.run(`manualChangeCell('Thứ 2','tret',{value:'A'})`);
    assert.equal(c.run(`currentSchedule['Thứ 2'].tret`),undefined,'manual edits cannot double-book a person');

    c=setup(`members[0].busyDays=['Thứ 2']; members[0].debts=[{day:'Thứ 2',task:'san',frozen:false}];`);
    c.run('const busyResult=tryGenerate(true,true,false)');
    assert.notEqual(c.run(`busyResult.tempSchedule['Thứ 2'].san.name`),'A','debt must respect busy days');
    assert.equal(c.run('busyResult.tempMembers[0].debts.length'),1);

    c=setup(`members[0].debts=[{day:'Thứ 2',task:'san',frozen:true}];`);
    c.run('const frozenResult=tryGenerate(true,true,false)');
    assert.equal(c.run('frozenResult.tempMembers[0].debts.length'),1,'frozen debts stay frozen');

    c=setup(`currentSchedule={'Thứ 2':{san:{name:'A',status:'pending'}}}; currentOff=['A']; prompt=()=>"D'Anh";`);
    c.run(`renameMember('A')`);
    assert.equal(c.run('currentOff[0]'),"D'Anh");
    c.run(`removeMember("D'Anh")`);
    assert.equal(c.run(`currentSchedule['Thứ 2'].san`),undefined,'deleted members cannot retain active duties');

    c=setup();
    const unsafe=`D'Anh "><img src=x onerror=alert(1)>`;
    c.ctx.testName=unsafe;
    c.run(`members=normalizeMembers([{name:testName}]); currentSchedule={'Thứ 2':{san:{name:testName,status:'pending'}}}; weekModeText='<img src=x onerror=alert(1)>'; realRenderUI();`);
    assert.ok(c.element('member-table-body').innerHTML.includes('&lt;img'));
    assert.ok(!c.element('schedule-table-body').innerHTML.includes('<img'));
    assert.equal(c.element('off-list').textContent,'');
    assert.ok(c.run('jsArg(testName)').includes('&#39;'));
    const before=c.run('JSON.stringify(members)');
    assert.throws(()=>c.run(`applyRemoteState({members:[{name:'Bad',stats:{done:'<img>'}}]})`));
    assert.equal(c.run('JSON.stringify(members)'),before,'bad remote state must not partially apply');
    assert.equal(c.run('isApplyingRemote'),false);
    assert.ok(!html.includes('Phong Thần'));
    assert.equal(c.run(`Object.values(normalizeState({config:{initialized:true}}).config).flat().length`),0,'all disabled tasks must stay disabled after Firebase strips empty arrays');

    c=context({boot:true,storage:[['cuxa_members_v22','broken JSON'],['cuxa_archive_v23','{}']]});
    assert.ok(c.saved.has('cuxa_invalid_cuxa_members_v22'));
    assert.ok(c.saved.has('cuxa_invalid_state'));
    assert.equal(c.run('syncStatus'),'connecting','bad local data must not stop Firebase startup');

    c=setup(`members=[]; holidays=[...days];`);
    assert.equal(c.run('checkFeasibility([])'),null,'a holiday week needs no active members');

    c=setup(`members[0].offCycle=true; members[1].extraCycle=true;`);
    c.run(`const beforeCycles=JSON.stringify(members.map(m=>[m.offCycle,m.extraCycle])); tryGenerate(true,true,false);`);
    assert.equal(c.run('JSON.stringify(members.map(m=>[m.offCycle,m.extraCycle]))'),c.run('beforeCycles'));

    // Deterministic repeated schedules exercise fallback paths and debt conservation.
    c=setup(`members=normalizeMembers(Array.from({length:17},(_,i)=>({name:'P'+i,isLongLeave:i===16,debts:i<4?[{day:'Thứ 2',task:'san',frozen:false}]:[]}))); slotsConfig=JSON.parse(JSON.stringify(defaultSlotsConfig)); let seed=19; Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);`);
    for(let iteration=0;iteration<30;iteration++) {
        await c.run('generateSchedule()');
        assert.equal(c.run(`days.reduce((n,day)=>n+Object.keys(currentSchedule[day]||{}).length,0)`),15);
        assert.equal(c.run(`members.reduce((n,m)=>n+m.debts.length,0)+days.reduce((n,day)=>n+Object.values(currentSchedule[day]||{}).filter(cell=>cell.isDebt).length,0)`),4,'rerolls must conserve debt');
        assert.equal(c.run(`days.every(day=>{const names=Object.values(currentSchedule[day]||{}).map(cell=>stripStatusPrefix(cell.name));return new Set(names).size===names.length && !names.includes('P16');})`),true,'no duplicate or absent member');
        assert.equal(c.run('members.filter(m=>m.offCycle || m.extraCycle).length'),0,'reroll cannot consume a turn before the week closes');
    }
    console.log('PASS: debt refunds, original debt, pending/holiday close, points, missed duties, manual collisions, leave, busy/frozen debt, names, validation, and 30 repeated schedules.');
})();
