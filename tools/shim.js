/* Минимальный DOM для прогона логики страницы в Node.
   Ровно столько, сколько трогает app.html: элементы по id, атрибуты
   корневого элемента, подписка на события и localStorage. */

function makeEl(id) {
  const attrs = {};
  return {
    id,
    innerHTML: '',
    textContent: '',
    value: '',
    hidden: false,
    dataset: {},
    attrs,
    setAttribute(k, v) { attrs[k] = String(v); },
    getAttribute(k) { return k in attrs ? attrs[k] : null; },
    removeAttribute(k) { delete attrs[k]; },
    blur() {},
    focus() {}
  };
}

const els = {};
const root = makeEl('__root__');

global.document = {
  documentElement: root,
  activeElement: makeEl('__active__'),
  getElementById(id) { return els[id] || (els[id] = makeEl(id)); },
  querySelectorAll() { return []; },
  addEventListener() {}
};
global.window = { scrollTo() {} };
global.localStorage = { getItem() { return null; }, setItem() {} };
global.__els = els;
