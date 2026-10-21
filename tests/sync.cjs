const assert = require('node:assert/strict');
const {context: makeContext} = require('./context.cjs');
function context() {
    const c=makeContext();
    c.run('syncEnabled=true;');
    return c;
}
(async () => {
    let c = context();
    c.run(`lastSyncedUpdatedAt = 10; dbRef = { transaction: async (update, _, optimistic) => {
        if (optimistic !== false) throw new Error('must wait for server');
        const data = update({updatedAt:10});
        if (!data || data.updatedAt <= 10) throw new Error('missing new version');
        return { committed: true, snapshot: { val: () => data } };
    } };`);
    await c.run('saveData()');
    assert.equal(c.saved.has('cuxa_unsynced_backup'), false);
    assert.equal(c.run('syncStatus'), 'online');
    c.run(`applyRemoteState({updatedAt:1,members:[{name:'Test',stats:{done:0,missed:0}}]});`);
    assert.equal(c.run('members[0].debts.length'), 0);
    assert.equal(c.run('members[0].busyDays.length'), 0);
    c.run(`applyRemoteState({updatedAt:2});`);
    assert.equal(c.run('members.length'), 0);

    c = context();
    c.run(`lastSyncedUpdatedAt = 10; dbRef = { transaction: async update => {
        const remote = {updatedAt:11,members:[],mode:'server'};
        if (update(remote) !== undefined) throw new Error('stale write allowed');
        return { committed:false, snapshot:{val:()=>remote} };
    } };`);
    await c.run('saveData()');
    assert.equal(c.run('weekModeText'), 'server');
    assert.equal(c.saved.has('cuxa_unsynced_backup'), true);

    c = context();
    c.run(`dbRef = { transaction: async () => { throw new Error('network test'); } }; console = {error(){}};`);
    await c.run('saveData()');
    assert.equal(c.saved.has('cuxa_unsynced_backup'), true);
    assert.equal(c.run('syncSaving'), false);
    assert.equal(c.run('syncStatus'), 'error');

    c.run(`weekModeText='next change'; dbRef={transaction:async update=>{const data=update(null);return {committed:true,snapshot:{val:()=>data}};}}; console={error(){}};`);
    assert.equal(await c.run('saveData()'),true);
    assert.equal(c.run('listUnsyncedBackups().length'),1,'successful writes must retain earlier failed changes');

    c = context();
    c.run(`syncConnected=false; dbRef={transaction(){throw new Error('must not write offline');}};`);
    await c.run('saveData()');
    assert.equal(c.saved.has('cuxa_unsynced_backup'), true);
    assert.equal(c.run('syncStatus'), 'error');

    c = context();
    c.run(`let listener; firebase.database = () => ({ref:()=>({on:(_,fn)=>{listener=fn;}})}); initFirebaseSync(); listener({val:()=>null});`);
    assert.equal(c.run('syncReady'), true);
    assert.equal(c.run('syncStatus'), 'online');

    const first=context(), second=context();
    let server={updatedAt:10,members:[{name:'A'}],mode:'original'};
    const reference={transaction:async update=>{
        const data=update(server);
        const committed=data !== undefined;
        if(committed) server=JSON.parse(JSON.stringify(data));
        return {committed,snapshot:{val:()=>server}};
    }};
    for(const client of [first,second]) {
        client.ctx.ref=reference; client.ctx.server=server;
        client.run(`applyRemoteState(server);dbRef=ref;`);
    }
    first.run(`weekModeText='first client'`);
    second.run(`weekModeText='second client'`);
    assert.deepEqual(await Promise.all([first.run('saveData()'),second.run('saveData()')]),[true,false]);
    assert.equal(server.mode,'first client');
    assert.equal(second.run('weekModeText'),'first client');
    assert.equal(second.saved.has('cuxa_unsynced_backup'),true);
    console.log('PASS: script syntax, successful save, conflicting save, failed save, initial connection.');
})();
