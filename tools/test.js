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

  // конструктор
  let cp = 0;
  if (bad(pageCons()).length) { cp++; console.log('  ПРОБЛЕМА пустой конструктор'); }
  for (const w of ['w','m']) {
    who = w;
    for (const meal of ['Завтрак','Обед','Ужин','Перекус']) {
      aimMeal = meal;
      const aim = aimFor(meal);
      let miss = 0;
      for (let t = 0; t < 60; t++) {              // сборка случайная — гоняем много раз
        const r = assemble(meal);
        if (!r) { cp++; console.log('  сборка вернула пусто', w, meal); break; }
        built = r;
        if (bad(pageCons()).length) { cp++; console.log('  ПРОБЛЕМА отрисовки', w, meal); break; }
        const s = sumOf(r);
        if (Math.abs(s.k - aim.k) > aim.k * 0.12) miss++;
      }
      if (miss > 2) { cp++; console.log("  мимо цели " + miss + "/60:", w, meal, "цель", aim.k); }
    }
  }
  built = [];
  // разбор готового приёма на продукты
  let parsed = 0, whole = 0;
  for (let di = 0; di < PLAN.days.length; di++)
    for (let mi = 0; mi < PLAN.days[di].meals.length; mi++) {
      const r = fromMeal(di, mi);
      if (r.parts.length) { parsed++; if (bad(JSON.stringify(r)).length) cp++; } else whole++;
    }
  console.log('разбор приёмов: ' + parsed + ' раскладываются на продукты, ' + whole + ' из готовых блюд');
  console.log('проблем в конструкторе:', cp);

  // свои продукты
  let fp = 0;
  const set = (id, v) => { document.getElementById(id).value = v; };
  const tryAdd = (n, cat, k, p, f, c, unit) => {
    showForm = true;
    set('fn', n); set('fc', cat); set('fk', k); set('fp', p); set('ff', f); set('fu', c); set('fs', unit === undefined ? '' : unit);
    const before = custom.length;
    saveFood();
    return { added: custom.length > before, msg: formMsg };
  };
  const cases = [
    ['',            'Белок', 240, 19, 18, 1,  '', false, 'пустое название'],
    ['ы',           'Белок', 240, 19, 18, 1,  '', false, 'слишком короткое имя'],
    ['творог 5%',   'Белок', 240, 19, 18, 1,  '', false, 'дубликат существующего'],
    ['тест нольккал','Белок',  0, 19, 18, 1,  '', false, 'нулевая калорийность'],
    ['тест минус',  'Белок', 240, -5, 18, 1,  '', false, 'отрицательный белок'],
    ['тест сумма',  'Белок', 240, 60, 40, 30, '', false, 'макросы тяжелее 100 г'],
    ['сыр адыгейский','Белок',240, 19, 18, 1.5,'', true,  'корректный'],
    ['лаваш штучный','Гарниры',275, 9, 1, 56, 80, true,  'штучный продукт']
  ];
  for (const [n, cat, k, p, f, c, unit, expect, what] of cases) {
    const r = tryAdd(n, cat, k, p, f, c, unit);
    if (r.added !== expect) { fp++; console.log('  ВАЛИДАЦИЯ «' + what + '»: ожидалось ' + (expect ? 'принять' : 'отклонить')); }
    if (!expect && !r.msg) { fp++; console.log('  «' + what + '» отклонён молча, без объяснения'); }
  }
  // предупреждение о расхождении калорийности с макросами
  tryAdd('тест расхождение', 'Белок', 100, 30, 30, 30, '');
  if (!formMsg || formMsg[0] !== '?') { fp++; console.log('  нет предупреждения о расхождении ккал и макросов'); }

  // свои продукты видны кладовке и участвуют в сборке
  if (!FOOD['сыр адыгейский']) { fp++; console.log('  свой продукт не попал в базу'); }
  if (!pantry['сыр адыгейский']) { fp++; console.log('  свой продукт не отмечен в кладовке'); }
  if (!allFoods().some(f => f.mine)) { fp++; console.log('  свои продукты не помечены признаком mine'); }
  if (bad(pageCons()).length) { fp++; console.log('  ПРОБЛЕМА отрисовки со своими продуктами'); }
  showForm = true;
  if (bad(pageCons()).length) { fp++; console.log('  ПРОБЛЕМА отрисовки формы'); }
  showForm = false;

  // пустая кладовка не должна ронять сборку
  const savedPantry = pantry;
  pantry = {};
  if (assemble('Обед') !== null) { fp++; console.log('  пустая кладовка должна давать null, а не мусор'); }
  pantry = savedPantry;

  // удаление своего продукта
  custom = custom.filter(f => f.n !== 'сыр адыгейский');
  rebuildFood();
  if (FOOD['сыр адыгейский']) { fp++; console.log('  удалённый продукт остался в базе'); }
  console.log('проблем со своими продуктами:', fp);
  console.log('сегодня по календарю: индекс ' + TODAY + ' -> ' + PLAN.days[TODAY].name);
})();
`;
eval(body + probe);
