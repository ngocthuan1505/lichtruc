const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index.html', 'utf8');
const source = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
function context(options={}) {
    const saved = new Map(options.storage || []), elements = new Map(), alerts = [];
    const element = id => {
        if (!elements.has(id)) elements.set(id, {value:'',style:{},classList:{replace(){}},innerHTML:'',textContent:''});
        return elements.get(id);
    };
    const ctx=vm.createContext({console,Date,window:{addEventListener(){}},setTimeout(){},alert:message=>alerts.push(message),confirm:()=>true,prompt:()=>null,
        localStorage:{getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value),removeItem:key=>saved.delete(key)},
        document:{getElementById:element,querySelector:element,getElementsByClassName:()=>[]},
        firebase:{apps:[],initializeApp(){},database:()=>({ref:()=>({on(){},off(){}})})}});
    vm.runInContext(options.boot ? source : source.slice(0,source.lastIndexOf('        try {\n            applyRemoteState({members,schedule:currentSchedule')),ctx);
    vm.runInContext('const realRenderUI=renderUI; renderUI=()=>{}; syncEnabled=false; syncReady=true; syncConnected=true;',ctx);
    return {ctx,saved,alerts,elements,element,run:code=>vm.runInContext(code,ctx)};
}
module.exports={context,source,html};
