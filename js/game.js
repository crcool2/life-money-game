/* เกมส์ชีวิตและการเงิน — สถานะเกมและระบบทั้งหมด (เวลา ชีวิต เงิน งาน หุ้น ธุรกิจ เหตุการณ์ บันทึกเกม) */
'use strict';
(function () {
  const D = window.DATA;
  const SAVE_KEY = 'chiwit-ngoen-save-v2';
  const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const fmt = n => (n < 0 ? '-' : '') + '฿' + Math.abs(Math.round(n)).toLocaleString('th-TH');
  const DAYS = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];
  const NEEDS = { energy: 'พลังงาน', hunger: 'ความอิ่ม', hygiene: 'สุขอนามัย', health: 'สุขภาพ', happy: 'ความสุข', social: 'สังคม', stress: 'ความเครียด' };

  let S = null; // สถานะหลัก
  const G = { S: () => S, fmt, clamp, rnd, pick, DAYS, NEEDS, listeners: {} };
  const emit = (ev, a) => (G.listeners[ev] || []).forEach(f => f(a));
  G.on = (ev, f) => (G.listeners[ev] = G.listeners[ev] || []).push(f);
  const toast = (msg, kind) => emit('toast', { msg, kind });

  // ---------------- สร้างเกมใหม่ ----------------
  G.newGame = function (p) {
    const st = D.START;
    S = {
      v: 2, created: Date.now(),
      player: {
        name: (window.UI ? UI.cleanName(p.name) : p.name) || 'ผู้เล่น', cid: p.cid, traits: p.traits, weak: p.weak,
        skills: { comm: 0, drive: 0, finance: 0, cook: 0, tech: 0, sales: 0 },
        needs: { energy: 80, hunger: 70, hygiene: 75, health: 85, happy: 65, social: 55, stress: 25 },
        scene: 'home_in', x: null, y: null
      },
      time: 8 * 60, // นาทีนับจากเริ่มวันที่ 1
      money: { cash: st.cash, bank: st.bank, savings: st.savings },
      debts: [{ id: 'edu', name: 'หนี้การศึกษา', bal: st.loan, rate: 0.0017, min: 1500 }],
      ledger: [], days: {},
      inv: { food: { bento: 1, instant: 2 }, ingr: 2, items: {}, meds: {} },
      home: {
        owned: false, clean: 70, lampOn: false,
        id: 'home1', name: 'บ้านของฉัน', layout: 5, city: { scene: 'street', spot: 'home' },
        furn: D.HOME_LAYOUT.map((r, i) => ({ id: 'h' + (i + 1), type: r[0], tier: 0, placed: true, x: r[1], y: r[2], flip: !!r[3], state: {} }))
      },
      car: null, bike: false, bigbike: false,
      jobs: { office: null, shifts: 0, gigsDone: 0, rides: 0, deliveries: 0, gigs: [], gigsDay: 0 },
      rel: {}, family: null, pet: null,
      stocks: { price: {}, hist: {}, hold: {} },
      props: [], biz: null,
      goals: { active: ['emergency', 'freedom'], done: {} },
      pending: [], buffs: {}, lastEventDay: 0, happyHist: [], stressHist: [],
      checkin: null, flags: {}, nextId: 10,
      settings: { speed: 1, text: 1, labels: true, sound: true, reduce: false, lang: 'th' }
    };
    for (const s of D.STOCKS) {
      // ย้อนสร้างราคา 40 วันแบบสุ่มเดิน ให้จบที่ราคาตั้งต้น
      const h = [s.price]; let v = s.price;
      for (let i = 0; i < 40; i++) { v = v / Math.exp(s.drift / 365 + s.vol * gauss()); h.unshift(v); }
      S.stocks.price[s.id] = s.price; S.stocks.hist[s.id] = h;
    }
    for (const id of Object.keys(D.NPCS)) S.rel[id] = { v: 0, met: false, greetDay: 0, talkDay: 0, talks: 0 };
    log('เริ่มชีวิตใหม่ในเมืองใบไม้', 0, 'อื่น ๆ');
    refreshGigs();
    G.checkin();
    G.save(true);
    return S;
  };

  // ---------------- เวลา ----------------
  G.day = () => Math.floor(S.time / 1440) + 1;
  G.hour = () => Math.floor(S.time % 1440 / 60);
  G.minute = () => Math.floor(S.time % 60);
  G.hm = (t = S.time) => String(Math.floor(t % 1440 / 60)).padStart(2, '0') + ':' + String(Math.floor(t % 60)).padStart(2, '0');
  G.weekday = (d = G.day()) => (d - 1) % 7;
  G.month = (d = G.day()) => Math.floor((d - 1) / 30) + 1;
  G.dom = (d = G.day()) => (d - 1) % 30 + 1;
  G.isWeekend = () => G.weekday() >= 5;
  G.period = () => { const h = G.hour(); return h < 5 ? 'กลางคืน' : h < 11 ? 'เช้า' : h < 16 ? 'กลางวัน' : h < 19 ? 'เย็น' : 'กลางคืน'; };
  G.dateLabel = () => `วัน${DAYS[G.weekday()]} · วันที่ ${G.dom()} เดือน ${G.month()}`;

  let lastHour = -1, lastDay = -1;
  G.advance = function (mins) {
    if (!S) return;
    const steps = Math.max(1, Math.ceil(mins / 5)); const dm = mins / steps;
    for (let i = 0; i < steps; i++) {
      S.time += dm;
      needsTick(dm);
      const d = G.day(), h = G.hour();
      if (lastDay === -1) { lastDay = d; lastHour = h; }
      if (d !== lastDay) { for (let x = lastDay + 1; x <= d; x++) onDay(x); lastDay = d; }
      if (h !== lastHour) { lastHour = h; onHour(h); }
    }
  };
  G.syncClock = () => { lastDay = G.day(); lastHour = G.hour(); };

  // ---------------- สถานะชีวิต ----------------
  const has = t => S.player.traits.includes(t);
  const weak = t => S.player.weak === t;
  G.has = has; G.weak = weak;
  function needsTick(dm) {
    const n = S.player.needs, h = dm / 60;
    const act = G.activity;
    const r = act && act.rate ? act.rate : {};
    const sleeping = act && act.pose === 'sleep';
    n.energy += ((r.energy != null ? r.energy : 0) + (sleeping ? 0 : -4.2)) * h;
    n.hunger += ((r.hunger || 0) + (sleeping ? -2 : -5)) * h;
    n.hygiene += ((r.hygiene || 0) - 2.6) * h;
    const socDecay = (S.family ? 1.1 : 2.2) * (weak('social') ? 1.25 : 1);
    n.social += ((r.social || 0) - (sleeping ? .4 : socDecay)) * h;
    n.health += (r.health || 0) * h;
    const low = ['energy', 'hunger', 'hygiene', 'social'].filter(k => n[k] < 25).length;
    const calmF = has('calm') ? .75 : weak('calm') ? 1.2 : 1;
    let st = (r.stress || 0) + (low * .9 - .5) * (r.stress > 0 ? calmF : 1);
    if (r.stress > 0) st = r.stress * calmF + (low * .9 - .5);
    n.stress += st * h;
    if (n.hunger < 12 || n.energy < 8 || n.hygiene < 8) n.health -= 1.6 * h;
    else if (n.hunger > 50 && n.energy > 40 && n.stress < 60) n.health += .25 * h;
    if (n.stress > 85) n.health -= .5 * h;
    const target = (n.energy + n.hunger + n.hygiene + n.social + n.health) / 5 - n.stress * .45 + 18 + (S.home.clean < 30 ? -8 : 0) + (S.pet ? 4 : 0) + (S.family ? 6 : 0);
    n.happy += ((target - n.happy) * .09 + (r.happy || 0)) * h;
    for (const k in n) n[k] = clamp(n[k]);
  }
  G.applyEff = function (eff, mult = 1) {
    if (!eff) return;
    const n = S.player.needs;
    for (const k in eff) if (k in n) n[k] = clamp(n[k] + eff[k] * mult);
  };
  G.mood = function () {
    const n = S.player.needs;
    if (n.health < 25) return ['ไม่สบาย', '🤒'];
    if (n.energy < 15) return ['เหนื่อยมาก', '🥱'];
    if (n.hunger < 15) return ['หิวมาก', '😣'];
    if (n.stress > 75) return ['เครียด', '😖'];
    if (n.happy > 75) return ['อารมณ์ดีมาก', '😄'];
    if (n.happy > 50) return ['สบายดี', '🙂'];
    if (n.happy > 30) return ['เฉย ๆ', '😐'];
    return ['เศร้า', '😔'];
  };

  // ---------------- ทักษะ ----------------
  G.skillLv = k => Math.min(10, Math.floor(Math.sqrt((S.player.skills[k] || 0) / 25)));
  G.skillProg = k => { const x = S.player.skills[k] || 0, l = G.skillLv(k); if (l >= 10) return 1; const a = l * l * 25, b = (l + 1) * (l + 1) * 25; return (x - a) / (b - a); };
  G.addXP = function (k, xp) {
    const before = G.skillLv(k);
    S.player.skills[k] = (S.player.skills[k] || 0) + xp * (has('ambitious') ? 1.2 : weak('ambitious') ? .9 : 1);
    const after = G.skillLv(k);
    if (after > before) toast(`${D.SKILLS[k].icon} ทักษะ${D.SKILLS[k].name} เพิ่มเป็นระดับ ${after}!`, 'good');
  };

  // ---------------- เงิน ----------------
  function log(desc, amt, cat, acct) {
    const d = G.day();
    S.ledger.unshift({ d, t: Math.round(S.time), desc, amt: Math.round(amt), cat, acct: acct || '' });
    if (S.ledger.length > 800) S.ledger.length = 800;
    if (cat !== 'โอนเงิน' && amt) {
      const day = S.days[d] = S.days[d] || { inc: 0, exp: 0, cats: {} };
      if (amt > 0) day.inc += amt; else day.exp += -amt;
      day.cats[cat] = (day.cats[cat] || 0) + amt;
    }
  }
  G.log = log;
  G.liquid = () => S.money.cash + S.money.bank;
  G.priceMul = () => (has('frugal') ? .95 : weak('frugal') ? 1.03 : 1);
  // จ่ายเงิน: ใช้เงินสดก่อน แล้วตัดบัญชี; คืน false ถ้าเงินไม่พอ
  G.pay = function (amt, desc, cat) {
    amt = Math.round(amt);
    if (amt <= 0) return true;
    if (G.liquid() < amt) { toast(`เงินไม่พอ: ต้องใช้ ${fmt(amt)} มีอยู่ ${fmt(G.liquid())} (ขาดอีก ${fmt(amt - G.liquid())})`, 'bad'); return false; }
    const fromCash = Math.min(S.money.cash, amt);
    S.money.cash -= fromCash; S.money.bank -= amt - fromCash;
    log(desc, -amt, cat, fromCash === amt ? 'เงินสด' : fromCash ? 'เงินสด+บัญชี' : 'บัญชี');
    emit('money', -amt);
    return true;
  };
  G.earn = function (amt, desc, cat, to = 'bank') {
    amt = Math.round(amt); if (!amt) return;
    S.money[to] += amt; log(desc, amt, cat, to === 'cash' ? 'เงินสด' : 'บัญชี');
    emit('money', amt);
  };
  // ตัดบิลอัตโนมัติ: ถ้าเงินไม่พอ ส่วนที่ขาดกลายเป็นหนี้บัตรเครดิต
  function bill(amt, desc, cat) {
    amt = Math.round(amt); if (amt <= 0) return;
    const liq = G.liquid();
    if (S.money.bank >= amt) { S.money.bank -= amt; log(desc + ' (ตัดบัญชีอัตโนมัติ)', -amt, cat, 'บัญชี'); emit('money', -amt); return; }
    if (liq >= amt) { G.pay(amt, desc, cat); return; }
    if (liq > 0) G.pay(liq, desc + ' (บางส่วน)', cat);
    const rest = amt - Math.max(0, liq);
    let card = S.debts.find(d => d.id === 'card');
    if (!card) { card = { id: 'card', name: 'หนี้บัตรเครดิต', bal: 0, rate: 0.015, min: 0 }; S.debts.push(card); }
    card.bal += rest; log(desc + ' → รูดบัตรเครดิต', 0, 'หนี้');
    toast(`เงินไม่พอจ่าย ${desc} · ${fmt(rest)} กลายเป็นหนี้บัตรเครดิต`, 'bad');
  }
  G.transfer = function (from, to, amt) {
    amt = Math.round(amt);
    if (!(amt > 0)) return toast('กรอกจำนวนเงินมากกว่า 0', 'bad');
    if (S.money[from] < amt) return toast(`ยอดใน${acctName(from)}ไม่พอ (มี ${fmt(S.money[from])})`, 'bad');
    S.money[from] -= amt; S.money[to] += amt;
    log(`โอนจาก${acctName(from)}ไป${acctName(to)}`, 0, 'โอนเงิน');
    toast(`โอน ${fmt(amt)} จาก${acctName(from)}ไป${acctName(to)}แล้ว`, 'good'); emit('money', 0); return true;
  };
  const acctName = a => ({ cash: 'เงินสด', bank: 'บัญชีใช้จ่าย', savings: 'บัญชีออมทรัพย์' })[a];
  G.acctName = acctName;
  G.debtTotal = () => S.debts.reduce((a, d) => a + d.bal, 0);
  G.payDebt = function (id, amt) {
    const d = S.debts.find(x => x.id === id); if (!d) return;
    amt = Math.min(Math.round(amt), Math.ceil(d.bal));
    if (!(amt > 0)) return toast('กรอกจำนวนเงินที่จะชำระ', 'bad');
    if (!G.pay(amt, 'ชำระ' + d.name, 'หนี้')) return;
    d.bal -= amt; if (d.bal < 1) { S.debts = S.debts.filter(x => x !== d); toast(`ปิด${d.name}เรียบร้อย! 🎉`, 'good'); if (id === 'car' && S.car) S.car.loan = false; if (id === 'mortgage') S.home.mortgage = false; }
    else toast(`ชำระ${d.name} ${fmt(amt)} · คงเหลือ ${fmt(d.bal)}`, 'good');
    emit('money', 0);
  };
  G.borrow = function (amt) {
    amt = Math.round(amt);
    let loan = S.debts.find(d => d.id === 'personal');
    const cur = loan ? loan.bal : 0;
    if (!(amt > 0)) return toast('กรอกจำนวนเงินที่จะกู้', 'bad');
    if (cur + amt > 150000) return toast('วงเงินกู้ส่วนบุคคลสูงสุด ฿150,000', 'bad');
    if (!loan) { loan = { id: 'personal', name: 'สินเชื่อส่วนบุคคล', bal: 0, rate: 0.012, min: 0 }; S.debts.push(loan); }
    loan.bal += amt; S.money.bank += amt; log('รับเงินกู้ส่วนบุคคล', amt, 'เงินกู้', 'บัญชี');
    toast(`ได้รับเงินกู้ ${fmt(amt)} ดอกเบี้ย 1.2%/เดือน`, 'warn'); emit('money', amt);
  };
  function debtMin(d) { if (d.fixed) return Math.min(d.fixed, d.bal * (1 + d.rate)); if (d.id === 'card') return Math.max(500, d.bal * .1); if (d.id === 'personal') return Math.max(1000, d.bal * .05); return Math.min(d.min, d.bal); }
  G.debtMin = debtMin;

  // ค่าใช้จ่ายประจำต่อเดือน
  G.fixedCosts = function () {
    const rows = [];
    if (!S.home.owned) rows.push(['ค่าเช่าบ้าน', D.RENT]);
    rows.push(['ค่าน้ำค่าไฟ', D.UTIL], ['ค่าโทรศัพท์/อินเทอร์เน็ต', D.PHONE_BILL]);
    for (const d of S.debts) rows.push(['ผ่อน/ชำระ' + d.name, Math.round(debtMin(d))]);
    if (S.car) rows.push(['ประกันและบำรุงรถ', D.CARS[S.car.id].upkeep]);
    if (S.pet) rows.push(['ค่าอาหารสัตว์เลี้ยง (ประมาณ)', 1500]);
    if (S.family) rows.push(['ค่าใช้จ่ายครอบครัว', 3000]);
    rows.push(['ค่าอาหารพื้นฐาน (ประมาณ)', 4500]);
    return rows;
  };
  G.fixedTotal = () => G.fixedCosts().reduce((a, r) => a + r[1], 0);
  // รายได้จากสินทรัพย์ต่อเดือน (คาดการณ์)
  G.passive = function () {
    const rows = [];
    let div = 0;
    for (const s of D.STOCKS) { const h = S.stocks.hold[s.id]; if (h && h.q && s.divYield) div += h.q * S.stocks.price[s.id] * s.divYield / 12 * .9; }
    if (div) rows.push(['ปันผลหุ้น (หลังหักภาษี 10%)', div]);
    for (const p of S.props) { const P = D.PROPERTIES.find(x => x.id === p.id); rows.push([P.name + ' (สุทธิ)', P.rent * (1 - P.vacancy) - P.upkeep]); }
    if (S.biz && S.biz.staff.length >= D.BUSINESSES[S.biz.type].staffNeed && S.biz.hist.length) {
      const avg = S.biz.hist.slice(-14).reduce((a, h) => a + h.profit, 0) / Math.min(14, S.biz.hist.length);
      rows.push([D.BUSINESSES[S.biz.type].name + ' (มีพนักงานครบ)', avg * 30]);
    }
    if (S.money.savings > 0) rows.push(['ดอกเบี้ยเงินออม 1.5%/ปี', S.money.savings * .015 / 12]);
    return rows;
  };
  G.passiveTotal = () => G.passive().reduce((a, r) => a + r[1], 0);
  G.stockValue = () => D.STOCKS.reduce((a, s) => a + ((S.stocks.hold[s.id] || {}).q || 0) * S.stocks.price[s.id], 0);
  G.propValue = p => { const P = D.PROPERTIES.find(x => x.id === p.id); return P.price * (1 + .03 * (G.day() - p.day) / 360); };
  G.assets = function () {
    const rows = [['เงินสด', S.money.cash], ['บัญชีใช้จ่าย', S.money.bank], ['บัญชีออมทรัพย์', S.money.savings], ['หุ้น', G.stockValue()]];
    for (const p of S.props) rows.push([D.PROPERTIES.find(x => x.id === p.id).name, G.propValue(p)]);
    if (S.car) rows.push([D.CARS[S.car.id].name, S.car.value]);
    if (S.biz) rows.push([D.BUSINESSES[S.biz.type].name, S.biz.value]);
    if (S.home.owned) rows.push(['บ้านของตัวเอง', 1800000]);
    const furnV = S.home.furn.reduce((a, f) => a + (D.FURN_BASE_PRICE[f.type] || 0) * D.TIERS[f.tier].mult * .4, 0);
    rows.push(['เฟอร์นิเจอร์และของใช้ (มูลค่ามือสอง)', furnV]);
    return rows;
  };
  G.netWorth = () => G.assets().reduce((a, r) => a + r[1], 0) - G.debtTotal();

  // ---------------- ร้านค้า ----------------
  G.shopOpen = function (key) { const s = D.SHOPS[key]; if (!s) return true; const h = G.hour() + G.minute() / 60; return h >= s.open && h < s.close; };
  G.shopHours = key => { const s = D.SHOPS[key]; return `${String(s.open).padStart(2, '0')}:00–${String(s.close).padStart(2, '0')}:00`; };
  // แปลงรหัสสินค้าในร้าน → ข้อมูลแสดงผล
  G.shopItem = function (code, tier = 0) {
    if (code.startsWith('f:')) { const t = code.slice(2), T = D.FURN_TYPES[t]; return { code, kind: 'furn', type: t, name: T.name, price: Math.round(D.FURN_BASE_PRICE[t] * D.TIERS[tier].mult * G.priceMul()), tier }; }
    if (code.startsWith('c:')) { const c = D.CARS[code.slice(2)]; return { code, kind: 'car', id: code.slice(2), name: c.name, price: c.price, c }; }
    const it = D.ITEMS[code]; return Object.assign({ code, id: code }, it, { price: Math.round(it.price * G.priceMul()) });
  };
  G.buy = function (code, opts = {}) {
    const it = G.shopItem(code, opts.tier || 0);
    const qty = Math.max(1, opts.qty || 1);
    if (it.kind === 'item' && S.inv.items[it.id]) return toast('มี' + it.name + 'อยู่แล้ว', 'warn');
    if (it.kind === 'pet' && S.pet) return toast('ที่บ้านมีน้องหมาแล้ว', 'warn');
    if (it.kind === 'car') return false; // ใช้ G.buyCar
    const cat = { food: 'อาหาร', ingredient: 'อาหาร', cafe: 'อาหาร', med: 'ยา/สุขภาพ', item: 'ของใช้', furn: 'เฟอร์นิเจอร์', outfit: 'เสื้อผ้า', pet: 'สัตว์เลี้ยง' }[it.kind] || 'อื่น ๆ';
    if (!G.pay(it.price * qty, `ซื้อ${it.name}${qty > 1 ? ' x' + qty : ''}`, cat)) return false;
    if (it.kind === 'food') S.inv.food[it.id] = (S.inv.food[it.id] || 0) + qty;
    else if (it.kind === 'ingredient') S.inv.ingr += (it.qty || 1) * qty;
    else if (it.kind === 'med') S.inv.meds[it.id] = (S.inv.meds[it.id] || 0) + qty;
    else if (it.kind === 'item') { S.inv.items[it.id] = true; if (it.eff) G.applyEff(it.eff); if (it.id === 'bike') S.bike = true; if (it.id === 'bigbike') S.bigbike = true; if (it.id === 'petfood') { S.inv.petfood = (S.inv.petfood || 0) + 7; delete S.inv.items.petfood; } }
    else if (it.kind === 'pet') { S.pet = { name: 'น้องโมจิ', joy: 70, since: G.day() }; }
    else if (it.kind === 'furn') G.deliverFurniture(it.type, opts.tier || 0);
    G.applyEff({ happy: 1 });
    emit('bought', it);
    return true;
  };
  G.deliverFurniture = function (type, tier) {
    const T = D.FURN_TYPES[type];
    let id; do { id = 'f' + (S.nextId++); } while (S.home.furn.some(f => f.id === id));
    S.home.furn.push({ id, type, tier, placed: false, state: {} });
    toast(`${T.name}ส่งถึงบ้านแล้ว · อยู่ในคลัง กด "ตกแต่ง" ตอนอยู่ในบ้านเพื่อจัดวาง`, 'good');
    emit('home');
  };
  // ย้ายข้อมูลบ้านจากเซฟรุ่นก่อน (เฟอร์นิเจอร์ติดตั้งตายตัว) → ระบบจัดวางอิสระ โดยรักษาระดับคุณภาพที่ผู้เล่นซื้อไว้
  // ย้ายข้อมูลบ้านจากเซฟรุ่นก่อน โดยไม่รีเซ็ตบ้านที่ผู้เล่นจัดเองแล้ว
  //  - เซฟรุ่นเก่ามาก (เฟอร์นิเจอร์ติดตั้งตายตัว) หรือบ้านที่ยังเป็นแปลนเริ่มต้นรุ่นก่อน → จัดบ้านอัตโนมัติด้วยแปลนใหม่ (รักษาระดับคุณภาพที่ซื้อไว้)
  //  - บ้านที่ผู้เล่นเคยจัดเอง → คงตำแหน่งเดิม เปลี่ยนเป็นภาพชุดใหม่ ชิ้นที่ภาพใหม่ใหญ่ขึ้นจนวางไม่ได้จะถูกเก็บเข้าคลังโดยแจ้งให้ทราบ (ตรวจตอนเข้าบ้าน)
  const LAYOUT_VER = 5;
  function layoutFrom(rows, old) {
    const pool = (old || []).slice(), out = [];
    rows.forEach((r, i) => {
      const k = pool.findIndex(f => f.type === r[0]); const same = k >= 0 ? pool.splice(k, 1)[0] : null;
      out.push({ id: same ? same.id : 'h' + (i + 1), type: r[0], tier: same ? same.tier || 0 : 0, placed: true, x: r[1], y: r[2], flip: !!r[3], state: (same && same.state) || {} });
    });
    const used = new Set(out.map(f => f.id));
    for (const f of pool) { let id = f.id; while (used.has(id)) id = 'f' + (S.nextId++); used.add(id); out.push(Object.assign({}, f, { id, placed: false, state: f.state || {} })); }
    return out;
  }
  G.migrateHome = function () {
    if (S.settings && S.settings.sound == null) S.settings.sound = true;
    for (const id of Object.keys(D.NPCS)) if (!S.rel[id]) S.rel[id] = { v: 0, met: false, greetDay: 0, talkDay: 0, talks: 0 }; // NPC ใหม่
    const h = S.home; if (!h || h.layout === LAYOUT_VER) return false;
    if (h.layout === 3 || h.layout === 4) {
      // ย้ายเข้าบ้านหลังใหม่ (โครงสร้างบ้านเปลี่ยน ตำแหน่งเดิมใช้ไม่ได้): จัดบ้านใหม่ตามแปลน รักษาระดับคุณภาพ ชิ้นที่เกินเข้าคลัง
      let refund = 0; const keep = [];
      for (const f of h.furn || []) { if (D.FURN_TYPES[f.type]) keep.push(f); else refund += Math.round((D.FURN_BASE_PRICE[f.type] || 500) * D.TIERS[f.tier || 0].mult * .5); }
      h.furn = layoutFrom(D.HOME_LAYOUT, keep); delete h.needsCheck; delete h.edited;
      if (refund) { S.money.bank += refund; setTimeout(() => toast('ย้ายเข้าบ้านหลังใหม่ · คืนเงินของติดผนังรุ่นเก่า ' + fmt(refund) + ' เข้าบัญชี', 'good'), 800); }
      setTimeout(() => toast('ย้ายเข้าบ้านหลังใหม่แล้ว · เฟอร์นิเจอร์ถูกจัดตามแปลนใหม่ ชิ้นที่เหลือเก็บไว้ในคลัง', 'good'), 1200);
      h.layout = LAYOUT_VER; return true;
    }
    if (h.layout === 99) {
      const def = D.HOME_LAYOUT_V3, placed = h.furn.filter(f => f.placed);
      const untouched = !h.edited && placed.length === def.length && def.every(r => placed.some(f => f.type === r[0] && f.x === r[1] && f.y === r[2]));
      if (untouched) h.furn = layoutFrom(D.HOME_LAYOUT, h.furn);
      else h.needsCheck = true; // ตรวจชนตอนเข้าบ้าน
      h.layout = LAYOUT_VER; return true;
    }
    // เซฟรุ่นเก่ามาก
    const old = (h.furn || []).slice();
    let refund = 0;
    for (const f of old) if (!D.FURN_TYPES[f.type] && !f.fixed) refund += Math.round((D.FURN_BASE_PRICE[f.type] || 1000) * D.TIERS[f.tier || 0].mult * .5);
    const keep = old.filter(f => D.FURN_TYPES[f.type]).map(f => ({ id: f.id, type: f.type, tier: f.tier || 0, state: {} }));
    if (refund) S.money.bank += refund;
    Object.assign(h, { id: h.id || 'home1', name: h.name || 'บ้านของฉัน', layout: LAYOUT_VER, city: { scene: 'street', spot: 'home' }, furn: layoutFrom(D.HOME_LAYOUT, keep) });
    if (refund) setTimeout(() => toast('ปรับปรุงบ้านใหม่ · คืนเงินค่าเฟอร์นิเจอร์รุ่นเก่า ' + fmt(refund) + ' เข้าบัญชี', 'good'), 800);
    return true;
  };
  G.bestFurn = type => S.home.furn.filter(f => f.type === type && f.placed).sort((a, b) => b.tier - a.tier)[0] || null;
  G.furnQ = type => { const f = G.bestFurn(type); return f ? D.TIERS[f.tier].q : 0; };

  // ---------------- รถ ----------------
  G.buyCar = function (id, finance) {
    const c = D.CARS[id];
    if (S.car) return toast('มีรถอยู่แล้ว ขายคันเดิมก่อนที่หน้าโชว์รูม', 'warn');
    if (finance) {
      const down = Math.round(c.price * .25);
      if (!G.pay(down, `เงินดาวน์${c.name}`, 'รถ')) return false;
      const principal = c.price - down, months = 60;
      const inst = Math.round(principal * (1 + .028 * 5) / months);
      S.debts.push({ id: 'car', name: 'ผ่อนรถ ' + c.name, bal: principal * (1 + .028 * 5), rate: 0, fixed: inst });
      S.car = { id, cond: 100, value: c.price * .9, loan: true, km: 0 };
      toast(`ออกรถ${c.name}แล้ว! ผ่อนเดือนละ ${fmt(inst)} 60 งวด`, 'good');
    } else {
      if (!G.pay(c.price, `ซื้อ${c.name} (เงินสด)`, 'รถ')) return false;
      S.car = { id, cond: 100, value: c.price * .9, loan: false, km: 0 };
      toast(`ซื้อ${c.name}แล้ว! ขับไปทำงานหรือรับงานขับรถได้`, 'good');
    }
    G.addXP('drive', 5); G.applyEff({ happy: 15 }); emit('money', 0); return true;
  };
  G.sellCar = function () {
    if (!S.car) return;
    const loan = S.debts.find(d => d.id === 'car');
    const net = S.car.value * (S.car.cond / 100 * .3 + .7) - (loan ? loan.bal : 0);
    if (loan) S.debts = S.debts.filter(d => d !== loan);
    G.earn(net, 'ขายรถ ' + D.CARS[S.car.id].name + (loan ? ' (หักยอดผ่อนคงเหลือ)' : ''), 'รถ');
    S.car = null; toast('ขายรถแล้ว ได้รับสุทธิ ' + fmt(net), net >= 0 ? 'good' : 'bad');
  };
  G.repairCar = function () {
    if (!S.car) return;
    const cost = Math.round((100 - S.car.cond) * 95 * (has('careful') ? .85 : 1));
    if (cost < 50) return toast('รถอยู่ในสภาพดีแล้ว', 'good');
    if (!G.pay(cost, 'ซ่อมบำรุงรถ', 'รถ')) return;
    S.car.cond = 100; toast('ซ่อมรถเรียบร้อย สภาพ 100%', 'good');
  };
  G.driveCost = km => S.car ? km * D.CARS[S.car.id].fuel : 0;
  G.useCar = function (km) { if (!S.car) return; S.car.cond = clamp(S.car.cond - km * .14); S.car.km += km; G.addXP('drive', km * .6); };

  // ---------------- การเดินทาง ----------------
  G.travelOptions = function (km) {
    const opts = [{ id: 'walk', name: 'เดิน', icon: '🚶', mins: Math.round(km / 4.5 * 60), cost: 0, eff: { energy: -km * 3, health: km * .6 } },
      { id: 'bus', name: 'รถโดยสาร', icon: '🚌', mins: Math.round(12 + km / 20 * 60), cost: 15, eff: { energy: -2 } }];
    if (S.bike) opts.push({ id: 'bike', name: 'สกู๊ตเตอร์ไฟฟ้า', icon: '🛵', mins: Math.round(km / 26 * 60 + 2), cost: Math.round(km * .35), eff: {}, ride: true });
    if (S.bigbike) opts.push({ id: 'bigbike', name: 'บิ๊กไบค์', icon: '🏍️', mins: Math.round(km / 34 * 60 + 2), cost: Math.round(km * 1.4), eff: { happy: 2 }, ride: true });
    if (S.car) opts.push({ id: 'car', name: 'รถส่วนตัว', icon: '🚗', mins: Math.round(km / 30 * 60 + 4), cost: Math.round(G.driveCost(km)), eff: { stress: -1 }, car: true, disabled: S.car.cond < 10 ? 'รถสภาพแย่เกินไป ต้องซ่อมก่อน' : null });
    return opts;
  };
  G.lastPlace = () => S.player.place || 'home';

  // ---------------- งาน ----------------
  const jobMul = () => (has('diligent') ? 1.1 : weak('diligent') ? .95 : 1);
  G.jobMul = jobMul;
  G.applyOffice = function () {
    if (S.jobs.office) return toast('คุณเป็นพนักงานบริษัทอยู่แล้ว', 'warn');
    if (S.jobs.career) return toast('ต้องลาออกจากงาน' + D.CAREERS[S.jobs.career.id].name + 'ก่อน (ทำงานประจำได้ทีละงาน)', 'warn');
    S.jobs.office = { level: 0, perf: 0, days: 0, hire: G.day(), workedMin: 0, workedDay: 0, late: 0 };
    toast('ได้งานแล้ว! ตำแหน่ง ' + D.JOBS.office.levels[0].title + ' เริ่มงานจันทร์–ศุกร์ 09:00 ที่ออฟฟิศ', 'good');
    emit('job');
  };
  G.quitOffice = function () { if (!S.jobs.office) return; const o = S.jobs.office; payOffice(true); S.jobs.office = null; toast('ลาออกแล้ว ได้รับเงินเดือนตามวันที่ทำงาน', 'warn'); emit('job'); void o; };
  G.officeOpenNow = () => { const h = G.hour(); return !G.isWeekend() && h >= 7 && h < 19; };
  function payOffice(final) {
    const o = S.jobs.office; if (!o) return;
    const L = D.JOBS.office.levels[o.level];
    const gross = Math.round(L.salary * Math.min(1, o.days / 22) * jobMul());
    if (gross > 0) {
      const sso = Math.min(750, Math.round(gross * .05));
      G.earn(gross, `เงินเดือน ${L.title} (${o.days} วันทำงาน)`, 'รายได้งาน');
      G.pay(sso, 'หักประกันสังคม 5%', 'ภาษี/ประกัน');
      toast(`💰 เงินเดือนเข้า ${fmt(gross)} (หักประกันสังคม ${fmt(sso)})`, 'good');
    } else if (!final) toast('รอบนี้ไม่มีวันทำงาน จึงไม่มีเงินเดือน', 'bad');
    o.days = 0;
    // เลื่อนตำแหน่ง
    const need = (o.level + 1) * 60 * (has('ambitious') ? .8 : 1);
    if (!final && o.level < D.JOBS.office.levels.length - 1 && o.perf >= need && G.skillLv('comm') >= o.level + 1) {
      o.level++; o.perf = 0;
      emit('event', { title: 'เลื่อนตำแหน่ง!', text: `คุณวรรณาแจ้งว่าคุณได้เลื่อนเป็น "${D.JOBS.office.levels[o.level].title}" เงินเดือน ${fmt(D.JOBS.office.levels[o.level].salary)}`, choices: [{ t: 'ขอบคุณมาก!', eff: { happy: 20 } }] });
    }
  }
  // ---------------- งานอาชีพ (ตำรวจ ธนาคาร ช่าง ลูกเรือ นักบิน) ----------------
  // ใช้กติกาเดียวกับงานออฟฟิศ: นับวันทำงาน (กะละ ≥4 ชม.) จ่ายเงินเดือนทุก 30 วันตามสัดส่วนวันทำงาน หักประกันสังคม เลื่อนขั้นตามผลงาน+ทักษะ
  G.careerWhy = function (id) {
    const C0 = D.CAREERS[id];
    for (const k in C0.req) if (G.skillLv(k) < C0.req[k]) return `ต้องมีทักษะ${D.SKILLS[k].name}ระดับ ${C0.req[k]} (ตอนนี้ ${G.skillLv(k)})`;
    if (S.jobs.office) return 'ต้องลาออกจากงานออฟฟิศก่อน (ทำงานประจำได้ทีละงาน)';
    if (S.jobs.career && S.jobs.career.id !== id) return 'ต้องลาออกจากงาน' + D.CAREERS[S.jobs.career.id].name + 'ก่อน';
    return null;
  };
  G.applyCareer = function (id, useLoan) {
    const C0 = D.CAREERS[id], why = G.careerWhy(id); if (why) return toast(why, 'bad');
    if (S.jobs.career) return toast('คุณทำงานนี้อยู่แล้ว', 'warn');
    if (C0.fee) {
      if (useLoan && C0.feeLoan) { const e = S.debts.find(x => x.id === 'edu'); if (e) e.bal += C0.fee; else S.debts.push({ id: 'edu', name: 'หนี้การศึกษา', bal: C0.fee, rate: 0.0017, min: 1500 }); toast('เพิ่มค่าเรียนเข้าหนี้การศึกษา ' + fmt(C0.fee), 'warn'); }
      else if (!G.pay(C0.fee, 'ค่าอบรม/ค่าเรียน: ' + C0.name, 'การศึกษา')) return;
    }
    S.jobs.career = { id, level: 0, perf: 0, days: 0, hire: G.day(), workedDay: 0 };
    toast(`ได้งานแล้ว! ${C0.name} ตำแหน่ง ${C0.levels[0].title} · ${C0.desc}`, 'good'); emit('job');
  };
  function payCareer(final) {
    const c = S.jobs.career; if (!c) return; const C0 = D.CAREERS[c.id], L = C0.levels[c.level];
    const gross = Math.round(L.salary * Math.min(1, c.days / C0.fullDays) * jobMul());
    if (gross > 0) { const sso = Math.min(750, Math.round(gross * .05)); G.earn(gross, `เงินเดือน ${C0.name} · ${L.title} (${c.days} วัน)`, 'รายได้งาน'); G.pay(sso, 'หักประกันสังคม 5%', 'ภาษี/ประกัน'); toast(`💰 เงินเดือน${C0.name}เข้า ${fmt(gross)}`, 'good'); }
    else if (!final) toast('รอบนี้ไม่มีวันทำงาน จึงไม่มีเงินเดือน', 'bad');
    c.days = 0;
    const need = (c.level + 1) * 60 * (has('ambitious') ? .8 : 1);
    if (!final && c.level < C0.levels.length - 1 && c.perf >= need && G.skillLv(C0.skill) >= c.level + 1) {
      c.level++; c.perf = 0; emit('event', { title: 'เลื่อนตำแหน่ง!', text: `คุณได้เลื่อนเป็น "${C0.levels[c.level].title}" เงินเดือน ${fmt(C0.levels[c.level].salary)}`, choices: [{ t: 'ขอบคุณมาก!', eff: { happy: 20 } }] });
    }
  }
  G.quitCareer = function () { if (!S.jobs.career) return; payCareer(true); toast('ลาออกจากงาน' + D.CAREERS[S.jobs.career.id].name + 'แล้ว', 'warn'); S.jobs.career = null; emit('job'); };
  G.careerPromoNeed = () => { const c = S.jobs.career; return c ? { perf: Math.round((c.level + 1) * 60 * (has('ambitious') ? .8 : 1)), lv: c.level + 1, skill: D.CAREERS[c.id].skill } : null; };
  G.careerNext = function () { const c = S.jobs.career; if (!c) return null; const d = G.day(); const n = 30 - ((d - c.hire) % 30); return d + (n === 30 ? 30 : n); };
  // กะงานที่เริ่มได้ตอนนี้
  G.careerShiftNow = function () {
    const c = S.jobs.career; if (!c) return null; const C0 = D.CAREERS[c.id], h = G.hour() + G.minute() / 60, wd = G.weekday();
    if (C0.weekdays && wd >= 5) return { why: 'วันหยุด (ทำงานจันทร์–ศุกร์)' };
    if (C0.noSunday && wd === 6) return { why: 'วันอาทิตย์อู่ปิด' };
    if (c.workedDay === G.day()) return { why: 'วันนี้ทำงานครบแล้ว' };
    for (const s of C0.start) if (h >= s - 1 && h <= s + 1) {
      const mins = C0.flight ? Math.round(G.rnd(C0.flight[0], C0.flight[1])) * 60 : C0.shift * 60;
      return { mins, night: s >= 20, late: h > s + .25 };
    }
    return { why: 'นอกเวลาเข้างาน · เข้างานได้ ' + C0.start.map(s => `${String(Math.floor(s)).padStart(2, '0')}:${s % 1 ? '30' : '00'}`).join(' หรือ ') + ' (ก่อน/หลังได้ 1 ชม.)' };
  };
  G.careerWorked = function (minutes, sh) {
    const c = S.jobs.career; if (!c) return; const C0 = D.CAREERS[c.id];
    c.perf += minutes / 60 * (1 + G.skillLv(C0.skill) / 10) * (has('diligent') ? 1.15 : 1) * (sh && sh.late ? .8 : 1);
    G.addXP(C0.skill, minutes / 60 * 9); G.addXP(C0.skill2, minutes / 60 * 5);
    if (minutes >= 240 && c.workedDay !== G.day()) { c.workedDay = G.day(); c.days++; }
    if (sh && sh.night) G.earn(Math.round(C0.levels[c.level].salary / C0.fullDays * .15), 'เบี้ยกะดึก', 'รายได้งาน');
    if (C0.tipRange) { const t = Math.round(G.rnd(C0.tipRange[0], C0.tipRange[1]) * (1 + G.skillLv('tech') * .08)); G.earn(t, 'ค่าคอมมิชชันงานซ่อม', 'รายได้งาน', 'cash'); }
    emit('job');
  };
  G.officeNext = function () { const o = S.jobs.office; if (!o) return null; const d = G.day(); const n = 30 - ((d - o.hire) % 30); return d + (n === 30 ? 30 : n); };
  G.officePromoNeed = () => { const o = S.jobs.office; return o ? { perf: Math.round((o.level + 1) * 60 * (has('ambitious') ? .8 : 1)), comm: o.level + 1 } : null; };
  G.refreshGigs = refreshGigs;
  function refreshGigs() {
    const pool = D.FREELANCE_GIGS.slice().sort(() => Math.random() - .5);
    S.jobs.gigs = pool.slice(0, 4).map(g => Object.assign({}, g, { pay: Math.round(g.pay * rnd(.85, 1.2) / 10) * 10 }));
    S.jobs.gigsDay = G.day();
  }
  G.gigPay = g => Math.round(g.pay * jobMul() * (g.creative && has('creative') ? 1.15 : g.creative && weak('creative') ? .92 : 1) * (1 + G.skillLv(g.skill) * .04));
  G.rideOffers = function () {
    const spots = ['ย่านร้านค้ามุมสวน', 'ออฟฟิศใบไม้', 'สถานีรถไฟริมน้ำ', 'ชายหาด', 'สวนสาธารณะ', 'หมู่บ้านต้นไม้', 'โรงพยาบาลเมือง', 'ห้างกลางเมือง'];
    return [1, 2, 3].map(() => { const a = pick(spots); let b = pick(spots); while (b === a) b = pick(spots); const km = Math.round(rnd(2, 16) * 10) / 10; const fare = Math.round((35 + km * 9.5) * (1 + G.skillLv('drive') * .03) * jobMul()); return { a, b, km, fare, mins: Math.round(km * 3 + rnd(6, 14)), fuel: Math.round(G.driveCost(km * 1.3)) }; });
  };
  G.deliveryOffers = function (mode) {
    const from = ['คาเฟ่มุมสวน', 'ร้านข้าวมันไก่', 'ซูเปอร์ฯ ต้นไม้', 'ร้านยาใบเตย', 'ร้านก๋วยเตี๋ยวเรือ', 'ร้านพัสดุกลางเมือง'];
    const sp = { walk: [13, 1], bike: [4, 1.15], car: [3.3, 1.25] }[mode];
    return [1, 2, 3].map(() => { const km = Math.round(rnd(.8, mode === 'walk' ? 2.5 : 6.5) * 10) / 10; return { a: pick(from), km, pay: Math.round((28 + km * 8) * sp[1] * jobMul()), mins: Math.round(km * sp[0] + 6), fuel: mode === 'car' ? Math.round(G.driveCost(km * 1.6)) : mode === 'bike' ? Math.round(km * .5) : 0, mode }; });
  };

  // ---------------- ความสัมพันธ์ ----------------
  G.relLabel = v => v >= 90 ? 'คนพิเศษ' : v >= 60 ? 'เพื่อนสนิท' : v >= 30 ? 'เพื่อน' : v >= 10 ? 'คนรู้จัก' : v <= -20 ? 'ไม่ถูกกัน' : 'คนแปลกหน้า';
  G.addRel = function (id, d) {
    const r = S.rel[id]; if (!r) return;
    if (d > 0) d *= has('social') ? 1.35 : weak('social') ? .85 : 1;
    const before = G.relLabel(r.v);
    r.v = clamp(r.v + d, -100, 100); r.met = true;
    const after = G.relLabel(r.v);
    if (after !== before) toast(`ความสัมพันธ์กับ${D.NPCS[id].name}: ${after}`, d > 0 ? 'good' : 'bad');
    emit('rel');
  };

  // ---------------- หุ้น ----------------
  G.tradeFee = v => Math.max(10, v * (has('risky') ? .0008 : weak('risky') ? .0025 : .0015));
  G.buyStock = function (id, q) {
    q = Math.floor(q); if (!(q > 0)) return toast('กรอกจำนวนหุ้นที่จะซื้อ', 'bad');
    const p = S.stocks.price[id], v = p * q, fee = G.tradeFee(v);
    if (!G.pay(v + fee, `ซื้อหุ้น ${id} ${q} หุ้น @${p.toFixed(2)} (ค่าธรรมเนียม ${fee.toFixed(0)})`, 'ลงทุน')) return;
    const h = S.stocks.hold[id] = S.stocks.hold[id] || { q: 0, cost: 0 };
    h.cost += v + fee; h.q += q; G.addXP('finance', 3);
    toast(`ซื้อ ${id} ${q} หุ้น รวม ${fmt(v + fee)}`, 'good'); emit('money', 0);
  };
  G.sellStock = function (id, q) {
    const h = S.stocks.hold[id]; q = Math.floor(q);
    if (!h || !(q > 0)) return toast('กรอกจำนวนหุ้นที่จะขาย', 'bad');
    if (q > h.q) return toast(`มีหุ้น ${id} อยู่ ${h.q} หุ้นเท่านั้น`, 'bad');
    const p = S.stocks.price[id], v = p * q, fee = G.tradeFee(v);
    const costPart = h.cost * q / h.q; const pl = v - fee - costPart;
    h.cost -= costPart; h.q -= q; if (!h.q) delete S.stocks.hold[id];
    G.earn(v - fee, `ขายหุ้น ${id} ${q} หุ้น @${p.toFixed(2)} (${pl >= 0 ? 'กำไร' : 'ขาดทุน'} ${fmt(pl)})`, 'ลงทุน');
    G.addXP('finance', 3); toast(`ขาย ${id} ได้ ${fmt(v - fee)} · ${pl >= 0 ? 'กำไร' : 'ขาดทุน'} ${fmt(pl)}`, pl >= 0 ? 'good' : 'bad');
  };
  G.nextDividend = function (s) {
    if (!s.divYield) return null;
    const d = G.day();
    if (s.divFreq === 'month') { for (let x = d; x < d + 31; x++) if (G.dom(x) === 15) return x; }
    for (let x = d; x < d + 400; x++) if (G.dom(x) === 15 && G.month(x) % 6 === 0) return x;
    return null;
  };
  function stockTick(hours) {
    for (const s of D.STOCKS) {
      const p = S.stocks.price[s.id];
      const r = s.drift / 365 / 24 * hours + s.vol * Math.sqrt(hours / 24) * gauss() * .9;
      S.stocks.price[s.id] = Math.max(.5, p * Math.exp(r));
    }
  }

  // ---------------- อสังหา/ธุรกิจ ----------------
  G.buyProp = function (id) {
    const P = D.PROPERTIES.find(x => x.id === id);
    if (S.props.find(p => p.id === id)) return toast('มีสินทรัพย์นี้แล้ว', 'warn');
    if (!G.pay(P.price, 'ซื้อ' + P.name, 'ลงทุน')) return;
    S.props.push({ id, day: G.day(), occ: true, repairs: 0 }); G.addXP('finance', 10);
    toast(`ซื้อ${P.name}แล้ว ค่าเช่าจะเข้าวันที่ 1 ของทุกเดือน`, 'good');
  };
  G.sellProp = function (id) {
    const p = S.props.find(x => x.id === id); if (!p) return;
    const v = G.propValue(p) * rnd(.94, 1.03);
    S.props = S.props.filter(x => x !== p);
    G.earn(v, 'ขาย' + D.PROPERTIES.find(x => x.id === id).name, 'ลงทุน');
    toast('ขายได้ ' + fmt(v), 'good');
  };
  G.buyHouse = function () {
    if (S.home.owned) return;
    if (!G.pay(450000, 'เงินดาวน์ซื้อบ้าน', 'ที่พัก')) return;
    S.home.owned = true; S.home.mortgage = true;
    S.debts.push({ id: 'mortgage', name: 'ผ่อนบ้าน', bal: 1350000, rate: .005, fixed: 9700 });
    S.goals.done.house = G.day();
    emit('event', { title: 'บ้านของตัวเอง!', text: 'คุณซื้อบ้านหลังนี้แล้ว ไม่ต้องจ่ายค่าเช่าอีกต่อไป ผ่อนบ้านเดือนละ ฿9,700', choices: [{ t: 'เย้!', eff: { happy: 30, stress: -10 } }] });
  };
  G.startBiz = function (type) {
    if (S.biz) return toast('มีธุรกิจอยู่แล้ว', 'warn');
    const B = D.BUSINESSES[type];
    if (!G.pay(B.cost, 'เปิดกิจการ ' + B.name, 'ธุรกิจ')) return;
    S.biz = { type, staff: [], upgrades: [], sat: 60, hist: [], profitTotal: 0, value: B.cost * .6, opened: G.day(), ownerDay: 0 };
    G.addXP('sales', 10);
    toast(`เปิด${B.name}แล้ว! จ้างพนักงานให้ครบ ${B.staffNeed} คนเพื่อให้ร้านเดินเองได้`, 'good');
  };
  G.hire = function (i) {
    if (!S.biz) return; const st = D.STAFF_POOL[i];
    if (S.biz.staff.find(x => x.name === st.name)) return;
    S.biz.staff.push(Object.assign({ shift: S.biz.staff.length % 2 ? 'บ่าย 13:00–21:00' : 'เช้า 07:00–15:00' }, st));
    toast(`จ้าง${st.name} ค่าจ้างวันละ ${fmt(st.wage)}`, 'good');
  };
  G.fire = function (name) { if (!S.biz) return; S.biz.staff = S.biz.staff.filter(x => x.name !== name); toast(`เลิกจ้าง${name}แล้ว`, 'warn'); };
  G.toggleShift = function (name) { const s = S.biz && S.biz.staff.find(x => x.name === name); if (s) s.shift = s.shift.startsWith('เช้า') ? 'บ่าย 13:00–21:00' : 'เช้า 07:00–15:00'; };
  G.bizUpgrade = function (id) {
    const U = D.BIZ_UPGRADES.find(u => u.id === id); if (!S.biz || S.biz.upgrades.includes(id)) return;
    if (!G.pay(U.cost, 'อัปเกรดธุรกิจ: ' + U.name, 'ธุรกิจ')) return;
    S.biz.upgrades.push(id); S.biz.value += U.cost * .5; toast('ติดตั้ง ' + U.name + ' แล้ว', 'good');
  };
  G.sellBiz = function () { if (!S.biz) return; const v = S.biz.value; G.earn(v, 'ขายกิจการ ' + D.BUSINESSES[S.biz.type].name, 'ธุรกิจ'); S.biz = null; toast('ขายกิจการได้ ' + fmt(v), 'warn'); };
  function bizDay(day) {
    const b = S.biz; if (!b) return;
    const B = D.BUSINESSES[b.type];
    const up = k => b.upgrades.reduce((a, id) => a + (D.BIZ_UPGRADES.find(u => u.id === id).eff[k] || 0), 0);
    const owner = b.ownerDay === day - 1 ? 1 : 0;
    const crew = b.staff.length + owner;
    const staffSkill = b.staff.reduce((a, s) => a + s.skill, 0) + owner * (1 + G.skillLv('sales') * .05);
    const ratio = Math.min(1.15, staffSkill / B.staffNeed);
    const wk = G.weekday(day - 1) >= 5 ? 1.25 : 1;
    let cust = crew ? B.baseCust * (1 + up('cust')) * (.5 + b.sat / 100 * .9) * ratio * wk * rnd(.8, 1.2) * (has('risky') ? 1.05 : 1) * (1 + up('speed')) : 0;
    cust = Math.round(cust);
    const rev = cust * B.ticket, cogs = rev * B.cogs, wages = b.staff.reduce((a, s) => a + s.wage, 0), rent = B.rent / 30;
    const profit = Math.round(rev - cogs - wages - rent);
    b.sat = clamp(b.sat + (ratio - .85) * 6 + up('sat') * 4 - rnd(0, 2.5) + (crew ? 0 : -3));
    b.hist.push({ day: day - 1, cust, rev: Math.round(rev), cogs: Math.round(cogs), wages, rent: Math.round(rent), profit, sat: Math.round(b.sat) });
    if (b.hist.length > 60) b.hist.shift();
    b.profitTotal += profit;
    if (profit >= 0) G.earn(profit, `กำไรสุทธิ${B.name} (ลูกค้า ${cust} คน)`, 'ธุรกิจ');
    else bill(-profit, `ขาดทุน${B.name} (ค่าแรง/ค่าเช่า)`, 'ธุรกิจ');
    b.value = Math.max(B.cost * .3, b.value * (profit > 0 ? 1.002 : .997));
  }

  // ---------------- เป้าหมาย ----------------
  G.goalProgress = function (id) {
    const fixed = G.fixedTotal();
    switch (id) {
      case 'emergency': return [S.money.savings / (fixed * 3), `${fmt(S.money.savings)} / ${fmt(fixed * 3)}`];
      case 'freedom': { const p = G.passiveTotal(); return [p / fixed, `รายได้สินทรัพย์ ${fmt(p)}/เดือน เทียบค่าใช้จ่ายประจำ ${fmt(fixed)}/เดือน`]; }
      case 'nodebt': { const t = G.debtTotal(); return [t <= 0 ? 1 : Math.max(0, 1 - t / 45000), t <= 0 ? 'ไม่มีหนี้แล้ว' : `หนี้คงเหลือ ${fmt(t)}`]; }
      case 'house': return [S.home.owned ? 1 : G.liquid() / 450000, S.home.owned ? 'เป็นเจ้าของบ้านแล้ว' : `มีเงินพร้อมใช้ ${fmt(G.liquid())} / เงินดาวน์ ${fmt(450000)}`];
      case 'skill': { const m = Math.max(...Object.keys(D.SKILLS).map(G.skillLv)); return [m / 6, `ทักษะสูงสุดระดับ ${m} / 6`]; }
      case 'business': return [S.biz ? Math.max(0, S.biz.profitTotal) / 50000 : 0, S.biz ? `กำไรสะสม ${fmt(S.biz.profitTotal)} / ${fmt(50000)}` : 'ยังไม่ได้เปิดธุรกิจ'];
      case 'family': { const best = Math.max(...Object.values(S.rel).map(r => r.v)); return [S.family ? 1 : best / 90, S.family ? `ใช้ชีวิตคู่กับ${D.NPCS[S.family].name}` : `ความสัมพันธ์สูงสุด ${Math.round(best)} / 90`]; }
      case 'happy': { const h = S.happyHist.slice(-7), st = S.stressHist.slice(-7); const ah = h.length ? h.reduce((a, b) => a + b, 0) / h.length : 0; const as = st.length ? st.reduce((a, b) => a + b, 0) / st.length : 100; return [h.length < 7 ? Math.min(.99, ah / 70 * h.length / 7) : (ah >= 70 && as < 30 ? 1 : Math.min(.99, ah / 70)), `ความสุขเฉลี่ย ${Math.round(ah)} · ความเครียดเฉลี่ย ${Math.round(as)} (${h.length}/7 วัน)`]; }
    }
    return [0, ''];
  };
  function checkGoals() {
    for (const id of S.goals.active) {
      if (S.goals.done[id]) continue;
      const [p] = G.goalProgress(id);
      if (p >= 1) {
        S.goals.done[id] = G.day();
        const g = D.GOALS.find(x => x.id === id);
        emit('event', { title: '🎉 สำเร็จเป้าหมาย: ' + g.name, text: g.desc + ' — เลือกเป้าหมายใหม่ได้ที่เมนู "เป้าหมาย"', choices: [{ t: 'ภูมิใจมาก!', eff: { happy: 25, stress: -10 } }] });
      }
    }
  }

  // ---------------- รอบเวลา ----------------
  function onHour(h) {
    stockTick(1);
    if (S.biz) S.biz.value = S.biz.value;
    // เหตุการณ์สุ่ม
    if (!G.activity && h >= 8 && h <= 21 && S.lastEventDay !== G.day() && Math.random() < .045) triggerEvent();
    if (h % 2 === 0) G.save(true);
    emit('hour', h);
  }
  function onDay(d) {
    const n = S.player.needs;
    S.happyHist.push(Math.round(n.happy)); S.stressHist.push(Math.round(n.stress));
    if (S.happyHist.length > 30) { S.happyHist.shift(); S.stressHist.shift(); }
    S.home.clean = clamp(S.home.clean - 5);
    // หุ้น: เก็บราคาปิด
    for (const s of D.STOCKS) { const h = S.stocks.hist[s.id]; h.push(S.stocks.price[s.id]); if (h.length > 90) h.shift(); }
    // ธุรกิจ
    bizDay(d);
    // ปันผล
    if (G.dom(d) === 15) for (const s of D.STOCKS) {
      const h = S.stocks.hold[s.id]; if (!h || !h.q || !s.divYield) continue;
      const due = s.divFreq === 'month' || (s.divFreq === 'half' && G.month(d) % 6 === 0);
      if (!due) continue;
      const per = s.divFreq === 'month' ? 12 : 2;
      const gross = h.q * S.stocks.price[s.id] * s.divYield / per * rnd(.85, 1.1);
      G.earn(gross * .9, `ปันผล ${s.id} ${h.q} หุ้น (หักภาษี 10%)`, 'ปันผล');
      toast(`💵 ได้ปันผล ${s.id} ${fmt(gross * .9)}`, 'good');
    }
    // สัตว์เลี้ยง
    if (S.pet) {
      if ((S.inv.petfood || 0) > 0) S.inv.petfood--;
      else bill(50, 'ค่าอาหารน้องหมา', 'สัตว์เลี้ยง');
      S.pet.joy = clamp(S.pet.joy - 8);
    }
    // ออฟฟิศ: ขาดงาน
    const o = S.jobs.office;
    if (o) {
      const prev = d - 1;
      if (G.weekday(prev) < 5 && o.workedDay !== prev && prev >= o.hire) { o.perf = Math.max(0, o.perf - 4); toast('เมื่อวานไม่ได้ไปทำงาน ผลงานลดลง', 'bad'); }
      if ((d - o.hire) % 30 === 0 && d > o.hire) payOffice(false);
    }
    const cj = S.jobs.career;
    if (cj && (d - cj.hire) % 30 === 0 && d > cj.hire) payCareer(false);
    // งานฟรีแลนซ์ใหม่ทุก 2 วัน
    if (d - S.jobs.gigsDay >= 2) refreshGigs();
    // รายเดือน (วันที่ 1)
    if (G.dom(d) === 1 && d > 1) monthly(d);
    // เหตุการณ์ที่รอผล
    for (const p of S.pending.filter(p => p.day <= d)) {
      if (p.kind === 'gamble') {
        if (Math.random() < p.p) { G.earn(p.win, p.desc + ' (ได้ผลตอบแทน)', 'ลงทุน'); emit('event', { title: 'ผลการร่วมลงทุน', text: `ร้านออนไลน์ของเพื่อนไปได้สวย คุณได้รับ ${fmt(p.win)}`, choices: [{ t: 'ดีใจด้วยกัน', eff: { happy: 15 } }] }); }
        else emit('event', { title: 'ผลการร่วมลงทุน', text: 'ร้านออนไลน์ของเพื่อนปิดตัว เงินลงทุนหายทั้งหมด เป็นบทเรียนเรื่องความเสี่ยง', choices: [{ t: 'เข้าใจแล้ว', eff: { happy: -8, stress: 8 }, xp: ['finance', 15] }] });
      }
    }
    S.pending = S.pending.filter(p => p.day > d);
    if (S.car) S.car.value *= .9995;
    checkGoals();
    emit('day', d);
  }
  function monthly(d) {
    if (!S.home.owned) bill(D.RENT, 'ค่าเช่าบ้านรายเดือน', 'ที่พัก');
    bill(D.UTIL + Math.round(rnd(-200, 300)) + (S.home.furn.some(f => f.type === 'washer') ? 120 : 0), 'ค่าน้ำค่าไฟ', 'สาธารณูปโภค');
    bill(D.PHONE_BILL, 'ค่าโทรศัพท์และอินเทอร์เน็ต', 'สาธารณูปโภค');
    if (S.family) bill(3000, 'ค่าใช้จ่ายครอบครัว', 'ครอบครัว');
    if (S.car) bill(D.CARS[S.car.id].upkeep, 'ประกันและบำรุงรักษารถ', 'รถ');
    // หนี้: ดอกเบี้ย + ชำระขั้นต่ำ
    for (const dt of S.debts.slice()) {
      const interest = dt.bal * dt.rate; dt.bal += interest;
      if (interest > 1) log(`ดอกเบี้ย${dt.name} ${fmt(interest)} (บวกเข้ายอดหนี้)`, 0, 'หนี้');
      if (dt.id === 'card' && dt.bal > 0) {
        const m = Math.round(debtMin(dt));
        if (G.liquid() >= m) { G.pay(m, 'ชำระขั้นต่ำ' + dt.name, 'หนี้'); dt.bal -= m; }
        else toast('ชำระขั้นต่ำบัตรเครดิตไม่ได้ ยอดหนี้เพิ่มขึ้น', 'bad');
      } else {
        const m = Math.round(Math.min(debtMin(dt), dt.bal));
        if (G.liquid() >= m) { G.pay(m, 'ชำระ' + dt.name + ' งวดเดือน', 'หนี้'); dt.bal -= m; }
        else { bill(m, 'ชำระ' + dt.name + ' งวดเดือน', 'หนี้'); dt.bal -= m; }
      }
      if (dt.bal < 1) { S.debts = S.debts.filter(x => x !== dt); toast(`ปิด${dt.name}แล้ว!`, 'good'); if (dt.id === 'car' && S.car) S.car.loan = false; }
    }
    // อสังหา
    for (const p of S.props) {
      const P = D.PROPERTIES.find(x => x.id === p.id);
      p.occ = Math.random() > P.vacancy;
      if (p.occ) G.earn(P.rent, `ค่าเช่าจาก${P.name}`, 'ค่าเช่ารับ'); else toast(`${P.name} ไม่มีผู้เช่าเดือนนี้`, 'warn');
      bill(P.upkeep, `ค่าส่วนกลาง/บำรุง ${P.name}`, 'ลงทุน');
      if (Math.random() < .08) { const c = Math.round(P.rent * rnd(.4, 1.6)); bill(c, `ซ่อมแซม${P.name}`, 'ลงทุน'); toast(`${P.name} ต้องซ่อมแซม ${fmt(c)}`, 'bad'); }
    }
    // ดอกเบี้ยเงินออม
    if (S.money.savings > 0) { const i = S.money.savings * .015 / 12; S.money.savings += i; log('ดอกเบี้ยบัญชีออมทรัพย์', i, 'ดอกเบี้ยรับ', 'ออมทรัพย์'); }
    toast(`📅 เริ่มเดือนที่ ${G.month(d)} · ตัดค่าใช้จ่ายประจำเดือนแล้ว ดูรายละเอียดที่หน้าการเงิน`, 'warn');
  }

  // ---------------- เหตุการณ์สุ่ม ----------------
  function triggerEvent(force) {
    let pool = D.EVENTS.filter(e => !e.need || (e.need === 'car' && S.car) || (e.need === 'job' && (S.jobs.office || S.jobs.gigsDone)) || (e.need === 'office' && S.jobs.office));
    const bad = ['car_break', 'sick', 'appliance', 'phone_crack'];
    const careF = has('careful') ? .6 : weak('careful') ? 1.3 : 1;
    if (S.buffs.vitamin && S.buffs.vitamin >= G.day()) pool = pool.filter(e => e.id !== 'sick');
    const w = pool.map(e => (bad.includes(e.id) ? careF : 1) * (e.id === 'car_break' && S.car ? (1.6 - S.car.cond / 100) : 1));
    let r = Math.random() * w.reduce((a, b) => a + b, 0), ev = pool[0];
    for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) { ev = pool[i]; break; } }
    if (force) ev = D.EVENTS.find(e => e.id === force) || ev;
    S.lastEventDay = G.day();
    emit('event', Object.assign({ random: true }, ev));
  }
  G.triggerEvent = triggerEvent;
  // ผลของตัวเลือก
  G.resolveChoice = function (ev, c) {
    const out = [];
    if (c.money < 0) { if (!G.pay(-c.money, ev.title + ': ' + c.t, eventCat(ev))) { if (ev.random) { bill(-c.money, ev.title + ': ' + c.t, eventCat(ev)); out.push('จ่ายผ่านบัตรเครดิต'); } else return null; } else out.push(`จ่าย ${fmt(-c.money)}`); }
    if (c.money > 0) { G.earn(c.money, ev.title, ev.id === 'job_offer' ? 'รายได้งาน' : 'รายได้อื่น'); out.push(`ได้รับ ${fmt(c.money)}`); }
    if (c.eff) { G.applyEff(c.eff); out.push(Object.entries(c.eff).map(([k, v]) => `${NEEDS[k]} ${v > 0 ? '+' : ''}${Math.round(v)}`).join(' · ')); }
    if (c.mins) { G.advance(c.mins); out.push(`ใช้เวลา ${c.mins >= 60 ? (c.mins / 60).toFixed(c.mins % 60 ? 1 : 0) + ' ชั่วโมง' : c.mins + ' นาที'}`); }
    if (c.car != null && S.car) { S.car.cond = clamp(S.car.cond + c.car); out.push(`สภาพรถ ${Math.round(S.car.cond)}%`); }
    if (c.skill) G.addXP(c.skill[0], c.skill[1] * 10);
    if (c.xp) G.addXP(c.xp[0], c.xp[1]);
    if (c.gamble) { S.pending.push({ kind: 'gamble', day: G.day() + c.gamble.delayDays, p: c.gamble.p, win: c.gamble.win, desc: 'ร่วมลงทุนร้านออนไลน์' }); out.push(`รอผลอีก ${c.gamble.delayDays} วัน`); }
    if (c.lottery) {
      let win = 0, big = 0;
      for (let i = 0; i < c.lottery; i++) { const r = Math.random(); if (r < 1 / 2000) { win += 300000; big++; } else if (r < 1 / 2000 + 1 / 20) win += 2000; }
      if (win) { G.earn(win, `ถูกลอตเตอรี่ในเกม${big ? ' รางวัลใหญ่!' : ''}`, 'รายได้อื่น'); out.push(big ? `🎉 ถูกรางวัลใหญ่! ได้ ${fmt(win)}` : `ถูกรางวัลเล็ก ได้ ${fmt(win)}`); G.applyEff({ happy: big ? 40 : 10 }); }
      else { out.push(`ไม่ถูกรางวัล (เสียไป ${fmt(-c.money)} · โอกาสถูกรางวัลใดก็ได้ต่อใบประมาณ 5%)`); G.applyEff({ happy: -2 }); }
    }
    if (c.note) out.push(c.note);
    emit('money', 0);
    return out;
  };
  const eventCat = ev => ({ car_break: 'รถ', sick: 'ยา/สุขภาพ', appliance: 'ของใช้', phone_crack: 'ของใช้', friend_wedding: 'สังคม', lottery: 'ลอตเตอรี่', biz_chance: 'ลงทุน' })[ev.id] || 'อื่น ๆ';

  // ---------------- กิจกรรม (ใช้เวลาในเกม) ----------------
  // act: {label, mins, rate:{need/ชม.}, pose, onDone, onTick, at:{x,y,face}, icon}
  G.activity = null;
  G.startActivity = function (act) {
    if (G.activity) G.cancelActivity(true);
    act.done = 0; act.mins = Math.max(1, act.mins);
    G.activity = act; emit('activity', act);
  };
  G.cancelActivity = function (silent) {
    const a = G.activity; if (!a) return;
    G.activity = null;
    if (a.onCancel) a.onCancel(a.done / a.mins);
    if (!silent) toast('หยุด' + a.label + 'แล้ว', 'warn');
    emit('activity', null);
  };
  G.tickActivity = function (gameMins) {
    const a = G.activity; if (!a) return 0;
    const step = Math.min(gameMins, a.mins - a.done);
    a.done += step;
    if (a.onTick) a.onTick(step);
    if (a.done >= a.mins - 1e-6) { G.activity = null; if (a.onDone) a.onDone(); emit('activity', null); }
    return step;
  };

  // ---------------- เช็กอินรายวัน (วันจริง) ----------------
  G.checkin = function () {
    const today = new Date().toDateString();
    if (S.checkin === today) return false;
    S.checkin = today; G.earn(200, 'โบนัสเช็กอินรายวัน', 'รายได้อื่น', 'cash');
    toast('🎁 โบนัสเช็กอินวันนี้ ฿200 (เงินในเกม)', 'good'); return true;
  };

  // ---------------- บันทึก/โหลด ----------------
  G.save = function (silent) {
    if (!S) return false;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); if (!silent) toast('บันทึกเกมแล้ว · ' + G.hm(), 'good'); return true; }
    catch (e) { if (!silent) toast('บันทึกไม่สำเร็จ: เบราว์เซอร์ไม่อนุญาตให้เก็บข้อมูล (อาจเป็นโหมดส่วนตัว)', 'bad'); return false; }
  };
  G.hasSave = function () { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } };
  G.saveInfo = function () { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); return s && s.player ? { name: s.player.name, day: Math.floor(s.time / 1440) + 1, money: s.money.cash + s.money.bank + s.money.savings } : null; } catch (e) { return null; } };
  G.load = function () {
    try {
      const raw = localStorage.getItem(SAVE_KEY); if (!raw) return false;
      const s = JSON.parse(raw); if (!s || !s.player || s.v !== 2 || !s.player.cid) return false;
      S = s; G.activity = null; G.migrateHome(); G.syncClock(); G.checkin(); return true;
    } catch (e) { toast('โหลดเซฟไม่สำเร็จ: ไฟล์เซฟเสียหาย', 'bad'); return false; }
  };
  G.wipe = function () { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ไม่เป็นไร */ } };
  G.exportSave = () => JSON.stringify(S);
  G.importSave = function (txt) { try { const s = JSON.parse(txt); if (!s.player || !s.player.cid) throw 0; S = s; G.migrateHome(); G.syncClock(); G.save(true); return true; } catch (e) { toast('ข้อมูลเซฟไม่ถูกต้อง', 'bad'); return false; } };

  G.toast = toast; G.emit = emit; G.bill = bill;
  window.G = G;
})();
