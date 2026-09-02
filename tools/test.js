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
      let miss = 0, noSteps = 0, overP = 0;
      const seen = new Set();
      for (let t = 0; t < 80; t++) {              // сборка случайная — гоняем много раз
        const r = assembleDish(meal);
        if (!r) { cp++; console.log('  сборка вернула пусто', w, meal); break; }
        built = r.items; builtTpl = r.tpl;
        seen.add(r.tpl.id);
        if (bad(pageCons()).length) { cp++; console.log('  ПРОБЛЕМА отрисовки', w, meal, r.tpl.id); break; }
        const rec = dishSteps();
        if (!rec || rec.broken || !rec.steps.length) { noSteps++; }
        else if (rec.steps.some(x => bad(x).length || x.indexOf("{") >= 0 || x.indexOf("}") >= 0)) { noSteps++; }
        const s = sumOf(r.items);
        if (Math.abs(s.k - aim.k) > aim.k * 0.12) miss++;
        if (s.p > aim.p * 1.6) overP++;
      }
      if (miss > 3) { cp++; console.log('  мимо цели ' + miss + '/80:', w, meal, 'цель', aim.k); }
      if (noSteps) { cp++; console.log('  рецепт не собрался ' + noSteps + '/80:', w, meal); }
      if (overP) { cp++; console.log('  перебор белка в ' + overP + '/80:', w, meal, 'цель', aim.p); }
      if (seen.size < 2 && meal !== 'Перекус') { cp++; console.log('  мало разнообразия блюд:', w, meal, [...seen].join(',')); }
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

  // Отдельный прогон только по цифрам, без отрисовки: 400 сборок на каждый
  // приём. Проверка в цикле выше вероятностная — редкий шаблон может в 80
  // попыток и не выпасть, а здесь регрессия видна наверняка.
  let op = 0, opK = 0;
  const worst = {};
  for (const w of ['w','m']) {
    who = w;
    for (const meal of ['Завтрак','Обед','Ужин','Перекус']) {
      const aim = aimFor(meal);
      for (let i = 0; i < 400; i++) {
        const r = assembleDish(meal);
        if (!r) continue;
        const s = sumOf(r.items);
        if (s.p > aim.p * 1.6) { op++; worst[r.tpl.id] = Math.max(worst[r.tpl.id] || 0, Math.round(s.p)); }
        if (Math.abs(s.k - aim.k) > aim.k * 0.15) opK++;
      }
    }
  }
  if (op) console.log('  перебор белка:', JSON.stringify(worst));
  console.log('на 3200 сборок — переборов белка:', op, ', мимо калорий:', opK);

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
  if (assembleDish('Обед') !== null) { fp++; console.log('  пустая кладовка должна давать null, а не мусор'); }
  pantry = savedPantry;

  // удаление своего продукта
  custom = custom.filter(f => f.n !== 'сыр адыгейский');
  rebuildFood();
  if (FOOD['сыр адыгейский']) { fp++; console.log('  удалённый продукт остался в базе'); }
  console.log('проблем со своими продуктами:', fp);
  // замены в дне
  let sw = 0;
  for (const w of ['w','m']) {
    who = w;
    for (let di = 0; di < PLAN.days.length; di++) {
      for (let mi = 0; mi < PLAN.days[di].meals.length; mi++) {
        const m = PLAN.days[di].meals[mi];
        const aim = m[w];
        const O = swapOptions(di, mi);
        if (!O.dishes.length && !O.light.length) { sw++; console.log('  нет вариантов замены:', w, PLAN.days[di].name, m.label); }
        for (const d of O.dishes) {
          const s = sumOf(d.items);
          if (Math.abs(s.k - aim.k) > aim.k * 0.15) { sw++; console.log('  вариант блюда мимо цели:', w, m.label, Math.round(s.k), 'vs', aim.k, d.tpl.id); }
          const st = stepsFor(d.tpl, d.items);
          if (!st || st.broken) { sw++; console.log('  у варианта нет рецепта:', d.tpl.id); }
        }
        for (const x of O.light) {
          const s = sumOf(x.items);
          if (Math.abs(s.k - aim.k) > aim.k * 0.2) { sw++; console.log('  готовый вариант мимо цели:', w, m.label, Math.round(s.k), 'vs', aim.k, x.title); }
        }
        if (O.split) {
          const s = sumOf(O.split[0].items.concat(O.split[1].items));
          if (Math.abs(s.k - aim.k) > aim.k * 0.25) { sw++; console.log('  разбивка на два мимо цели:', w, m.label, Math.round(s.k), 'vs', aim.k); }
        }
      }
    }
  }
  // применение и откат
  who = 'w';
  const before = mealView(0, 2).v.k, dayBefore = dayTotals(0).k;
  const opt = swapOptions(0, 2).dishes[0];
  if (!opt) { sw++; console.log('  нечем заменить обед понедельника'); }
  else {
    applySwap(0, 2, { title: 'тест', tplId: opt.tpl.id, items: opt.items });
    const after = mealView(0, 2);
    if (!after.swapped) { sw++; console.log('  замена не применилась'); }
    if (after.v.k === before && Math.round(sumOf(opt.items).k) !== before) { sw++; console.log('  калории приёма не пересчитались'); }
    if (dayTotals(0).k === dayBefore && after.v.k !== before) { sw++; console.log('  итог дня не пересчитался после замены'); }
    if (bad(pageWeek()).length) { sw++; console.log('  ПРОБЛЕМА отрисовки дня с заменой'); }
    openSwap = '0.2';
    if (bad(pageWeek()).length) { sw++; console.log('  ПРОБЛЕМА отрисовки панели замены'); }
    openSwap = null;
    dropSwap(0, 2);
    if (mealView(0, 2).swapped) { sw++; console.log('  откат замены не сработал'); }
    if (dayTotals(0).k !== dayBefore) { sw++; console.log('  итог дня не вернулся после отката'); }
  }
  // замена продукта сохраняет калорийность приёма
  const parts = parseQty(PLAN.days[0].meals[2].w.qty);
  if (!parts.length) { sw++; console.log('  обед понедельника не разобрался на продукты'); }
  for (const x of parts) {
    for (const al of subsFor(x.n, x.g)) {
      const f = FOOD[x.n], byP = f.cat === 'Белок' && f.p >= 8;
      const src = byP ? f.p * x.g / 100 : f.k * x.g / 100;
      const got = byP ? al.p : al.k;
      if (src > 8 && Math.abs(got - src) > Math.max(src * 0.25, 12)) {
        sw++; console.log('  замена продукта сильно мимо:', x.n, '->', al.n, Math.round(got), 'vs', Math.round(src));
      }
    }
  }
  console.log('проблем в заменах:', sw);
  console.log('блюд в библиотеке:', DISHES.length);
  // каталог рецептов: каждое блюдо должно показываться, а не только собираться
  let rc = 0;
  const savedPantry2 = pantry;
  pantry = {};                                   // каталог не должен зависеть от кладовки
  for (const t2 of DISHES) {
    const pv = previewDish(t2);
    if (!pv) { rc++; console.log('  нет образца навески:', t2.id); continue; }
    if (!pv.parts.length) { rc++; console.log('  пустая навеска:', t2.id); }
    const st = stepsFor(t2, pv.parts);
    if (!st || st.broken || !st.steps.length) { rc++; console.log('  нет шагов:', t2.id); }
    else if (st.steps.some(x => bad(x).length)) { rc++; console.log('  мусор в шагах:', t2.id); }
    if (!t2.short) { rc++; console.log('  нет короткого имени:', t2.id); }
  }
  pantry = savedPantry2;
  for (const m of ['Все','Завтрак','Обед','Ужин','Перекус']) {
    recMeal = m;
    const html = pageRecipes();
    if (bad(html).length) { rc++; console.log('  ПРОБЛЕМА отрисовки каталога:', m); }
    const shown = (html.match(/data-recid=/g) || []).length;
    const want = m === 'Все' ? DISHES.length : DISHES.filter(x => x.meals.indexOf(m) >= 0).length;
    if (shown !== want) { rc++; console.log('  фильтр «' + m + '»: показано ' + shown + ' из ' + want); }
  }
  recMeal = 'Все';
  const cat = pageRecipes();
  if ((cat.match(/data-cook=/g) || []).length !== DISHES.length) { rc++; console.log('  не у всех блюд кнопка «Собрать»'); }
  if (cat.indexOf('Заготовки на неделю') < 0) { rc++; console.log('  заготовки пропали из раздела'); }
  console.log('проблем в каталоге рецептов:', rc);

  // личные нормы и пересчёт от веса
  let pp = 0;
  // формула Миффлина вручную: мужчина 31 год, 175 см, 90 кг
  const ref = calcNorm({ sex:'m', age:31, h:175, wt:90, act:1.375, def:23, gk:1.8 });
  const bmrExp = 10*90 + 6.25*175 - 5*31 + 5;
  if (Math.abs(ref.bmr - bmrExp) > 1) { pp++; console.log('  BMR посчитан неверно:', ref.bmr, 'ожидалось', bmrExp); }
  if (Math.abs(ref.tdee - bmrExp*1.375) > 2) { pp++; console.log('  поддержка неверна:', ref.tdee); }
  if (Math.abs(ref.kcal - bmrExp*1.375*0.77) > 5) { pp++; console.log('  норма с дефицитом неверна:', ref.kcal); }
  if (ref.prot !== 162) { pp++; console.log('  белок при 1,8 г/кг неверен:', ref.prot); }
  // неполные данные не должны давать норму
  for (const bad2 of [null, {}, {wt:80}, {wt:80,h:175}, {wt:0,h:175,age:31}]) {
    if (calcNorm(bad2)) { pp++; console.log('  неполные параметры дали норму:', JSON.stringify(bad2)); }
  }
  // без профиля работает базовая норма
  profiles = {};
  who = 'm';
  if (person('m').kcal !== PLAN.people.m.kcal) { pp++; console.log('  без профиля норма должна быть базовой'); }
  if (Math.abs(scaleOf('m') - 1) > 0.001) { pp++; console.log('  масштаб без профиля должен быть 1'); }

  // профиль меняет норму и тянет за собой меню
  const dayBase = dayTotals(0).k, tgtBase = targetFor('m', PLAN.days[0].id);
  profiles.m = { sex:'m', age:31, h:175, wt:80, act:1.375, def:23, gk:1.8, fk:0.9 };
  const P2 = person('m');
  if (!P2.custom) { pp++; console.log('  профиль не подхватился'); }
  if (P2.kcal >= PLAN.people.m.kcal) { pp++; console.log('  вес меньше — норма должна упасть:', P2.kcal); }
  if (P2.prot !== 144) { pp++; console.log('  белок должен пересчитаться на новый вес:', P2.prot); }
  const f = scaleOf('m');
  const dayNew = dayTotals(0).k, tgtNew = targetFor('m', PLAN.days[0].id);
  if (Math.abs(dayNew / dayBase - f) > 0.03) { pp++; console.log('  день не отмасштабировался:', Math.round(dayNew), 'vs', Math.round(dayBase*f)); }
  if (Math.abs(tgtNew / tgtBase - f) > 0.03) { pp++; console.log('  цель дня не отмасштабировалась'); }
  // навески в тексте тоже пересчитаны
  const v0 = PLAN.days[0].meals[0].m.qty, v1 = mealView(0, 0).qty;
  if (v0 === v1) { pp++; console.log('  граммовка приёма не изменилась'); }
  if (v1.indexOf(' г') < 0 && v1.indexOf(' шт') < 0) { pp++; console.log('  граммовка после пересчёта потеряла единицы:', v1); }
  if (bad(pageProfile()).length) { pp++; console.log('  ПРОБЛЕМА отрисовки страницы параметров'); }
  if (bad(pageWeek()).length) { pp++; console.log('  ПРОБЛЕМА отрисовки недели с личной нормой'); }
  // подстановки в тексте тренда не должны утекать в вёрстку
  profiles.m.hist = [{ d:'2026-08-01', wt:84 }, { d:'2026-08-15', wt:82 }, { d:'2026-08-29', wt:80 }];
  const ph = pageProfile();
  if (ph.indexOf(String.fromCharCode(36) + '{') >= 0) { pp++; console.log('  в странице параметров осталась неподставленная вставка'); }
  if (ph.indexOf('кг в неделю') < 0) { pp++; console.log('  журнал веса не показал темп'); }
  // сброс возвращает базовую норму
  delete profiles.m;
  if (person('m').kcal !== PLAN.people.m.kcal) { pp++; console.log('  сброс профиля не вернул базовую норму'); }
  if (Math.abs(dayTotals(0).k - dayBase) > 1) { pp++; console.log('  день не вернулся к базовым цифрам'); }
  profiles = {};
  console.log('проблем в личных нормах:', pp);
  console.log('сегодня по календарю: индекс ' + TODAY + ' -> ' + PLAN.days[TODAY].name);
})();
`;
eval(body + probe);
