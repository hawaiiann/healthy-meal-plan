require(require('path').join(__dirname,'shim.js'));
const fs = require('fs');
const body = fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8').match(/<script>([\s\S]*)<\/script>/)[1];
const probe = `
;(function(){
  const BAD = ['undefined', 'NaN', '[object Object]'];
  const bad = s => BAD.filter(b => s.includes(b));
  let problems = 0;
  console.log('дней:', PLAN.days.length, '| рецептов:', PLAN.recipes.length,
              '| перекусов:', PLAN.snacks.length, '| сладкого:', PLAN.sweets.length);
  for (const w of ['w','m']) {
    who = w;
    for (const k of Object.keys(RENDER)) {
      const reps = (k === 'week') ? PLAN.days.length : 1;
      for (let d = 0; d < reps; d++) {
        day = d;
        const b = bad(RENDER[k]());
        if (b.length) { problems++; console.log('  ПРОБЛЕМА', w, k, 'день', d, b.join(',')); }
      }
    }
    const b = bad(rail());
    if (b.length) { problems++; console.log('  ПРОБЛЕМА rail', w, b.join(',')); }
  }
  console.log('проблемных отрисовок:', problems);

  let errs = 0;
  for (const d of PLAN.days) for (const p of ['w','m']) {
    const s = d.meals.reduce((a,m) => a + m[p].k, 0);
    if (Math.abs(s - d[p].k) > 3) { errs++; console.log('  РАСХОЖДЕНИЕ', d.name, p, s, 'vs', d[p].k); }
  }
  console.log('расхождений «сумма приёмов = итог дня»:', errs);

  let tg = 0;
  for (const d of PLAN.days) for (const p of ['w','m']) {
    const t = PLAN.targets[p][d.id];
    if (typeof t !== 'number') { tg++; console.log('  НЕТ ЦЕЛИ', d.id, p); }
    else if (Math.abs(t - d[p].k) > t * 0.03) { tg++; console.log('  МИМО ЦЕЛИ', d.name, p, d[p].k, 'цель', t); }
  }
  console.log('дней мимо цели больше 3%:', tg);
  console.log('донат: сегментов', (donut(30,10,40,44,7).match(/stroke-dasharray/g) || []).length);

  // поиск
  let sp = 0;
  for (const c of ['гриб','лазан','минтай','творог','протеин','зефир','xyzzy','г']) {
    query = c;
    const out = pageSearch();
    const b = bad(out);
    if (b.length) { sp++; console.log('  ПРОБЛЕМА поиск', c, b.join(',')); }
    const R = searchAll(c);
    if (c === 'xyzzy' && R && R.total !== 0) { sp++; console.log('  поиск: мусорный запрос дал результаты'); }
    if (c === 'г' && R !== null) { sp++; console.log('  поиск: одна буква не должна искать'); }
    if (c === 'гриб' && (!R || R.total === 0)) { sp++; console.log('  поиск: «гриб» ничего не нашёл'); }
  }
  query = 'гриб';
  if (!pageSearch().includes('class="mark"')) { sp++; console.log('  поиск: нет подсветки совпадения'); }
  query = '';
  console.log('проблем в поиске:', sp);

  // тема
  let tp = 0;
  for (const t of ['light','dark','auto']) {
    theme = t; applyTheme();
    const stamp = document.documentElement.getAttribute('data-theme');
    const okay = t === 'auto' ? stamp === null : stamp === t;
    if (!okay) { tp++; console.log('  ТЕМА', t, '-> data-theme =', JSON.stringify(stamp)); }
  }
  console.log('проблем с темой:', tp, '(auto должен снимать штамп)');
})();
`;
eval(body + probe);
