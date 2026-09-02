const fs = require('fs');
const css = fs.readFileSync(require('path').join(__dirname,'..','src','app.html'),'utf8').match(/<style>([\s\S]*?)<\/style>/)[1];

function tokens(blockRe){
  const m = css.match(blockRe); if(!m) return null;
  const t = {};
  for (const mm of m[1].matchAll(/(--[\w-]+)\s*:\s*(#[0-9A-Fa-f]{3,8})/g)) t[mm[1]] = mm[2];
  return t;
}
const light = tokens(/:root\{([\s\S]*?)\}/);
const darkRaw = tokens(/:root\[data-theme="dark"\]\{([\s\S]*?)\}/);
const dark = Object.assign({}, light, darkRaw);

const lum = hex => {
  if (hex.length === 9 || hex.length === 5) return null; // альфа — считать нельзя
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const v = [0,2,4].map(i => {
    const c = parseInt(h.substr(i,2),16) / 255;
    return c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4);
  });
  return 0.2126*v[0] + 0.7152*v[1] + 0.0722*v[2];
};
const ratio = (a,b) => { const A=lum(a), B=lum(b); if(A===null||B===null) return null;
  return ((Math.max(A,B)+0.05)/(Math.min(A,B)+0.05)); };

const PAIRS = [
  ['--ink','--card','основной текст на карточке'],
  ['--ink','--bg','основной текст на фоне'],
  ['--ink2','--card','вторичный текст'],
  ['--ink2','--soft','вторичный на блаш-поверхности'],
  ['--ink3','--card','подписи'],
  ['--ink3','--mint','подписи на мятном'],
  ['--on-lime','--lime','текст на лаймовой кнопке'],
  ['--prot-on','--prot','текст на оранжевой плитке'],
  ['--kcal','--kcal-bg','плитка калорий'],
  ['--carb-ink','--carb-bg','плитка углеводов'],
  ['--fat-ink','--fat-bg','плитка жиров'],
  ['--prot-ink','--prot-bg','чип белка'],
  ['--br','--br-bg','тег «завтрак»'],
  ['--lu','--lu-bg','тег «обед»'],
  ['--di','--di-bg','тег «ужин»'],
  ['--sn','--sn-bg','тег «перекус»'],
  ['--sw','--sw-bg','тег «сладкое»']
];
for (const [name,T] of [['СВЕТЛАЯ',light],['ТЁМНАЯ',dark]]) {
  console.log('\n=== ' + name + ' ===');
  for (const [f,b,d] of PAIRS) {
    const r = ratio(T[f], T[b]);
    if (r === null) { console.log('  ?? ' + d + ' — не удалось (' + T[f] + ' / ' + T[b] + ')'); continue; }
    const ok = r >= 4.5 ? 'OK ' : r >= 3 ? 'сла' : 'ПЛО';
    if (r < 4.5) console.log('  ' + ok + ' ' + r.toFixed(2) + '  ' + d + '  (' + T[f] + ' на ' + T[b] + ')');
  }
  console.log('  проверено пар: ' + PAIRS.length);
}
