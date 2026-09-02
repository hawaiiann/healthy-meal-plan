const mk = () => ({ innerHTML:'', textContent:'', setAttribute(){}, dataset:{} });
const els = {};
global.document = {
  getElementById(id){ return els[id] || (els[id] = mk()); },
  querySelectorAll(){ return []; },
  addEventListener(){}
};
global.window = { scrollTo(){} };
global.localStorage = { getItem(){ return null; }, setItem(){} };
global.__els = els;
