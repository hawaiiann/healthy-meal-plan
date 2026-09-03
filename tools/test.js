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

  console.log('сегодня по календарю: индекс ' + TODAY + ' -> ' + PLAN.days[TODAY].name);
})();
`;
eval(body + probe);
