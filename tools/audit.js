/* Проверка цифр, а не разметки: сходится ли калорийность продуктов с
   их же макросами, не врут ли выходы заготовок, попадают ли дни в цель
   и остаются ли макросы в разумных коридорах. Запуск: node tools/audit.js */

const fs = require('fs');
const path = require('path');

const PLAN = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'src', 'data.js'), 'utf8')
    .replace(/^const PLAN\s*=\s*/, '').replace(/;\s*$/, '')
);

let problems = 0;
const fail = (...a) => { problems++; console.log('  !', ...a); };
const head = t => console.log('\n' + t);
const num = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/* ---------- 1. калорийность против собственных макросов ---------- */
/* Формула Этуотера: 4 ккал на грамм белка и углеводов, 9 на грамм жира.
   Расхождение больше 10% значит опечатку в базе — кроме клетчатки,
   которую мы не считаем углеводом. */
head('КАЛОРИЙНОСТЬ ПРОДУКТОВ ПРОТИВ ИХ МАКРОСОВ');
const FIBER_OK = new Set(['чиа']);   /* клетчатка: ккал по этикетке выше расчётной */
const foods = PLAN.foods.map(f => ({ n: f.n, k: f.k, p: f.p, f: f.f, c: f.c }))
  .concat(Object.entries(PLAN.base || {}).map(([n, v]) => ({ n, k: v.k, p: v.p, f: v.f, c: v.c })));
let off = 0;
for (const x of foods) {
  const at = 4 * x.p + 9 * x.f + 4 * x.c;
  const d = x.k - at;
  if (Math.abs(d) > 12 && at > 0 && Math.abs(d / at) > 0.10) {
    if (FIBER_OK.has(x.n)) { console.log('  ~', x.n, '—', x.k, 'ккал против', Math.round(at), 'по макросам: клетчатка, так и задумано'); continue; }
    off++; fail(x.n + ':', x.k, 'ккал в базе, но по макросам', Math.round(at));
  }
}
console.log('  продуктов проверено:', foods.length + ', расхождений:', off);

/* ---------- 2. заготовки: масса, выход, сходимость ---------- */
head('ЗАГОТОВКИ: НАВЕСКА → ВЫХОД');
const F = Object.fromEntries(foods.map(f => [f.n, f]));
for (const r of PLAN.recipes) {
  const mass = r.ing.reduce((a, x) => a + x.g, 0);
  let k = 0, p = 0;
  for (const x of r.ing) {
    const f = F[x.n];
    if (!f) { fail(r.key + ': ингредиент «' + x.n + '» не найден в базе'); continue; }
    k += f.k * x.g / 100; p += f.p * x.g / 100;
  }
  if (!r.outG) { fail(r.key + ': не указан выход'); continue; }
  /* КБЖУ на 100 г — это калории навески, поделённые на выход */
  const want = k / r.outG * 100;
  if (Math.abs(want - r.per100.k) > Math.max(2, want * 0.02))
    fail(r.key + ': на 100 г заявлено ' + r.per100.k + ', а из навески выходит ' + Math.round(want));
  const dm = (r.outG - mass) / mass * 100;
  /* вода добавляется в супы и крупы, уходит при запекании — но не вдвое */
  if (dm > 60) fail(r.key + ': выход больше навески на ' + Math.round(dm) + '% — столько воды не заявлено');
  if (dm < -35) fail(r.key + ': ужарка ' + Math.round(-dm) + '% — многовато даже для духовки');
  console.log('  ' + r.key.padEnd(20) + String(mass).padStart(5) + ' г → ' + String(r.outG).padStart(5) + ' г  (' +
    (dm >= 0 ? '+' : '') + Math.round(dm) + '%)   ' + String(r.per100.k).padStart(3) + ' ккал/100 г, белок ' + r.per100.p);
}

/* ---------- 3. дни: сумма приёмов и попадание в цель ---------- */
head('ДНИ: СУММА ПРИЁМОВ И ЦЕЛЬ');
for (const who of ['w', 'm']) {
  for (const d of PLAN.days) {
    const s = d.meals.reduce((a, m) => ({
      k: a.k + m[who].k, p: a.p + m[who].p, f: a.f + m[who].f, c: a.c + m[who].c
    }), { k: 0, p: 0, f: 0, c: 0 });
    const t = PLAN.targets[who][d.id];
    if (Math.abs(s.k - t) > t * 0.03) fail(d.name + ' (' + who + '): ' + s.k + ' против цели ' + t);
    /* на такой калорийности разумно держать не меньше 0,6 г жира на кг —
       считать не от чего, поэтому проверяем долю: ниже 20% калорий из жира
       уже гормонально невыгодно, выше 40% выдавливает углеводы под зал */
    const fShare = s.f * 9 / s.k, pShare = s.p * 4 / s.k;
    if (fShare < 0.20) fail(d.name + ' (' + who + '): жира всего ' + Math.round(fShare * 100) + '% калорий');
    if (fShare > 0.42) fail(d.name + ' (' + who + '): жира ' + Math.round(fShare * 100) + '% калорий');
    if (pShare > 0.40) fail(d.name + ' (' + who + '): белка ' + Math.round(pShare * 100) + '% калорий');
  }
}
const wk = who => PLAN.days.reduce((a, d) => {
  d.meals.forEach(m => { a.k += m[who].k; a.p += m[who].p; a.f += m[who].f; a.c += m[who].c; });
  return a;
}, { k: 0, p: 0, f: 0, c: 0 });
for (const who of ['w', 'm']) {
  const t = wk(who), n = PLAN.people[who];
  console.log('  ' + n.name + ': ' + num(t.k / 7) + ' ккал/день (норма ' + num(n.kcal) + '), Б ' +
    Math.round(t.p / 7) + ' Ж ' + Math.round(t.f / 7) + ' У ' + Math.round(t.c / 7) +
    '  — доли ' + Math.round(t.p * 4 / t.k * 100) + '/' + Math.round(t.f * 9 / t.k * 100) + '/' + Math.round(t.c * 4 / t.k * 100) + '%');
}

/* ---------- 4. приёмы: порядок порций и вменяемые навески ---------- */
head('ПРИЁМЫ: ПОРЯДОК ПОРЦИЙ И РАЗМЕР НАВЕСОК');
let big = 0;
for (const d of PLAN.days) for (const m of d.meals) {
  if (m.label !== 'Вечер' && m.m.k < m.w.k)
    fail(d.name + ' ' + m.label + ': её порция ' + m.w.k + ' больше его ' + m.m.k);
  for (const who of ['w', 'm']) for (const piece of m[who].qty.split(', ')) {
    const mm = piece.match(/(\d+)\s*г$/);
    if (mm && +mm[1] > 400) { big++; console.log('  ~ крупная навеска:', d.name, m.label, piece); }
  }
}
console.log('  навесок больше 400 г:', big);

/* ---------- 5. перекусы, сладкое, напитки ---------- */
head('ПЕРЕКУСЫ, СЛАДКОЕ, НАПИТКИ');
const small = (list, name, lo, hi) => {
  for (const x of list) {
    if (typeof x.k !== 'number' || x.k < lo || x.k > hi)
      fail(name + ' «' + x.title + '»: ' + x.k + ' ккал вне коридора ' + lo + '–' + hi);
    const at = 4 * x.p + 9 * x.f + 4 * x.c;
    if (at > 0 && Math.abs(x.k - at) > Math.max(15, at * 0.15))
      fail(name + ' «' + x.title + '»: ' + x.k + ' ккал против ' + Math.round(at) + ' по макросам');
  }
  console.log('  ' + name + ': ' + list.length + ' шт, от ' +
    Math.min(...list.map(x => x.k)) + ' до ' + Math.max(...list.map(x => x.k)) + ' ккал');
};
small(PLAN.snacks, 'перекусы', 60, 400);
small(PLAN.sweets, 'сладкое', 40, 200);
small(PLAN.drinks, 'напитки', 0, 400);

/* ---------- 6. аллергия ---------- */
head('ОГРАНИЧЕНИЯ');
const RED = /лосос|сёмг|семг|форел|горбуш|кет[аы]\b|нерк|кижуч|красн(ая|ой) рыб|икр[аы]/i;
const hay = JSON.stringify(PLAN);
if (RED.test(hay)) fail('в плане нашлась красная рыба');
else console.log('  красной рыбы нет ни в базе, ни в меню, ни в рецептах');

console.log('\nИТОГО ПРОБЛЕМ:', problems);
process.exitCode = problems ? 1 : 0;
