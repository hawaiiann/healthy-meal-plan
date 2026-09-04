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
      const reps = (k === 'week' || k === 'pair') ? PLAN.days.length : 1;
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
  // напитки
  let dk = 0;
  profiles = {};
  who = 'm';
  if (drinkTotals('m').k !== 0) { dk++; console.log('  без настройки напитки не должны считаться'); }
  const beforeDay = dayTotals(0).k, beforeTarget = targetFor('m', PLAN.days[0].id);
  const beforeAim = aimFor('Обед').k;

  profiles.m = { drinks: { cups: 2, ml: 50, sugar: 0, milk: 'молоко 2,5%' } };
  const dr = drinkTotals('m');
  const milk = FOOD['молоко 2,5%'];
  const expect = ((milk.k * 50 / 100) + 2) * 2;
  if (Math.abs(dr.k - expect) > 1) { dk++; console.log('  калорийность чашек посчитана неверно:', Math.round(dr.k), 'ожидалось', Math.round(expect)); }
  if (dr.p <= 0) { dk++; console.log('  белок молока потерялся'); }
  if (aimFor('Обед').k >= beforeAim) { dk++; console.log('  цель обеда должна уменьшиться на выпитое'); }

  // день по-прежнему сходится в норму: еда ужалась ровно на напитки
  const after = dayTotals(0);
  if (Math.abs(after.k - beforeDay) > beforeTarget * 0.04) {
    dk++; console.log('  день перестал сходиться:', Math.round(after.k), 'было', Math.round(beforeDay));
  }
  // навески действительно уменьшились
  const q0 = PLAN.days[0].meals[2].m.qty, q1 = mealView(0, 2).qty;
  if (q0 === q1) { dk++; console.log('  навеска приёма не уменьшилась под напитки'); }

  // сахар считается
  profiles.m = { drinks: { cups: 2, ml: 50, sugar: 10, milk: 'молоко 2,5%' } };
  if (drinkTotals('m').k - dr.k < 70) { dk++; console.log('  сахар в чашке не учтён'); }

  // строка напитков есть в дне, отрисовка цела
  if (pageWeek().indexOf('Напитки') < 0) { dk++; console.log('  в дне нет строки напитков'); }
  if (bad(pageWeek()).length) { dk++; console.log('  ПРОБЛЕМА отрисовки дня с напитками'); }
  if (bad(pageDrinks()).length) { dk++; console.log('  ПРОБЛЕМА отрисовки раздела напитков'); }
  if (!PLAN.drinks || PLAN.drinks.length < 10) { dk++; console.log('  каталог напитков пуст'); }
  for (const x of (PLAN.drinks || [])) {
    if (typeof x.k !== 'number' || x.k < 0 || x.k > 400) { dk++; console.log('  странная калорийность напитка:', x.title, x.k); }
  }
  // абсурдная настройка не должна съедать больше половины нормы
  profiles.m = { drinks: { cups: 12, ml: 400, sugar: 30, milk: 'сливки 10%' } };
  if (foodKcal('m') < person('m').kcal * 0.5 - 1) { dk++; console.log('  бюджет еды провалился ниже половины нормы'); }
  if (mealFactor('m', PLAN.days[0].id) < 0.5) { dk++; console.log('  навески ужались сильнее чем вдвое'); }

  profiles = {};
  if (drinkTotals('m').k !== 0) { dk++; console.log('  сброс не убрал напитки'); }
  if (Math.abs(dayTotals(0).k - beforeDay) > 1) { dk++; console.log('  день не вернулся после сброса напитков'); }
  console.log('проблем в напитках:', dk);

  // на двоих: сумма, деление, ничего не потеряно
  let pr = 0;
  profiles = {}; swaps = {}; who = 'w';
  for (let d = 0; d < PLAN.days.length; d++) {
    for (let mi = 0; mi < PLAN.days[d].meals.length; mi++) {
      const P = pairMeal(d, mi);
      if (!P.together) { pr++; console.log('  приём должен складываться:', PLAN.days[d].name, mi); continue; }

      // столбец «Всего» — это ровно сумма двух тарелок
      for (const r of P.rows) {
        if (Math.abs(r.g - (r.m + r.w)) > 0.01) { pr++; console.log('  всего не равно сумме:', r.n); }
        if (r.g <= 0) { pr++; console.log('  нулевая строка:', r.n, PLAN.days[d].name); }
      }
      // ни один продукт из навесок не потерялся при разборе
      const names = new Set(P.rows.map(r => r.n));
      for (const k of ['m', 'w']) {
        for (const piece of mealView(d, mi, k).qty.split(', ')) {
          const w = piece.split(' '), nm = w.slice(0, w.length - 2).join(' ');
          if (!names.has(nm)) { pr++; console.log('  продукт потерялся:', nm, PLAN.days[d].name); }
        }
      }
      // калории, пересобранные из общего веса, сходятся с суммой двух приёмов
      let kk = 0;
      for (const r of P.rows) { const f = anyFood(r.n); if (f) kk += f.k * r.g / 100; }
      if (Math.abs(kk - P.k) > Math.max(25, P.k * 0.04)) {
        pr++; console.log('  общий вес не бьётся по калориям:', PLAN.days[d].name, mi, Math.round(kk), 'vs', P.k);
      }
      // его порция нигде не меньше её: у плиты обратное читается как ошибка
      if (PLAN.days[d].meals[mi].label !== 'Вечер' && P.A.V.v.k < P.B.V.v.k) {
        pr++; console.log('  её порция больше его:', PLAN.days[d].name, PLAN.days[d].meals[mi].label, P.B.V.v.k, 'vs', P.A.V.v.k);
      }
      // деление в процентах осмысленное
      if (!(P.share > 35 && P.share < 65)) { pr++; console.log('  странная пропорция деления:', P.share); }
    }
  }

  // дневной свод — это сумма приёмов, ничего не задвоено и не потеряно
  for (let d = 0; d < PLAN.days.length; d++) {
    const D = pairDay(d), all = D.batch.concat(D.fresh);
    const mm = new Map();
    for (let mi = 0; mi < PLAN.days[d].meals.length; mi++)
      for (const r of pairMeal(d, mi).rows) mm.set(r.n, (mm.get(r.n) || 0) + r.g);
    if (all.length !== mm.size) { pr++; console.log('  в своде дня не тот набор продуктов:', PLAN.days[d].name, all.length, mm.size); }
    for (const r of all) if (Math.abs(r.g - (mm.get(r.n) || 0)) > 0.01) { pr++; console.log('  свод дня разошёлся:', r.n); }
    for (const r of D.batch) if (!RECIPE[r.n]) { pr++; console.log('  не заготовка в заготовках:', r.n); }
    for (const r of D.fresh) if (RECIPE[r.n]) { pr++; console.log('  заготовка попала в свежее:', r.n); }
  }

  // разложение заготовки на сырые продукты сохраняет калорийность доли
  for (const rc of PLAN.recipes) {
    if (!rc.outG) { pr++; console.log('  у заготовки нет выхода:', rc.key); continue; }
    const part = 500, f = part / rc.outG;
    let kk = 0;
    for (const x of rc.ing) { const fo = anyFood(x.n); if (fo) kk += fo.k * x.g * f / 100; else { pr++; console.log('  ингредиент не найден:', x.n); } }
    const want = rc.per100.k * part / 100;
    if (Math.abs(kk - want) > want * 0.03) { pr++; console.log('  разложение заготовки не сходится:', rc.key, Math.round(kk), 'vs', Math.round(want)); }
  }

  // расчёт не зависит от того, кто сейчас выбран в шапке
  who = 'w'; const snapW = JSON.stringify(pairMeal(0, 1).rows);
  who = 'm'; const snapM = JSON.stringify(pairMeal(0, 1).rows);
  if (snapW !== snapM) { pr++; console.log('  расчёт на двоих зависит от выбранного человека'); }

  // замена у одного превращает приём в «готовится отдельно»
  const O = swapOptions(0, 1);
  if (O.dishes.length) {
    who = 'm'; applySwap(0, 1, { title: 'тест на двоих', tplId: O.dishes[0].tpl.id, items: O.dishes[0].items });
    if (pairMeal(0, 1).together) { pr++; console.log('  замена не разделила приём'); }
    if (pagePair().indexOf('Разные блюда') < 0) { pr++; console.log('  в разделе не видно, что блюда разошлись'); }
    dropSwap(0, 1);
    if (!pairMeal(0, 1).together) { pr++; console.log('  после отмены замены приём не сложился обратно'); }
  }

  // напитки в своде: общий объём молока
  profiles.m = { drinks: { cups: 2, ml: 50, sugar: 0, milk: 'молоко 2,5%' } };
  profiles.w = { drinks: { cups: 3, ml: 40, sugar: 5, milk: 'молоко 2,5%' } };
  const PD = pairDrinks();
  if (!PD || PD.cups !== 5) { pr++; console.log('  чашки на двоих не сложились'); }
  if (!PD || PD.ml !== 2 * 50 + 3 * 40) { pr++; console.log('  молоко на двоих не сложилось:', PD && PD.ml); }
  if (!PD || PD.sug !== 15) { pr++; console.log('  сахар на двоих не сложился'); }
  if (pagePair().indexOf('в чашки') < 0) { pr++; console.log('  в своде дня нет строки напитков'); }
  for (let d = 0; d < PLAN.days.length; d++) if (bad(pagePair()).length) { pr++; console.log('  ПРОБЛЕМА отрисовки с напитками', d); }
  profiles = {};
  if (pairDrinks()) { pr++; console.log('  сброс не убрал напитки из свода'); }

  console.log('проблем в разделе «на двоих»:', pr);

  // конструктор: собранное блюдо складывается на двоих
  let cn = 0;
  profiles = {}; swaps = {}; consPair = true;
  for (const f of allFoods()) pantry[f.n] = true;
  for (const meal of ['Завтрак', 'Обед', 'Ужин', 'Перекус']) {
    aimMeal = meal;
    for (const tpl of dishesFor(meal)) {
      for (const w of ['m', 'w']) {
        who = w;
        const r = assembleDish(meal, tpl.id);
        if (!r) continue;
        built = r.items; builtTpl = r.tpl;
        const was = JSON.stringify(built.map(x => [x.n, x.g]));
        const PV = consPairView();
        if (!PV) { cn++; console.log('  сборка не сложилась:', tpl.id, meal); continue; }

        // расчёт второй порции не трогает то, что собрано
        if (JSON.stringify(built.map(x => [x.n, x.g])) !== was) { cn++; console.log('  вторая порция изменила первую:', tpl.id); }
        // состав одинаковый, отличается только навеска
        for (const x of PV.rows) {
          if (Math.abs(x.g - (x.m + x.w)) > 0.01) { cn++; console.log('  всего не равно сумме:', tpl.id, x.n); }
          if (!(x.m > 0) || !(x.w > 0)) { cn++; console.log('  продукт есть только в одной тарелке:', tpl.id, x.n); }
        }
        if (PV.rows.length !== new Set(built.map(x => x.n)).size) { cn++; console.log('  состав разошёлся:', tpl.id); }
        // тарелки различаются пропорционально, а не за счёт одного продукта
        const rt = PV.aimW.k / PV.aimM.k;
        for (const x of PV.rows) {
          const r2 = x.w / x.m;
          if (r2 < rt * 0.55 || r2 > rt * 1.7) { cn++; console.log('  навеска гуляет:', tpl.id, x.n, Math.round(x.m), '/', Math.round(x.w)); }
        }
        // каждая порция попадает в свою норму
        if (Math.abs(PV.vm.k - PV.aimM.k) > PV.aimM.k * 0.15) { cn++; console.log('  его порция мимо нормы:', tpl.id, meal, Math.round(PV.vm.k), 'цель', PV.aimM.k); }
        if (Math.abs(PV.vw.k - PV.aimW.k) > PV.aimW.k * 0.15) { cn++; console.log('  её порция мимо нормы:', tpl.id, meal, Math.round(PV.vw.k), 'цель', PV.aimW.k); }
        // общий вес по калориям — это ровно две порции
        if (Math.abs(sumOf(PV.total).k - (PV.vm.k + PV.vw.k)) > 2) { cn++; console.log('  общий вес не равен двум порциям:', tpl.id); }
        // порядок готовки собирается на общий вес
        if (!PV.steps) { cn++; console.log('  нет порядка готовки на двоих:', tpl.id); }
        if (bad(pageCons()).length) { cn++; console.log('  ПРОБЛЕМА отрисовки конструктора на двоих:', tpl.id, bad(pageCons()).join(',')); }
      }
    }
  }

  // расчёт не зависит от того, кто выбран в шапке
  aimMeal = 'Ужин';
  who = 'm';
  const rr = assembleDish('Ужин', 'shakshuka');
  if (!rr) { cn++; console.log('  шакшука не собралась'); }
  else {
    built = rr.items; builtTpl = rr.tpl;
    // вторая порция держится пропорции: одна морковка не отдувается за всех
    const twin = twinOf(rr.items, aimFor('Ужин', 'w').k);
    const ratio = aimFor('Ужин', 'w').k / aimFor('Ужин', 'm').k;
    twin.forEach((x, ix) => {
      const own = rr.items[ix].g, r2 = x.g / own;
      if (x.n !== rr.items[ix].n) { cn++; console.log('  состав второй порции съехал:', x.n); }
      if (r2 < ratio * 0.6 || r2 > ratio * 1.6) {
        cn++; console.log('  навеска гуляет:', x.n, own, '->', x.g, 'при пропорции', ratio.toFixed(2));
      }
    });

    // блок виден в разметке и убирается тумблером
    who = 'm'; built = rr.items;
    if (pageCons().indexOf('Сложить на двоих') < 0) { cn++; console.log('  блока «сложить на двоих» нет в конструкторе'); }
    consPair = false;
    if (pageCons().indexOf('Сложить на двоих') >= 0) { cn++; console.log('  тумблер не убирает блок'); }
    consPair = true;
  }
  built = []; builtTpl = null;
  if (consPairView()) { cn++; console.log('  пустая сборка не должна складываться'); }
  console.log('проблем со сложением в конструкторе:', cn);

  // вес на тарелку: столбцы «он/она» складываются в то, что реально наливаешь
  let pl = 0;
  profiles = {}; swaps = {}; who = 'w';
  for (let d = 0; d < PLAN.days.length; d++) {
    for (let mi = 0; mi < PLAN.days[d].meals.length; mi++) {
      const P = pairMeal(d, mi);
      const gm = P.rows.reduce((a, r) => a + r.m, 0), gw = P.rows.reduce((a, r) => a + r.w, 0);
      if (Math.abs((P.pm.dish + P.pm.side) - gm) > 0.01) { pl++; console.log('  его тарелка не сходится:', PLAN.days[d].name, mi); }
      if (Math.abs((P.pw.dish + P.pw.side) - gw) > 0.01) { pl++; console.log('  её тарелка не сходится:', PLAN.days[d].name, mi); }
      if (!(P.pm.dish > 0) || !(P.pw.dish > 0)) { pl++; console.log('  пустая тарелка:', PLAN.days[d].name, mi); }
    }
  }
  if (pagePair().indexOf('На тарелку') < 0) { pl++; console.log('  в приёме нет строки «на тарелку»'); }
  console.log('проблем с весом на тарелку:', pl);

  // перенос набора дня на второго
  let sy = 0;
  profiles = {}; swaps = {};
  const dd = 0, dayId = PLAN.days[dd].id;
  if (dayApart(dd) !== 0) { sy++; console.log('  чистый день не должен расходиться'); }

  // ставим замены себе и лишнюю замену ей — синхронизация должна убрать её
  who = 'm';
  let put = 0;
  for (let mi = 0; mi < PLAN.days[dd].meals.length && put < 2; mi++) {
    const O = swapOptions(dd, mi);
    if (!O.dishes.length) continue;
    applySwap(dd, mi, { title: O.dishes[0].tpl.short, tplId: O.dishes[0].tpl.id, items: O.dishes[0].items });
    put++;
  }
  if (put < 2) { sy++; console.log('  не удалось поставить две замены для теста'); }
  who = 'w';
  const extra = PLAN.days[dd].meals.length - 1;
  const OE = swapOptions(dd, extra);
  if (OE.dishes.length) applySwap(dd, extra, { title: OE.dishes[0].tpl.short, tplId: OE.dishes[0].tpl.id, items: OE.dishes[0].items });

  who = 'm';
  if (dayApart(dd) === 0) { sy++; console.log('  расхождение не увиделось'); }
  const rs = syncDay(dd);
  if (rs.moved !== put) { sy++; console.log('  перенесено не столько замен:', rs.moved, 'вместо', put); }
  if (OE.dishes.length && rs.cleared !== 1) { sy++; console.log('  лишняя замена второго не снялась:', rs.cleared); }
  if (dayApart(dd) !== 0) { sy++; console.log('  после переноса день всё ещё расходится:', dayApart(dd)); }

  // состав одинаковый, навеска — под её норму, день по-прежнему в цель
  for (let mi = 0; mi < PLAN.days[dd].meals.length; mi++) {
    const P = pairMeal(dd, mi);
    // одинаковый состав гарантируется там, где стоит перенесённая замена:
    // в плановых приёмах у него законно бывает лишний компонент
    if (swaps[swapKey(dd, mi, 'm')]) {
      const nm = P.A.parts.map(x => x.n).sort().join('|'), nw = P.B.parts.map(x => x.n).sort().join('|');
      if (nm !== nw) { sy++; console.log('  состав разошёлся после переноса:', mi); }
    }
    const want = PLAN.days[dd].meals[mi].w.k * mealFactor('w', dayId);
    if (Math.abs(P.B.V.v.k - want) > Math.max(35, want * 0.15)) {
      sy++; console.log('  её приём мимо своей нормы:', mi, Math.round(P.B.V.v.k), 'цель', Math.round(want));
    }
    if (P.A.V.v.k < P.B.V.v.k - 1 && PLAN.days[dd].meals[mi].label !== 'Вечер') {
      sy++; console.log('  после переноса её порция больше его:', mi, P.B.V.v.k, 'vs', P.A.V.v.k);
    }
  }
  const tw2 = dayTotals(dd, 'w').k, tgt2 = targetFor('w', dayId);
  if (Math.abs(tw2 - tgt2) > tgt2 * 0.05) { sy++; console.log('  её день ушёл от цели:', Math.round(tw2), 'цель', tgt2); }

  // кнопка появляется только когда есть что переносить
  who = 'm'; day = dd;
  if (pageWeek().indexOf('data-sync') >= 0) { sy++; console.log('  кнопка переноса висит на сведённом дне'); }
  swaps = {}; who = 'm';
  const O2 = swapOptions(dd, 2);
  if (O2.dishes.length) {
    applySwap(dd, 2, { title: O2.dishes[0].tpl.short, tplId: O2.dishes[0].tpl.id, items: O2.dishes[0].items });
    if (pageWeek().indexOf('data-sync') < 0) { sy++; console.log('  кнопки переноса нет при расхождении'); }
    if (pagePair().indexOf('data-sync') < 0) { sy++; console.log('  кнопки переноса нет в разделе «на двоих»'); }
    if (bad(pageWeek()).length || bad(pagePair()).length) { sy++; console.log('  ПРОБЛЕМА отрисовки с кнопкой переноса'); }
  }
  // перенос в обратную сторону тоже работает
  syncDay(dd, 'w');
  if (dayApart(dd) !== 0) { sy++; console.log('  обратный перенос не свёл день'); }
  swaps = {};
  if (dayApart(dd) !== 0) { sy++; console.log('  сброс замен не вернул общий день'); }
  console.log('проблем с переносом набора дня:', sy);

  { // блок готовки ×2 держим в своей области видимости
  // готовка с запасом: удваивается кастрюля, а не тарелки
  let x2 = 0;
  profiles = {}; swaps = {}; who = 'm'; day = 0; cookX2 = false;

  if (pairHead().indexOf('Всего') < 0) { x2++; console.log('  без запаса шапка должна быть «Всего»'); }
  const x2Before = PLAN.days.map((_, d) => PLAN.days[d].meals.map((_, mi) => {
    const P = pairMeal(d, mi);
    return { rows: P.rows.map(r => [r.n, r.g, r.m, r.w]), k: [P.A.V.v.k, P.B.V.v.k], plate: [P.pm.dish, P.pw.dish] };
  }));
  const dayBefore = [dayTotals(0, 'm').k, dayTotals(0, 'w').k];
  const stepBefore = (() => { const P = pairMeal(0, 2); const s = pairSteps(P); return s ? s.steps.join(' ') : ''; })();

  cookX2 = true;
  if (pairHead().indexOf('На два дня') < 0) { x2++; console.log('  с запасом шапка должна меняться'); }
  if (pairHead(1).indexOf('Всего') < 0) { x2++; console.log('  явная единица должна отменять множитель'); }

  for (let d = 0; d < PLAN.days.length; d++) {
    for (let mi = 0; mi < PLAN.days[d].meals.length; mi++) {
      const P = pairMeal(d, mi), was = x2Before[d][mi];
      // тарелки не трогаем — это норма человека, а не объём кастрюли
      if (JSON.stringify([P.pm.dish, P.pw.dish]) !== JSON.stringify(was.plate)) {
        x2++; console.log('  запас изменил тарелку:', PLAN.days[d].name, mi);
      }
      if (JSON.stringify([P.A.V.v.k, P.B.V.v.k]) !== JSON.stringify(was.k)) {
        x2++; console.log('  запас изменил калории приёма:', PLAN.days[d].name, mi);
      }
      // а вот столбец «сколько готовить» ровно удвоился
      P.rows.forEach((r, ri) => {
        const html = pairRow(r);
        const want = gTxt(r.n, r.g * 2);
        if (html.indexOf('<b>' + want + '</b>') < 0) { x2++; console.log('  столбец готовки не удвоился:', r.n, want); }
        if (r.g !== was.rows[ri][1] || r.m !== was.rows[ri][2] || r.w !== was.rows[ri][3]) {
          x2++; console.log('  сам расчёт приёма поехал от множителя:', r.n);
        }
      });
    }
  }
  if (JSON.stringify([dayTotals(0, 'm').k, dayTotals(0, 'w').k]) !== JSON.stringify(dayBefore)) {
    x2++; console.log('  запас изменил итог дня');
  }

  // порядок готовки пересчитан на двойной объём
  const stepAfter = (() => { const P = pairMeal(0, 2); const s = pairSteps(P); return s ? s.steps.join(' ') : ''; })();
  if (stepBefore && stepAfter === stepBefore) { x2++; console.log('  шаги не пересчитались на двойной объём'); }
  if (stepBefore && pairSteps(pairMeal(0, 2), 1).steps.join(' ') !== stepBefore) {
    x2++; console.log('  явная единица не вернула обычные шаги');
  }

  // разметка: строка остатка есть, напитки не удваиваются
  const html2 = pagePair();
  if (html2.indexOf('Остаётся на завтра') < 0) { x2++; console.log('  нет строки остатка на завтра'); }
  if (html2.indexOf('Сварить всего') < 0) { x2++; console.log('  нет строки «сварить всего»'); }
  if (html2.indexOf('Что достать и взвесить на два дня') < 0) { x2++; console.log('  свод дня не помечен как двухдневный'); }
  if (bad(html2).length) { x2++; console.log('  ПРОБЛЕМА отрисовки с запасом:', bad(html2).join(',')); }

  profiles.m = { drinks: { cups: 2, ml: 50, sugar: 0, milk: 'молоко 2,5%' } };
  const hd = pagePair();
  if (hd.indexOf('Напитки — на один день') < 0) { x2++; console.log('  напитки не помечены как однодневные'); }
  if (hd.indexOf('<b>100 мл</b>') < 0) { x2++; console.log('  молоко в чашки удвоилось, а не должно'); }
  profiles = {};

  // доля закладки больше единицы называется закладками, а не процентами
  const rb = PLAN.recipes.find(r => r.outG);
  if (rb) {
    const x2Big = batchDetails({ n: rb.key, g: rb.outG * 0.8, m: 0, w: 0 });
    if (x2Big.indexOf('закладки') < 0) { x2++; console.log('  перебор закладки не назван закладками'); }
    if (x2Big.indexOf('%') >= 0) { x2++; console.log('  перебор закладки всё ещё в процентах'); }
    const x2Small = batchDetails({ n: rb.key, g: rb.outG * 0.2, m: 0, w: 0 });
    if (x2Small.indexOf('% закладки') < 0) { x2++; console.log('  малая доля должна оставаться в процентах'); }
  }

  // конструктор тоже удваивает кастрюлю, но не тарелки
  for (const f of allFoods()) pantry[f.n] = true;
  aimMeal = 'Ужин'; consPair = true;
  const rx = assembleDish('Ужин', 'shakshuka');
  if (rx) {
    built = rx.items; builtTpl = rx.tpl;
    cookX2 = false; const c1 = consPairView(), h1 = pageCons();
    cookX2 = true;  const c2 = consPairView(), h2 = pageCons();
    if (JSON.stringify([c1.pm, c1.pw]) !== JSON.stringify([c2.pm, c2.pw])) { x2++; console.log('  запас изменил тарелки в конструкторе'); }
    if (Math.abs(c1.vm.k - c2.vm.k) > 0.01) { x2++; console.log('  запас изменил калории в конструкторе'); }
    if (c1.steps && c2.steps && c1.steps.steps.join(' ') === c2.steps.steps.join(' ')) {
      x2++; console.log('  шаги конструктора не пересчитались');
    }
    if (h2.indexOf('Остаётся на завтра') < 0) { x2++; console.log('  в конструкторе нет строки остатка'); }
    if (h2.indexOf('двойной объём') < 0) { x2++; console.log('  в конструкторе не помечен двойной объём'); }
    // столбец готовки двухдневный целиком: и калории, и белок, и цель
    if (h2.indexOf('<b>' + Math.round((c2.vm.p + c2.vw.p) * 2) + ' г</b>') < 0) { x2++; console.log('  белок в конструкторе не удвоился'); }
    if (h1.indexOf('Остаётся на завтра') >= 0) { x2++; console.log('  строка остатка висит без запаса'); }
    if (bad(h2).length) { x2++; console.log('  ПРОБЛЕМА отрисовки конструктора с запасом'); }
  }
  built = []; builtTpl = null;

  cookX2 = false;
  if (pagePair().indexOf('Остаётся на завтра') >= 0) { x2++; console.log('  тумблер не выключает запас'); }
  console.log('проблем с готовкой ×2:', x2);
  }

  { // границы параметров и живучесть на удалённых продуктах
  let sf = 0;
  profiles = {}; swaps = {}; custom = []; rebuildFood(); who = 'm';

  // 1. форма режет опасный ввод и говорит об этом
  const origGet = document.getElementById;
  const feed = v => { document.getElementById = id => (id in v ? { value: v[id] } : origGet(id)); };
  feed({ pf_sex:'m', pf_age:'31', pf_h:'175', pf_wt:'90', pf_act:'1.375', pf_def:'80', pf_gk:'9' });
  saveProfile();
  document.getElementById = origGet;
  const Pc = person('m');
  if (profiles.m.def !== 30) { sf++; console.log('  дефицит не ограничен:', profiles.m.def); }
  if (profiles.m.gk !== 2.5) { sf++; console.log('  белок на кг не ограничен:', profiles.m.gk); }
  if (!profileNote) { sf++; console.log('  про урезание не сказано'); }
  if (Pc.kcal < 1000) { sf++; console.log('  норма всё равно провалилась:', Pc.kcal); }
  if (pageProfile().indexOf('безопасных границ') < 0) { sf++; console.log('  предупреждения нет в разметке'); }

  // 2. профиль из браузера мимо формы тоже санируется
  profiles.m = { sex:'m', age:9, h:400, wt:600, act:9, def:90, gk:12, fk:9 };
  const Pw = calcNorm(profiles.m);
  if (Pw) {
    if (Pw.kcal <= 0) { sf++; console.log('  норма ушла в ноль'); }
    if (Pw.carb < 0) { sf++; console.log('  углеводы отрицательные'); }
    if (Pw.prot * 4 + Pw.fat * 9 > Pw.kcal) { sf++; console.log('  белок и жир не влезают в норму'); }
    if (Pw.prot / 600 > 2.5 + 0.01) { sf++; console.log('  белок сверх границы:', Pw.prot); }
  }

  // 3. норма и то, что даёт меню, показаны рядом
  profiles.m = { sex:'m', age:31, h:175, wt:110, act:1.375, def:25, gk:1.8, fk:0.9 };
  const gg = planGives('m'), nn = calcNorm(profiles.m);
  if (!(gg.k > 0) || !(gg.p > 0)) { sf++; console.log('  меню не посчиталось'); }
  if (Math.abs(gg.k - nn.kcal) > nn.kcal * 0.05) { sf++; console.log('  калории меню разошлись с нормой:', Math.round(gg.k), nn.kcal); }
  const hp = pageProfile();
  if (hp.indexOf('Норма и что даёт меню') < 0) { sf++; console.log('  нет таблицы «норма и меню»'); }
  if (Math.abs(gg.p - nn.prot) > nn.prot * 0.12 && hp.indexOf('не поспевает') < 0) {
    sf++; console.log('  расхождение по белку есть, а предупреждения нет');
  }
  if (bad(hp).length) { sf++; console.log('  ПРОБЛЕМА отрисовки параметров:', bad(hp).join(',')); }
  profiles = {};

  // 4. удалённый свой продукт не роняет расчёты
  custom = [{ n:'тестовый сыр', cat:'Молочное', k:300, p:20, f:24, c:1, unit:0, mine:true }];
  rebuildFood(); pantry['тестовый сыр'] = true;
  who = 'm'; day = 0;
  applySwap(0, 2, { title:'тест', tplId:null, items:[
    { n:'тестовый сыр', g:100, flex:true, lo:5, hi:300 },
    { n:'филе куриное', g:150, flex:true, lo:5, hi:300 }
  ] });
  custom = []; rebuildFood(); purgeFood('тестовый сыр');
  const left = (swaps[swapKey(0, 2, 'm')] || { items: [] }).items.map(x => x.n);
  if (left.indexOf('тестовый сыр') >= 0) { sf++; console.log('  удалённый продукт остался в замене'); }
  for (const [nm, fn] of [['mealView', () => mealView(0, 2)], ['pairMeal', () => pairMeal(0, 2)],
                          ['pagePair', () => pagePair()], ['pageWeek', () => pageWeek()],
                          ['syncDay', () => syncDay(0)], ['twinOf', () => twinOf([{ n:'нет такого', g:100 }], 200)]]) {
    try { fn(); } catch (e) { sf++; console.log('  ПАДАЕТ ' + nm + ':', e.message); }
  }
  swaps = {}; delete pantry['тестовый сыр'];
  console.log('проблем с границами и живучестью:', sf);
  }

  { // клетчатка
  let fb = 0;
  profiles = {}; swaps = {}; custom = []; rebuildFood(); who = 'm';
  for (const f of PLAN.foods) if (typeof f.b !== 'number' || f.b < 0) { fb++; console.log('  у продукта нет клетчатки:', f.n); }
  for (let d = 0; d < PLAN.days.length; d++) {
    const t = dayTotals(d);
    if (!(t.b > 0)) { fb++; console.log('  в дне не посчиталась клетчатка:', PLAN.days[d].name); }
    /* сумма приёмов должна давать итог дня и по клетчатке тоже */
    let s2 = 0;
    for (let mi = 0; mi < PLAN.days[d].meals.length; mi++) s2 += mealView(d, mi).v.b || 0;
    if (Math.abs(s2 - t.b) > 0.5) { fb++; console.log('  клетчатка приёмов не сходится с днём:', PLAN.days[d].name, s2, t.b); }
    if (t.b < 15 || t.b > 50) { fb++; console.log('  клетчатка вне коридора:', PLAN.days[d].name, Math.round(t.b)); }
  }
  if (tiles(dayTotals(0)).indexOf('Клетчатка') < 0) { fb++; console.log('  нет плитки клетчатки'); }
  day = 0;
  if (pageWeek().indexOf('Клетчатки за день') < 0) { fb++; console.log('  нет подсказки по клетчатке в дне'); }
  /* число в подсказке должно быть настоящим, а не нулём из потерянного поля */
  if (/Клетчатки за день (всего )?0 г/.test(pageWeek())) { fb++; console.log('  в дне показан ноль клетчатки'); }
  if (pageWeek().indexOf('t-fib') < 0) { fb++; console.log('  нет плитки клетчатки в дне'); }
  /* свой продукт с клетчаткой попадает в расчёт */
  custom = [{ n:'отруби тест', cat:'Гарниры', k:250, p:15, f:4, c:20, b:40, unit:0, on:true, mine:true }];
  rebuildFood();
  const v = sumOf([{ n:'отруби тест', g:50 }]);
  if (Math.abs(v.b - 20) > 0.01) { fb++; console.log('  клетчатка своего продукта не считается:', v.b); }
  const v0 = sumOf([{ n:'филе куриное', g:100 }]);
  if (v0.b !== 0) { fb++; console.log('  у курицы взялась клетчатка:', v0.b); }
  custom = []; rebuildFood();
  /* заготовки тоже несут клетчатку */
  if (!PLAN.recipes.every(r => typeof r.per100.b === 'number')) { fb++; console.log('  у заготовки нет клетчатки на 100 г'); }
  if (!PLAN.snacks.every(x => typeof x.b === 'number')) { fb++; console.log('  у перекуса нет клетчатки'); }
  console.log('проблем с клетчаткой:', fb);
  }

  { // подгонка по белку и добор
  let pg = 0;
  profiles = {}; swaps = {}; custom = []; rebuildFood(); who = 'm';
  for (const f of allFoods()) pantry[f.n] = true;

  // 1. подгонка по двум целям не портит калории
  let n = 0, sk = 0, worstK = 0;
  for (const meal of ['Завтрак', 'Обед', 'Ужин', 'Перекус']) {
    const aim = aimFor(meal);
    for (let i = 0; i < 250; i++) {
      const r = assembleDish(meal);
      if (!r) continue;
      const v = sumOf(r.items), dk = Math.abs(v.k - aim.k) / aim.k;
      n++; sk += dk; if (dk > worstK) worstK = dk;
      if (v.p > aim.p * 1.6) { pg++; console.log('  перебор белка:', r.tpl.id, Math.round(v.p), 'при цели', aim.p); }
    }
  }
  if (sk / n > 0.02) { pg++; console.log('  средний промах по калориям вырос:', (sk / n * 100).toFixed(1) + '%'); }
  if (worstK > 0.12) { pg++; console.log('  максимальный промах по калориям:', (worstK * 100).toFixed(1) + '%'); }

  // 2. подгонка умеет тянуть белок вверх внутри коридора калорий
  {
    const list = [
      { n:'филе куриное', g:60,  lo:40, hi:260, flex:true },
      { n:'рис гот.',     g:300, lo:50, hi:400, flex:true }
    ];
    const k0 = sumOf(list).k;
    fitAim(list, k0, 45);
    const v = sumOf(list);
    if (v.p <= 25) { pg++; console.log('  белок не подтянулся:', Math.round(v.p)); }
    if (Math.abs(v.k - k0) > k0 * 0.05) { pg++; console.log('  калории уехали при доборе белка:', Math.round(v.k), 'из', Math.round(k0)); }
  }

  // 3. блюдо, которое белок не вытягивает, честно об этом говорит
  aimMeal = 'Ужин';
  {
    /* нарочно бедное по белку блюдо: подгонке тут двигать нечего */
    const aimU = aimFor('Ужин');
    const rice = FOOD['рис гот.'];
    built = [{ n:'рис гот.', g: roundG(rice, aimU.k / (rice.k / 100)), r:'grain', lo:50, hi:600, flex:true }];
    builtTpl = null;
    const g = proteinGap();
    if (!g) { pg++; console.log('  недобор белка в шакшуке не замечен'); }
    else {
      if (!g.fix) { pg++; console.log('  нечем добрать при полной кладовке'); }
      if (pageCons().indexOf('Добрать белок') < 0) { pg++; console.log('  нет кнопки добора'); }
      const before = sumOf(built), aim = aimFor('Ужин');
      addProtein();
      const after = sumOf(built);
      if (after.p <= before.p + 2) { pg++; console.log('  добор не прибавил белка:', Math.round(before.p), '->', Math.round(after.p)); }
      if (Math.abs(after.k - aim.k) > aim.k * 0.08) { pg++; console.log('  добор сломал калории:', Math.round(after.k), 'из', aim.k); }
      if (proteinGap()) { pg++; console.log('  после добора недобор остался'); }
      if (bad(pageCons()).length) { pg++; console.log('  ПРОБЛЕМА отрисовки после добора'); }
    }
  }

  // 4. на достаточном белке подсказки быть не должно
  built = [{ n:'филе куриное', g:250, lo:50, hi:400, flex:true }, { n:'рис гот.', g:150, lo:50, hi:400, flex:true }];
  builtTpl = null;
  if (proteinGap()) { pg++; console.log('  подсказка о белке висит на белковом блюде'); }
  built = []; builtTpl = null;
  if (proteinGap()) { pg++; console.log('  подсказка о белке висит на пустом конструкторе'); }
  console.log('проблем с подгонкой по белку:', pg);
  }

  { // пересборка недели без кончившегося продукта
  let oo = 0;
  profiles = {}; custom = []; rebuildFood(); who = 'm';

  // продукт внутри заготовки тоже считается
  if (!usesFood('плов', 'филе куриное')) { oo++; console.log('  курица внутри плова не найдена'); }
  if (usesFood('плов', 'минтай')) { oo++; console.log('  в плове нашлась несуществующая рыба'); }
  if (!usesFood('творог 5%', 'творог 5%')) { oo++; console.log('  продукт сам себя не узнал'); }

  for (const n of ['филе куриное', 'творог 5%', 'шампиньоны']) {
    swaps = {};
    for (const f of allFoods()) pantry[f.n] = true;
    const hits = mealsUsing(n, 'm');
    if (!hits.length) { oo++; console.log('  продукт вообще не найден в меню:', n); continue; }

    const tgt = PLAN.days.map((_, d) => dayTotals(d, 'm').k);
    pantry[n] = false;
    const r = rebuildWithout(n, 'm');
    if (r.total !== hits.length) { oo++; console.log('  пересборка увидела не столько приёмов:', n); }
    if (!r.done) { oo++; console.log('  ни один приём не пересобрался:', n); }

    // продукта в пересобранных приёмах быть не должно, кроме сладкого слота
    for (const h of mealsUsing(n, 'm')) {
      if (h.label !== 'Вечер') { oo++; console.log('  продукт остался в приёме:', n, PLAN.days[h.di].name, h.label); }
    }
    // приёмы держат калории и не проваливают белок
    for (const h of hits) {
      const V = mealView(h.di, h.mi, 'm');
      if (!V.swapped) continue;
      if (Math.abs(V.v.k - h.k) > h.k * 0.15) { oo++; console.log('  замена мимо калорий:', n, h.k, '->', V.v.k); }
      if (h.p > 0 && V.v.p < h.p * 0.7) { oo++; console.log('  замена провалила белок:', n, h.p, '->', V.v.p); }
    }
    // день по-прежнему сходится
    PLAN.days.forEach((d, di) => {
      const now = dayTotals(di, 'm').k;
      if (Math.abs(now - tgt[di]) > tgt[di] * 0.08) {
        oo++; console.log('  день уехал после пересборки:', n, d.name, Math.round(tgt[di]), '->', Math.round(now));
      }
    });
  }

  // подсказка появляется при снятой галочке и убирается кнопкой
  swaps = {};
  for (const f of allFoods()) pantry[f.n] = true;
  outNote = null;
  pantry['филе куриное'] = false;
  const hh = mealsUsing('филе куриное', 'm').filter(h => h.label !== 'Вечер');
  outNote = hh.length ? { n:'филе куриное', count: hh.length } : null;
  if (!outNote) { oo++; console.log('  подсказка о кончившемся продукте не появилась'); }
  else {
    const h = pageCons();
    if (h.indexOf('Кончился продукт') < 0) { oo++; console.log('  карточки о кончившемся продукте нет'); }
    if (h.indexOf('data-rebuild') < 0) { oo++; console.log('  нет кнопки пересборки'); }
    if (bad(h).length) { oo++; console.log('  ПРОБЛЕМА отрисовки карточки:', bad(h).join(',')); }
  }
  outNote = null;
  if (pageCons().indexOf('Кончился продукт') >= 0) { oo++; console.log('  карточка не убирается'); }

  // сладкое пересборка не трогает
  swaps = {};
  for (const f of allFoods()) pantry[f.n] = true;
  const sweetIdx = PLAN.days[0].meals.length - 1;
  const sweetBefore = mealView(0, sweetIdx, 'm').title;
  pantry['творог 5%'] = false;
  rebuildWithout('творог 5%', 'm');
  if (mealView(0, sweetIdx, 'm').title !== sweetBefore) { oo++; console.log('  пересборка тронула сладкий слот'); }

  swaps = {}; for (const f of allFoods()) pantry[f.n] = true;
  console.log('проблем с пересборкой без продукта:', oo);
  }

  { // дневник питания
  let ee = 0;
  profiles = {}; swaps = {}; eaten = {}; who = 'm'; day = TODAY;

  if (eatStats('m', 14).marked !== 0) { ee++; console.log('  пустой дневник что-то насчитал'); }
  if (pageProfile().indexOf('пока пусто') < 0) { ee++; console.log('  пустая сводка не показана'); }

  // отметка ставится, читается и снимается
  markDay(TODAY, 'plan', 0);
  if (!eatOf(TODAY) || eatOf(TODAY).s !== 'plan') { ee++; console.log('  отметка не записалась'); }
  if (eatStats('m', 14).plan !== 1) { ee++; console.log('  день по плану не сосчитался'); }
  markDay(TODAY, 'off', 2400);
  const st1 = eatStats('m', 14);
  if (st1.plan !== 0 || st1.off !== 1) { ee++; console.log('  отметка не переписалась'); }
  const tgtToday = targetFor('m', PLAN.days[TODAY].id);
  if (st1.dev === null || Math.abs(st1.dev - (2400 - tgtToday)) > 1) {
    ee++; console.log('  разница с планом посчитана неверно:', st1.dev, 'ожидалось', 2400 - tgtToday);
  }
  markDay(TODAY, null, 0);
  if (eatOf(TODAY)) { ee++; console.log('  отметка не снялась'); }

  // дневник у каждого свой
  who = 'm'; markDay(TODAY, 'plan', 0);
  who = 'w';
  if (eatOf(TODAY)) { ee++; console.log('  чужая отметка видна второму'); }
  if (eatStats('w', 14).marked !== 0) { ee++; console.log('  чужие дни попали в её сводку'); }
  who = 'm';

  // старые записи учитываются, будущие — нет
  const iso = shift => { const d = new Date(); d.setDate(d.getDate() + shift); return d.toISOString().slice(0, 10); };
  eaten['m|' + iso(-3)] = { s:'plan', k:0, t:iso(-3) };
  eaten['m|' + iso(-20)] = { s:'plan', k:0, t:iso(-20) };
  eaten['m|' + iso(3)] = { s:'plan', k:0, t:iso(3) };
  const st2 = eatStats('m', 14);
  if (st2.marked !== 2) { ee++; console.log('  в окно 14 дней попало не то число записей:', st2.marked); }

  // разметка
  day = TODAY;
  const hw = pageWeek();
  if (hw.indexOf('Ел как в плане') < 0 || hw.indexOf('Ели другое') < 0) { ee++; console.log('  нет кнопок отметки'); }
  if (hw.indexOf('Снять отметку') < 0) { ee++; console.log('  нет кнопки снятия при отмеченном дне'); }
  if (bad(hw).length) { ee++; console.log('  ПРОБЛЕМА отрисовки недели с дневником:', bad(hw).join(',')); }
  markDay(TODAY, 'off', 2400);
  if (pageWeek().indexOf('eat_k') < 0) { ee++; console.log('  нет поля калорий у дня «ели другое»'); }
  const hp2 = pageProfile();
  if (hp2.indexOf('Дневник питания') < 0) { ee++; console.log('  нет сводки в параметрах'); }
  if (bad(hp2).length) { ee++; console.log('  ПРОБЛЕМА отрисовки сводки:', bad(hp2).join(',')); }

  // будущий день отмечать нельзя
  if (TODAY < PLAN.days.length - 1) {
    day = TODAY + 1;
    if (pageWeek().indexOf('День ещё не наступил') < 0) { ee++; console.log('  будущий день предлагает отметку'); }
    if (pageWeek().indexOf('data-eat') >= 0) { ee++; console.log('  у будущего дня есть кнопки отметки'); }
  }

  eaten = {}; day = 0; who = 'm';
  console.log('проблем с дневником питания:', ee);
  }

  { // новые продукты и быстрые блюда
  let np = 0;
  profiles = {}; swaps = {}; custom = []; rebuildFood(); who = 'm';
  for (const f of allFoods()) pantry[f.n] = true;

  for (const n of ['макароны гот.', 'пудинг молочный']) {
    if (!FOOD[n]) { np++; console.log('  нет продукта в кладовке:', n); }
  }
  if (!anyFood('макароны тв. сухие')) { np++; console.log('  сухих макарон нет в базе'); }
  if (!PLAN.recipes.some(r => r.key === 'болоньезе')) { np++; console.log('  нет заготовки болоньезе'); }
  if (!PLAN.sweets.some(x => x.title.indexOf('Пудинг') >= 0)) { np++; console.log('  пудинга нет в сладком'); }

  // сухая навеска макарон меньше готовой примерно вдвое
  {
    const x = { n:'макароны гот.', g:225 };
    const d = parseFloat(dry(x));
    if (!(d > 80 && d < 120)) { np++; console.log('  сухая навеска макарон посчитана странно:', dry(x)); }
  }

  aimMeal = 'Обед';
  for (const id of ['pastameat', 'pastatuna', 'pastamush', 'soupnoodle', 'chickpot']) {
    const r = assembleDish('Обед', id);
    if (!r) { np++; console.log('  блюдо не собирается:', id); continue; }
    const v = sumOf(r.items), aim = aimFor('Обед');
    if (Math.abs(v.k - aim.k) > aim.k * 0.12) { np++; console.log('  мимо калорий:', id, Math.round(v.k), 'из', aim.k); }
    const st = stepsFor(r.tpl, r.items);
    if (!st || st.broken) { np++; console.log('  порядок готовки не собрался:', id); continue; }
    for (const line of st.steps) {
      if (/undefined|NaN/.test(line)) { np++; console.log('  дыра в шаге:', id, line); }
      /* «на растительным маслом» — типичная ошибка падежа после предлога */
      if (/ на [а-яё]+ым | на [а-яё]+ом маслом/.test(line)) { np++; console.log('  падеж после предлога:', id, line); }
    }
  }
  console.log('проблем с новыми блюдами:', np);
  }

  { // поиск блюда по кладовке в панели замены
  let ss = 0;
  profiles = {}; swaps = {}; who = 'm'; swapQ = '';
  pantry = {};
  for (const f of PLAN.foods) if (f.on) pantry[f.n] = true;

  const h = swapPanel(0, 2);
  const cnt = x => (h.match(x) || []).length;
  if (!cnt(/data-swapdish/g)) { ss++; console.log('  ничего не собирается из базовой кладовки'); }
  if (!cnt(/class="near"/g)) { ss++; console.log('  нет списка «почти хватает»'); }
  if (h.indexOf('id="swq"') < 0) { ss++; console.log('  нет поля поиска в панели замены'); }
  if (bad(h).length) { ss++; console.log('  ПРОБЛЕМА отрисовки панели замены:', bad(h).join(',')); }

  // «почти хватает» называет именно недостающее
  {
    const t2 = DISHES.find(x => x.id === 'pastatuna');
    pantry['тунец с/с'] = false;
    const need = dishNeeds(t2);
    if (need.indexOf('тунец с/с') < 0) { ss++; console.log('  недостающий продукт не назван:', need.join(',')); }
    pantry['тунец с/с'] = true;
    if (dishNeeds(t2).length) { ss++; console.log('  блюдо просит продуктов, хотя всё есть'); }
  }

  // поиск по названию блюда, продукту и технике
  const found = q => { swapQ = q; const x = swapPanel(0, 2); return (x.match(/data-swapdish/g) || []).length; };
  const all = found('');
  if (found('паста') >= all) { ss++; console.log('  фильтр по блюду не сужает список'); }
  if (!found('макароны')) { ss++; console.log('  поиск по продукту ничего не нашёл'); }
  if (!found('духовка')) { ss++; console.log('  поиск по технике ничего не нашёл'); }
  if (found('такогопродуктанет')) { ss++; console.log('  бессмысленный запрос что-то нашёл'); }
  swapQ = 'такогопродуктанет';
  if (swapPanel(0, 2).indexOf('ничего не собирается') < 0) { ss++; console.log('  пустой результат не объяснён'); }
  swapQ = '';

  // выбранное блюдо действительно встаёт в приём
  {
    const meal = PLAN.days[0].meals[2], aim = { k: meal.m.k, p: meal.m.p };
    const r = assembleDish('Обед', 'pastameat', aim);
    if (!r) { ss++; console.log('  выбранное блюдо не собралось'); }
    else {
      applySwap(0, 2, { title:'тест пасты', tplId:'pastameat', items: r.items.map(x => ({ n:x.n, g:x.g, r:x.r, side:!!x.side })) });
      const V = mealView(0, 2);
      if (!V.swapped || V.tplId !== 'pastameat') { ss++; console.log('  замена не встала'); }
      if (Math.abs(V.v.k - aim.k) > aim.k * 0.15) { ss++; console.log('  замена мимо калорий приёма:', V.v.k, aim.k); }
      dropSwap(0, 2);
    }
  }
  swaps = {};
  for (const f of allFoods()) pantry[f.n] = true;
  console.log('проблем с поиском замены:', ss);
  }

  { // сочетаемость продуктов
  let tc = 0;
  profiles = {}; swaps = {}; custom = []; rebuildFood(); who = 'm';
  for (const f of allFoods()) pantry[f.n] = true;

  // 1. сладкое не попадает в солёное и наоборот
  for (const tp of DISHES) {
    const wrong = kindOf(tp) === 'sweet' ? SAVORY_ONLY : SWEET_ONLY;
    for (const sl of tp.slots) for (const f of slotPool(sl)) {
      if (wrong.indexOf(f.n) >= 0) {
        tc++; console.log('  несочетаемо:', tp.short, '(' + kindOf(tp) + ') роль', sl.r, '->', f.n);
      }
    }
  }

  // 2. сырые овощи не попадают в блюда с термообработкой
  const RAW = ['огурец', 'капуста квашеная'];
  const COLD = ['без техники', 'тостер', 'блендер', 'мороженица'];
  for (const tp of DISHES) {
    const cold = COLD.some(g => tp.gear.indexOf(g) >= 0);
    for (const sl of tp.slots) {
      if (cold || sl.fresh) continue;
      for (const f of slotPool(sl)) if (RAW.indexOf(f.n) >= 0) {
        tc++; console.log('  сырой овощ в готовке:', tp.short, tp.gear, sl.r, '->', f.n);
      }
    }
  }

  // 3. «вприкуску» берётся по характеру блюда
  for (const tp of DISHES) {
    const list = sideList(tp);
    const wrong = kindOf(tp) === 'sweet' ? SIDE_SAVORY : SIDE_SWEET;
    if (list.some(n => wrong.indexOf(n) >= 0)) { tc++; console.log('  вприкуску не из своего списка:', tp.short); }
  }
  {
    /* на практике: собранное блюдо не должно принести зефир к ухе */
    let seen = 0;
    for (const meal of ['Завтрак', 'Обед', 'Ужин', 'Перекус']) {
      for (let i = 0; i < 300; i++) {
        const r = assembleDish(meal);
        if (!r) continue;
        for (const x of r.items) {
          if (!x.side) continue;
          seen++;
          if (sideList(r.tpl).indexOf(x.n) < 0) { tc++; console.log('  чужое вприкуску:', r.tpl.short, '->', x.n); }
        }
      }
    }
  }

  // 4. добор белка предлагает то, что в блюдо кладут
  for (const kind of ['savory', 'sweet']) {
    const wrong = kind === 'savory' ? SWEET_ONLY : SAVORY_ONLY;
    for (const n of PROT_FIX[kind]) {
      if (wrong.indexOf(n) >= 0) { tc++; console.log('  добор белка не того лагеря:', kind, n); }
      if (!FOOD[n]) { tc++; console.log('  добор белка ссылается на несуществующий продукт:', n); }
    }
  }
  console.log('проблем с сочетаемостью:', tc);
  }

  { // логика шагов
  let sl2 = 0;
  profiles = {}; swaps = {}; who = 'm';
  for (const f of allFoods()) pantry[f.n] = true;

  const root = x => x.toLowerCase().split(' ')[0].replace(/[.,%]/g, '').slice(0, 4);
  /* фразы, которые уже ломались: предлог не того падежа, лишнее упоминание */
  const WRONG = ['с сметан', 'вмешать бананом', 'вмешать протеином', 'обмакнуть в яйцом',
                 'молотыми овсяные', 'добавить сметана', 'добавить куриным', 'сочность даёт он',
                 'кусочками с грецкий', ' и и ', 'undefined', 'NaN'];

  for (const meal of ['Завтрак', 'Обед', 'Ужин', 'Перекус']) {
    for (let i = 0; i < 400; i++) {
      const r = assembleDish(meal);
      if (!r) continue;
      const st = stepsFor(r.tpl, r.items);
      if (!st || st.broken) { sl2++; console.log('  порядок готовки не собрался:', r.tpl.id); continue; }
      const text = (st.steps.join(' ') + ' ' + st.title);
      const low = text.toLowerCase();

      /* каждый взвешенный продукт должен быть где-то назван */
      for (const x of r.items) {
        if (x.side) continue;
        const rs = [root(x.n), root(word(x.n)), root(word(x.n, 1))];
        const w2 = word(x.n).toLowerCase().split(' ');
        if (w2[1]) rs.push(w2[1].replace(/[.,%]/g, '').slice(0, 4));
        if (x.n === 'яйцо') rs.push('яйц');
        if (x.n === 'масло раст.') rs.push('масл');
        if (!rs.some(rt => rt.length > 2 && low.indexOf(rt) >= 0)) {
          sl2++; console.log('  продукт не упомянут в шагах:', r.tpl.short, '|', x.n);
        }
      }
      for (const bad2 of WRONG) if (low.indexOf(bad2.toLowerCase()) >= 0) {
        sl2++; console.log('  кривая фраза:', bad2, '|', r.tpl.short);
      }
      if (/\{|\}/.test(text)) { sl2++; console.log('  незаполненная подстановка:', r.tpl.short, st.title); }
      /* предлог «с» перед стечением согласных */
      if (/\bс с[бвгджзклмнпрстфхцчшщ]/i.test(text)) { sl2++; console.log('  «с» вместо «со»:', r.tpl.short); }
    }
  }

  /* техника в шагах должна соответствовать заявленной */
  const GEAR = [['духовка', /духовк|°C|противень|форма|решётк|пергамент/i],
                ['блендер', /блендер|пробить|взбить|смолоть/i],
                ['мороженица', /морожениц|автомат/i],
                ['тостер', /тостер|подсуш|поджар/i]];
  for (const tp of DISHES) {
    const pv = previewDish(tp);
    if (!pv) continue;
    const st = stepsFor(tp, pv.parts);
    if (!st || st.broken) continue;
    const text = st.steps.join(' ');
    for (const [g, re] of GEAR) if (tp.gear.indexOf(g) >= 0 && !re.test(text)) {
      sl2++; console.log('  техника «' + g + '» заявлена, а в шагах её нет:', tp.short);
    }
  }
  console.log('проблем с логикой шагов:', sl2);
  }

  { // свои дни зала
  let gy = 0;
  profiles = {}; swaps = {}; who = 'm';
  const N = PLAN.days.length;

  // по умолчанию — как в плане
  gymDays = PLAN.days.map(d => !!d.gym);
  for (let i = 0; i < N; i++) if (isGym(i) !== !!PLAN.days[i].gym) { gy++; console.log('  умолчание разошлось с планом:', i); }
  for (const k of ['m', 'w']) for (const d of PLAN.days) {
    if (Math.abs(targetFor(k, d.id) - PLAN.targets[k][d.id]) > 5) {
      gy++; console.log('  цель дня уехала при плановой расстановке:', k, d.name, targetFor(k, d.id), 'вместо', PLAN.targets[k][d.id]);
    }
  }

  // любая расстановка сохраняет недельное среднее
  const SETS = [
    [false,true,false,true,false,true,false],
    [true,true,false,true,true,false,false],
    [true,false,false,false,false,false,false],
    [false,false,false,false,false,false,false],
    [true,true,true,true,true,true,true],
    [false,false,true,false,false,true,true]
  ];
  for (const set of SETS) {
    gymDays = set.slice();
    for (const k of ['m', 'w']) {
      const avg = PLAN.days.reduce((a, d) => a + targetFor(k, d.id), 0) / N;
      if (Math.abs(avg - PLAN.people[k].kcal) > PLAN.people[k].kcal * 0.01) {
        gy++; console.log('  недельное среднее поехало:', k, set.filter(Boolean).length, 'дней ->', Math.round(avg), 'вместо', PLAN.people[k].kcal);
      }
      const n = set.filter(Boolean).length;
      if (n > 0 && n < N) {
        const hi = targetFor(k, PLAN.days[set.indexOf(true)].id);
        const lo = targetFor(k, PLAN.days[set.indexOf(false)].id);
        if (hi <= lo) { gy++; console.log('  день зала не калорийнее обычного:', k, hi, lo); }
        if (Math.abs((hi - lo) - GYM_SPREAD[k]) > 10) { gy++; console.log('  разница между днями не та:', k, hi - lo); }
      } else {
        const all = PLAN.days.map(d => targetFor(k, d.id));
        if (Math.max.apply(null, all) - Math.min.apply(null, all) > 5) { gy++; console.log('  без выбора дни должны быть равны:', k); }
      }
    }
  }

  // навески в меню идут за целью дня
  gymDays = [false,true,false,true,false,true,false];
  for (const k of ['m', 'w']) for (let di = 0; di < N; di++) {
    const got = dayTotals(di, k).k, want = targetFor(k, PLAN.days[di].id);
    if (Math.abs(got - want) > want * 0.05) {
      gy++; console.log('  день не подстроился под новую цель:', k, PLAN.days[di].name, Math.round(got), 'при цели', want);
    }
  }

  // разметка: бейдж и переключатели
  day = 1; who = 'm';
  if (pageWeek().indexOf('зал') < 0) { gy++; console.log('  во вторник нет метки зала'); }
  gymDays = [false,false,false,false,false,false,false];
  if (pageWeek().indexOf('прогулка') < 0) { gy++; console.log('  без зала нет обычной метки'); }
  const hp3 = pageProfile();
  if (hp3.indexOf('data-gym') < 0) { gy++; console.log('  нет переключателей дней зала'); }
  if (hp3.indexOf('Дни зала') < 0) { gy++; console.log('  нет заголовка «Дни зала»'); }
  if (bad(hp3).length) { gy++; console.log('  ПРОБЛЕМА отрисовки параметров:', bad(hp3).join(',')); }

  // переключение сохраняется
  setGym(0, true);
  if (!isGym(0)) { gy++; console.log('  день зала не включился'); }
  setGym(0, false);
  if (isGym(0)) { gy++; console.log('  день зала не выключился'); }

  gymDays = PLAN.days.map(d => !!d.gym);
  console.log('проблем с днями зала:', gy);
  }

  console.log('сегодня по календарю: индекс ' + TODAY + ' -> ' + PLAN.days[TODAY].name);
})();
`;
eval(body + probe);
