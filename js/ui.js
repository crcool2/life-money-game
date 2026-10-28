/* เกมส์ชีวิตและการเงิน — ส่วนติดต่อผู้เล่น (HUD, เมนู, ร้านค้า, การเงิน, การลงทุน, บทสนทนา, หน้าสร้างตัวละคร) */
'use strict';
(function () {
  const D = window.DATA, C = window.CORE;
  const $ = s => document.querySelector(s);
  const S = () => G.S();
  const fmt = n => G.fmt(n);
  // h('div.cls#id', {attrs}, children...)
  function h(sel, attrs, ...kids) {
    const m = sel.match(/^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i) || [];
    const el = document.createElement(m[1] || 'div');
    (m[2] || '').replace(/([.#])([\w-]+)/g, (_, t, v) => { if (t === '.') el.classList.add(v); else el.id = v; });
    if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
    if (attrs) for (const k in attrs) {
      const v = attrs[k]; if (v == null || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const k of kids.flat(9)) {
      if (k == null || k === false) continue;
      if (k instanceof Node) { el.append(k); continue; }
      const parts = window.ICONS && ICONS.splitText(String(k)); // อีโมจิในข้อความ → ไอคอน SVG ของเกม
      if (parts) el.append(...parts.map(x => typeof x === 'string' ? document.createTextNode(x) : x)); else el.append(document.createTextNode(k));
    }
    return el;
  }
  const UI = { h };
  // ชื่อผู้เล่น: ไทย/อังกฤษ/ตัวเลข เว้นวรรคได้ ตัดช่องว่างหัวท้าย ยาวไม่เกิน 16 ตัวอักษร
  UI.cleanName = (v, typing) => { let s = String(v || '').replace(/[^\u0E00-\u0E7FA-Za-z0-9 ._-]/g, '').replace(/\s+/g, ' '); s = Array.from(s).slice(0, 16).join(''); return typing ? s.replace(/^\s+/, '') : s.trim(); };
  UI.nameHint = n => `${Array.from(n || '').length}/16 ตัวอักษร · ใช้ภาษาไทย อังกฤษ หรือตัวเลขได้`;
  // คำถามลงท้าย 'คะ' ไม่ใช่ 'ค่ะ'
  UI.fixQ = s => s.replace(/(ไหม|หรือยัง|ยัง|เหรอ|ไง|อะไร|ไหน|เท่าไหร่)ค่ะ/g, '$1คะ').replace(/ค่ะ(\s*[?？])/g, 'คะ$1');
  const icon = (e, cls) => ICONS.el(e || 'sparkle', cls);
  UI.icon = icon;

  // ---------------- แจ้งเตือน ----------------
  UI.toast = function ({ msg, kind }) {
    const box = $('#toasts'); if (!box) return;
    const t = h('div.toast.' + (kind || 'info'), msg); box.prepend(t);
    while (box.children.length > 4) box.lastChild.remove();
    setTimeout(() => t.classList.add('out'), 3800); setTimeout(() => t.remove(), 4300);
  };
  G.on('toast', UI.toast);
  G.on('money', d => { if (!d) return; const m = $('#money'); if (!m) return; const f = h('span.mfloat.' + (d > 0 ? 'pos' : 'neg'), (d > 0 ? '+' : '') + fmt(d)); m.append(f); setTimeout(() => f.remove(), 1400); });

  // ---------------- โมดัล ----------------
  UI.close = function () { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; W.modal = false; UI.current = null; };
  UI.sheet = function (title, sub, build, opts = {}) {
    const m = $('#modal'); m.innerHTML = ''; m.hidden = false; W.modal = true;
    const body = h('div.sheet-body');
    const sheet = h('div.sheet' + (opts.wide ? '.wide' : '') + (opts.narrow ? '.narrow' : ''), { role: 'dialog', 'aria-label': title },
      h('header.sheet-head', h('div', h('h2', title), sub ? h('p.sub', sub) : null), h('button.x', { onclick: UI.close, 'aria-label': 'ปิด' }, '✕')),
      body);
    m.append(h('div.scrim', opts.lock ? { 'data-lock': '1' } : { onclick: UI.close }), sheet);
    if (opts.lock) sheet.querySelector('.x').remove();
    const re = () => { body.innerHTML = ''; build(body, re); };
    re(); UI.current = re;
    return { body, re };
  };
  UI.tabs = function (body, tabs, state, re) {
    const bar = h('div.tabs', { role: 'tablist' }, tabs.map(([k, l]) => h('button.tab' + (state.tab === k ? '.on' : ''), { role: 'tab', 'aria-selected': state.tab === k ? 'true' : 'false', onclick: () => { state.tab = k; re(); } }, l)));
    body.append(bar);
  };
  UI.choices = function (title, sub, opts) {
    UI.sheet(title, sub, body => {
      const list = h('div.choices');
      for (const o of opts) {
        list.append(h('button.choice' + (o.disabled ? '.dis' : ''), { disabled: o.disabled ? true : null, onclick: () => { if (o.disabled) return; if (!o.keep) UI.close(); o.onClick && o.onClick(); } },
          icon(o.icon || '•'), h('span.ct', h('b', o.label), o.sub ? h('small', o.sub) : null, typeof o.disabled === 'string' ? h('small.why', o.disabled) : null)));
      }
      body.append(list);
    }, { narrow: true });
  };

  // ---------------- HUD ----------------
  // ภาษา: เตรียมโครงสร้างไว้ (ตอนนี้แปลอังกฤษเฉพาะป้ายบน HUD เนื้อหาเกมยังเป็นภาษาไทย)
  const L10N = {
    th: { home: 'บ้าน', decorate: 'ตกแต่ง', shop: 'ร้านค้า', jobs: 'งาน', finance: 'การเงิน', invest: 'ลงทุน', friends: 'เพื่อน', love: 'ความรัก', goals: 'เป้าหมาย', more: 'เมนูอื่นๆ', map: 'แผนที่', bag: 'กระเป๋า', quests: 'ภารกิจ', rel: 'ความสัมพันธ์', phone: 'โทรศัพท์', location: 'ตำแหน่ง', camera: 'กล้อง', pet: 'สัตว์เลี้ยง', dress: 'แต่งตัว', settings: 'ตั้งค่า', hide: 'ซ่อนปุ่มทั้งหมด (H)', show: 'แสดงปุ่ม (H)', pause: 'หยุดเวลา', play: 'เวลาปกติ', x2: 'เร็ว ×2', x3: 'เร็ว ×3', cash: 'เงินพร้อมใช้', lv: 'Lv.', exp: 'EXP', happy: 'ความสุข', hunger: 'ความอิ่ม', energy: 'พลังงาน', health: 'สุขภาพ', loveV: 'ความรัก', social: 'สังคม', hygiene: 'สุขอนามัย', stress: 'ความเครียด', dev: 'อยู่ระหว่างพัฒนา' },
    en: { home: 'Home', decorate: 'Decorate', shop: 'Shops', jobs: 'Jobs', finance: 'Money', invest: 'Invest', friends: 'Friends', love: 'Love', goals: 'Goals', more: 'More', map: 'Map', bag: 'Bag', quests: 'Tasks', rel: 'People', phone: 'Phone', location: 'Location', camera: 'Camera', pet: 'Pet', dress: 'Outfit', settings: 'Settings', hide: 'Hide UI (H)', show: 'Show UI (H)', pause: 'Pause', play: 'Normal speed', x2: 'Speed ×2', x3: 'Speed ×3', cash: 'Available', lv: 'Lv.', exp: 'EXP', happy: 'Happiness', hunger: 'Fullness', energy: 'Energy', health: 'Health', loveV: 'Love', social: 'Social', hygiene: 'Hygiene', stress: 'Stress', dev: 'In development' }
  };
  const T = k => { const lang = (S() && S().settings.lang) || 'th'; return (L10N[lang] || L10N.th)[k] || L10N.th[k] || k; };
  UI.T = T;
  // ระดับตัวละคร = ผลรวมประสบการณ์ทักษะจริงทั้งหมด (ไม่ใช่ค่าสมมติ)
  UI.level = function () {
    const xp = Object.values(S().player.skills || {}).reduce((a, v) => a + (v || 0), 0);
    const lv = Math.floor(Math.sqrt(xp / 40)) + 1, a = (lv - 1) * (lv - 1) * 40, b = lv * lv * 40;
    return { lv, xp: Math.round(xp), p: (xp - a) / (b - a), need: Math.round(b - xp) };
  };
  // ความรัก = ความสัมพันธ์สูงสุดกับคนที่คบหาได้ (คู่ชีวิตถ้ามี)
  UI.loveValue = function () {
    const st = S(); if (st.family && st.rel[st.family]) return { v: st.rel[st.family].v, who: D.NPCS[st.family].name };
    let best = null; for (const id in st.rel) { if (D.NPCS[id] && D.NPCS[id].staff) continue; if (!best || st.rel[id].v > st.rel[best].v) best = id; }
    return best ? { v: st.rel[best].v, who: st.rel[best].v > 0 ? D.NPCS[best].name : '' } : { v: 0, who: '' };
  };
  const STATS = [['happy', 'happy'], ['hunger', 'hunger'], ['energy', 'energy'], ['health', 'health'], ['loveV', 'love'], ['social', 'social'], ['hygiene', 'hygiene'], ['stress', 'stress']];
  // เสียงคลิก (WebAudio สั้น ๆ ไม่มีไฟล์เสียง) เปิด/ปิดได้ในตั้งค่า
  let actx = null;
  UI.click = function () {
    const st = S(); if (!st || !st.settings.sound) return;
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(660, actx.currentTime); o.frequency.exponentialRampToValueAtTime(990, actx.currentTime + .06); g.gain.setValueAtTime(.08, actx.currentTime); g.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + .12); o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime + .13); } catch (e) { /* เบราว์เซอร์ไม่รองรับเสียง */ }
  };
  document.addEventListener('pointerdown', e => { if (e.target.closest && e.target.closest('button')) UI.click(); }, true);
  // โหมดซ่อน UI: ซ่อน HUD ทั้งหมด เหลือปุ่มตาโปร่งแสงปุ่มเดียว · เวลา AI และแอนิเมชันยังเดินตามปกติ
  UI.setImmersive = function (on) {
    document.body.classList.toggle('immersive', !!on);
    const b = $('#uiShow'); if (b) b.hidden = !on;
    closePops();
  };
  UI.toggleImmersive = () => UI.setImmersive(!document.body.classList.contains('immersive'));
  function closePops() { document.querySelectorAll('.pop').forEach(p => p.remove()); document.querySelectorAll('.hbtn.on').forEach(b => b.classList.remove('on')); }
  UI.closePops = closePops;
  // ป็อปอัปเล็กข้างปุ่ม (ไม่ซ้อนหลายชั้น: เปิดอันใหม่ปิดอันเดิม)
  function pop(btn, build) {
    const was = btn.classList.contains('on'); closePops(); if (was) return;
    btn.classList.add('on');
    const p = h('div.pop', { role: 'dialog' }); build(p);
    document.body.append(p);
    const r = btn.getBoundingClientRect(), pw = p.offsetWidth, ph = p.offsetHeight, vw = innerWidth, vh = innerHeight;
    let x = r.left - pw - 10, y = r.top + r.height / 2 - ph / 2;
    if (r.left < vw / 2) x = r.right + 10;
    if (r.top > vh * .7) { x = Math.min(vw - pw - 8, Math.max(8, r.left + r.width / 2 - pw / 2)); y = r.top - ph - 10; }
    p.style.left = Math.max(8, Math.min(vw - pw - 8, x)) + 'px'; p.style.top = Math.max(8, Math.min(vh - ph - 8, y)) + 'px';
  }
  document.addEventListener('pointerdown', e => { if (!e.target.closest('.pop') && !e.target.closest('.hbtn')) closePops(); });
  const hb = (k, ic, fn, cls) => h('button.hbtn' + (cls ? '.' + cls : ''), { 'data-k': k, 'data-tip': T(k), 'aria-label': T(k), onclick: e => fn(e.currentTarget) }, icon(ic), h('span.hl', T(k)));
  const devToast = what => G.toast(`${what} · ${T('dev')}`, 'warn');
  const statusOpen = () => { const st = S(); return st.settings.statusOpen == null ? (innerWidth > 1000 && innerHeight > 700) : st.settings.statusOpen; };
  UI.buildHUD = function () {
    const hud = $('#hud'); hud.innerHTML = '';
    const st = S();
    hud.append(
      h('div#topbar',
        h('div#status' + (statusOpen() ? '.open' : ''),
          h('button.sthead', { onclick: () => { st.settings.statusOpen = !statusOpen(); $('#status').classList.toggle('open', statusOpen()); }, 'aria-label': 'ย่อ/ขยายสถานะตัวละคร', 'aria-expanded': statusOpen() ? 'true' : 'false' },
            h('span.stp', portraitEl(st.player.cid, 54)),
            h('span.stn', h('b#stName', st.player.name), h('span.stlv', h('em#stLv', 'Lv.1'), h('span.xbar', h('i#stXp'))), h('small#stMood', '')),
            h('span.chev', '▾')),
          h('div.stbody', STATS.map(([k, ic]) => h('div.need', { 'data-k': k, title: T(k) }, icon(ic), h('span.nl', T(k)), h('span.bar', h('i')), h('span.nv', ''))))),
        h('div#clockbar',
          h('span#dayicon', icon('sun')),
          h('span.ct', h('b#time', '08:00'), h('small#date', '')),
          h('div.speed', [['0', 'pause', 'pause'], ['1', 'play', 'play'], ['2', 'ff2', 'x2'], ['3', 'ff3', 'x3']].map(([v, ic, t]) => h('button.spd', { 'data-s': v, 'data-tip': T(t), 'aria-label': T(t), onclick: () => { S().settings.speed = +v; UI.refreshHUD(); } }, icon(ic))))),
        h('div#tright',
          h('button#money', { onclick: () => UI.openFinance(), 'aria-label': 'เปิดหน้าการเงิน', 'data-tip': T('finance') }, icon('coin'), h('span.mv', h('b#moneyV', '฿0'), h('small#moneySub', ''))),
          h('button.round#setBtn', { onclick: () => UI.openSettings(), 'aria-label': T('settings'), 'data-tip': T('settings') }, icon('gear')),
          h('button.round#hideBtn', { onclick: () => UI.setImmersive(true), 'aria-label': T('hide'), 'data-tip': T('hide') }, icon('eye')))),
      h('div#placechip', h('span#placeName', ''), h('small#mood', '')),
      h('nav#quick', { 'aria-label': 'เมนูด่วน' },
        hb('map', 'map', () => UI.openMap()), hb('bag', 'bag', () => UI.openBag()), hb('quests', 'quest', () => UI.openQuests()), hb('rel', 'love', () => UI.openRel())),
      h('nav#actions', { 'aria-label': 'เมนูการกระทำ' },
        hb('phone', 'phone', () => UI.openPhone()), hb('location', 'pin', b => locationPop(b)), hb('camera', 'camera', b => cameraPop(b)), hb('pet', 'paw', () => UI.openPet()), hb('dress', 'hanger', () => UI.openWardrobe())),
      h('nav#dock', { 'aria-label': 'เมนูหลัก' }, [
        ['home', 'home', () => UI.goHome()], ['decorate', 'sofa', () => { if (!W.scene || !W.scene.furnHome) { G.toast('ต้องอยู่ในบ้านจึงจะตกแต่งได้ · กด "บ้าน" เพื่อกลับบ้าน', 'warn'); return; } UI.openDecor(); }], ['shop', 'cart', () => UI.openShops()],
        ['jobs', 'briefcase', () => UI.openJobs()], ['finance', 'moneybag', () => UI.openFinance()], ['invest', 'chart', () => UI.openInvest()],
        ['friends', 'friends', () => UI.openRel('friends')], ['love', 'love', () => UI.openRel('love')], ['goals', 'target', () => UI.openGoals()], ['more', 'more', () => UI.openMore()]
      ].map(([k, ic, f]) => h('button.dk', { 'data-k': k, 'data-tip': T(k), onclick: f }, icon(ic), h('span', T(k))))),
      h('button#uiShow', { hidden: true, onclick: () => UI.setImmersive(false), 'aria-label': T('show'), title: T('show') }, icon('eye')),
      h('div#housecard', { hidden: true }),
      h('div#nearby', { hidden: true }),
      h('div#activity', { hidden: true }),
      h('div#placebar', { hidden: true }),
      h('div#toasts', { 'aria-live': 'polite' }));
    applyPrefs();
  };
  function applyPrefs() {
    const st = S(); if (!st) return;
    document.body.classList.toggle('reduce', !!st.settings.reduce);
    document.documentElement.lang = st.settings.lang === 'en' ? 'en' : 'th';
  }
  UI.applyPrefs = applyPrefs;
  function zoomBy(f) { C.setZoom(C.cam.zoom * f); }
  UI.zoomBy = zoomBy;
  function cameraPop(btn) {
    pop(btn, p => p.append(h('b', 'กล้อง'),
      h('div.btnrow', h('button.round.sm', { onclick: () => zoomBy(1.25), 'aria-label': 'ซูมเข้า', 'data-tip': 'ซูมเข้า' }, icon('plus')), h('button.round.sm', { onclick: () => zoomBy(1 / 1.25), 'aria-label': 'ซูมออก', 'data-tip': 'ซูมออก' }, icon('minus')),
        h('button.round.sm', { onclick: () => { C.cam.follow = true; C.setZoom(1); }, 'aria-label': 'รีเซ็ตกล้อง', 'data-tip': 'รีเซ็ตกล้อง' }, icon('recenter'))),
      h('small.muted', 'ลากฉากเพื่อเลื่อนกล้อง · ล้อเมาส์หรือบีบสองนิ้วเพื่อซูม · หมุนกล้อง: ไม่รองรับ (ฉากวาดเป็นภาพมุมเดียว)')));
  }
  function locationPop(btn) {
    C.cam.follow = true;
    const st = S(), sc = D.SCENES[st.player.scene], here = hereId(), c = D.CITY.find(x => x.id === here);
    pop(btn, p => p.append(h('b', sc ? sc.name : 'ตำแหน่งปัจจุบัน'), h('small.muted', c ? 'ย่าน/จุดใกล้ที่สุดบนแผนที่: ' + c.name : ''), h('small.muted', 'กล้องกลับมาที่ตัวละครแล้ว'),
      h('div.btnrow', h('button.primary', { onclick: () => { closePops(); UI.openMap(); } }, 'เปิดแผนที่'), W.key !== 'home_in' ? h('button', { onclick: () => { closePops(); UI.goHome(); } }, 'กลับบ้าน') : null)));
  }
  UI.refreshHUD = function () {
    const st = S(); if (!st || !$('#time')) return;
    $('#time').textContent = G.hm();
    $('#date').textContent = G.dateLabel() + ' · ' + G.period();
    const hr = G.hour(), di = $('#dayicon'), want = hr >= 6 && hr < 18 ? 'sun' : 'moon';
    if (di.dataset.k !== want) { di.dataset.k = want; di.innerHTML = ''; di.append(icon(want)); }
    document.querySelectorAll('.spd').forEach(b => { const on = +b.dataset.s === st.settings.speed; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    const sc = D.SCENES[st.player.scene];
    $('#placeName').textContent = W.key === 'park' ? 'สวนสาธารณะริมน้ำ' : W.key === 'beach' ? 'ชายหาดและท่าเรือ' : sc ? sc.name : '';
    const [ml, me] = G.mood(); $('#mood').textContent = ICONS.stripEmoji(me + ' ' + ml); $('#stMood').textContent = ICONS.stripEmoji(ml);
    $('#stName').textContent = st.player.name;
    const L = UI.level(); $('#stLv').textContent = `${T('lv')}${L.lv}`; $('#stXp').style.width = (L.p * 100) + '%';
    $('#stLv').parentNode.title = `EXP ${L.xp} · อีก ${L.need} ถึงระดับถัดไป (มาจากทักษะทั้งหมดรวมกัน)`;
    $('#moneyV').textContent = fmt(G.liquid());
    $('#moneySub').textContent = `สด ${fmt(st.money.cash)} · บัญชี ${fmt(st.money.bank)}`;
    const love = UI.loveValue();
    for (const el of document.querySelectorAll('.need')) {
      const k = el.dataset.k, v = k === 'loveV' ? love.v : st.player.needs[k];
      const bad = k === 'stress' ? v > 70 : k === 'loveV' ? false : v < 25;
      el.classList.toggle('low', bad);
      el.querySelector('i').style.width = Math.max(0, Math.min(100, v)) + '%';
      el.querySelector('.nv').textContent = Math.round(v);
      if (k === 'loveV') el.title = love.who ? `ความรัก: ความสัมพันธ์กับ${love.who}` : 'ความรัก: ยังไม่มีคนพิเศษ';
    }
    // หน้าบ้าน: ป้ายชื่อบ้าน + ปุ่มเข้าบ้าน
    const hc = $('#housecard');
    if (W.key === 'home_out' && !G.activity && !W.modal) {
      if (hc.hidden) { hc.hidden = false; hc.innerHTML = ''; const placed = st.home.furn.filter(f => f.placed).length;
        hc.append(icon('home'), h('div', h('b', st.home.name || 'บ้านของฉัน'), h('small', `เฟอร์นิเจอร์ในบ้าน ${placed} ชิ้น · ${st.home.owned ? 'บ้านของตัวเอง' : 'บ้านเช่า'}`)),
          h('button.primary', { onclick: () => { const d = W.scene.spots.find(s => s.id === 'door'); if (d) W.click(d.x, d.y); } }, 'เข้าบ้าน')); }
    } else if (!hc.hidden) hc.hidden = true;
    const dec = $('.dk[data-k="decorate"]'); if (dec) dec.classList.toggle('dim', !(W.scene && W.scene.furnHome));
    const pet = $('.hbtn[data-k="pet"]'); if (pet) pet.classList.toggle('dim', !st.pet);
    // ใกล้อะไร
    const nb = $('#nearby'), near = W.near;
    if (near && !G.activity && !W.modal && !W.placing) {
      nb.hidden = false;
      const key = near.type === 'spot' ? 'S' + near.sp.id : 'N' + near.n.id;
      if (nb.dataset.k !== key) {
        nb.dataset.k = key; nb.innerHTML = '';
        if (near.type === 'spot') nb.append(icon(near.sp.icon), h('span', near.sp.label), h('button.primary', { onclick: () => W.useSpot(near.sp) }, near.sp.act === 'go' ? 'เข้าไป' : near.sp.act === 'map' ? 'เปิดแผนที่' : 'ใช้งาน'), h('kbd', 'E'));
        else { const N = D.NPCS[near.n.id]; nb.append(h('span.pt', portraitEl(W.npcCid(near.n.id), 34)), h('span', h('b', N.name), ' · ' + N.role), h('button.primary', { onclick: () => UI.npcMenu(near.n) }, 'คุยด้วย'), h('kbd', 'E')); }
      }
    } else { nb.hidden = true; nb.dataset.k = ''; }
    // กิจกรรม
    const a = G.activity, ab = $('#activity');
    if (a) {
      ab.hidden = false;
      if (ab.dataset.l !== a.label) {
        ab.dataset.l = a.label; ab.innerHTML = '';
        ab.append(...[h('div.al', icon(a.icon || '⏳'), h('b', a.label)), a.route ? h('div.route', h('span', a.route.a), h('div.track', h('i.car', a.route.icon)), h('span', a.route.b)) : null,
          h('div.pbar', h('i')), h('div.ar', h('span.left', ''), h('button.ghost', { onclick: () => G.cancelActivity() }, 'หยุด'))].filter(Boolean));
      }
      const p = a.done / a.mins;
      ab.querySelector('.pbar i').style.width = (p * 100) + '%';
      const car = ab.querySelector('.car'); if (car) car.style.left = `calc(${p * 100}% - 12px)`;
      ab.querySelector('.left').textContent = 'เหลือ ' + mins(a.mins - a.done) + ' · เวลาในเกมเดินเร็วขึ้น';
    } else { ab.hidden = true; ab.dataset.l = ''; }
    // แถบจัดวาง
    const pb = $('#placebar');
    if (W.placing) {
      pb.hidden = false;
      if (pb.dataset.on !== W.placing.f.id) { pb.dataset.on = W.placing.f.id; pb.innerHTML = ''; pb.append(h('span.pbhint', h('b', D.FURN_TYPES[W.placing.f.type].name), h('small', 'ลากบนพื้นเพื่อเลื่อน · สีเขียว = วางได้ · สีแดง = ทับกำแพง/ประตู/ของอื่น')), h('span.pbok'),
        h('div.pbbtns', h('button', { title: 'หมุน (R)', onclick: () => W.flipPlace() }, 'หมุน'), h('button.primary', { title: 'วาง (Enter)', onclick: () => W.confirmPlace() }, 'วางตรงนี้'), h('button', { onclick: () => W.storePlacing() }, 'เก็บเข้าคลัง'), h('button.ghost', { onclick: () => W.cancelPlace() }, 'ยกเลิก'))); }
      const ok = pb.querySelector('.pbok'); ok.textContent = W.placing.ok ? 'วางได้' : 'วางไม่ได้'; ok.className = 'pbok ' + (W.placing.ok ? 'good' : 'bad');
    } else { pb.hidden = true; pb.dataset.on = ''; }
  };
  const mins = m => { m = Math.max(0, Math.round(m)); return m >= 60 ? `${Math.floor(m / 60)} ชม. ${m % 60 ? (m % 60) + ' นาที' : ''}` : m + ' นาที'; };
  UI.mins = mins;
  function portraitEl(cid, size, emo) { const c = C.portrait(cid, Math.round(size * Math.min(3, Math.max(2, window.devicePixelRatio || 1))), emo); c.style.width = c.style.height = size + 'px'; c.className = 'portrait'; return c; }
  UI.portraitEl = portraitEl;
  function bodyEl(cid, hgt, frame) { const c = C.bodyCanvas(cid, frame || 'front', hgt, Math.min(3, Math.max(2, window.devicePixelRatio || 1))); c.className = 'bodyimg'; return c; }
  UI.bodyEl = bodyEl;

  // ---------------- เมนูใหม่ของ HUD (ทุกปุ่มเชื่อมระบบจริง) ----------------
  const SHOP_PIN = { conv: 'super', super: 'mall', general: 'mall', elec: 'mall', clothes: 'mall', pharm: 'clinic', cafe: 'rest', coffee: 'rest', cars: 'cars', moto: 'moto' };
  UI.goHome = function () {
    if (W.key === 'home_in') { C.cam.follow = true; return G.toast('อยู่ในบ้านแล้ว · กล้องกลับมาที่ตัวละคร', 'good'); }
    if (W.key === 'home_out') { const d = W.scene.spots.find(s => s.id === 'door'); if (d) return W.useSpot(d); }
    UI.openMap('home');
  };
  UI.openShops = function () {
    UI.sheet('ร้านค้าในเมือง', 'แตะ "ไปที่ร้าน" เพื่อดูเส้นทางบนแผนที่ · เวลาเปิดปิดเป็นเวลาในเกม', body => {
      const list = h('div.rows');
      for (const [k, s] of Object.entries(D.SHOPS)) {
        const open = G.shopOpen(k);
        list.append(h('div.row', icon({ conv: 'store', super: 'cart', general: 'sofa', elec: 'tv', clothes: 'shirt', pharm: 'pill', cafe: 'food', coffee: 'coffee', cars: 'car', moto: 'moto' }[k] || 'shop'),
          h('span.grow', h('b', s.name), h('small', `${open ? 'เปิดอยู่' : 'ปิดอยู่'} · ${G.shopHours(k)}`)),
          h('button.primary', { onclick: () => UI.openMap(SHOP_PIN[k]) }, 'ไปที่ร้าน')));
      }
      body.append(list);
    });
  };
  UI.openQuests = function () {
    const st = S(), n = st.player.needs, out = [];
    const add = (ic, t, sub, btn, fn) => out.push(h('div.row', icon(ic), h('span.grow', h('b', t), h('small', sub)), btn ? h('button.primary', { onclick: fn }, btn) : null));
    if (n.hunger < 35) add('hunger', 'หาอะไรกิน', `ความอิ่ม ${Math.round(n.hunger)} · มีอาหารในกระเป๋า ${Object.values(st.inv.food).reduce((a, v) => a + v, 0)} ชิ้น`, 'เปิดกระเป๋า', () => UI.openBag());
    if (n.energy < 35) add('energy', 'พักผ่อน/นอนหลับ', `พลังงาน ${Math.round(n.energy)}`, W.key === 'home_in' ? null : 'กลับบ้าน', () => UI.goHome());
    if (n.hygiene < 35) add('hygiene', 'อาบน้ำ', `สุขอนามัย ${Math.round(n.hygiene)}`, W.key === 'home_in' ? null : 'กลับบ้าน', () => UI.goHome());
    if (n.social < 30) add('social', 'คุยกับเพื่อนหรือคนรู้จัก', `สังคม ${Math.round(n.social)}`, 'ดูรายชื่อ', () => UI.openRel());
    if (n.stress > 70) add('stress', 'ลดความเครียด', `ความเครียด ${Math.round(n.stress)} · พัก ดูทีวี หรือไปสวนสาธารณะ`, 'แผนที่', () => UI.openMap('park'));
    const o = st.jobs && st.jobs.office;
    if (o && G.weekday() < 5) add('briefcase', 'ไปทำงานที่ออฟฟิศ', `วันนี้วันทำงาน 09:00–17:00 · ทำแล้ว ${o.workedDay === G.day() ? 'ครบวันแล้ว' : 'ยังไม่ครบ'}`, 'ไปออฟฟิศ', () => UI.openMap('office'));
    if (st.jobs && st.jobs.gigs && st.jobs.gigs.length) add('laptop', `งานฟรีแลนซ์รอรับ ${st.jobs.gigs.length} งาน`, 'ทำที่โต๊ะทำงานในบ้านหรือใช้แล็ปท็อป', 'ดูงาน', () => UI.openJobs('freelance'));
    if (st.pet && !(st.inv.petfood > 0)) add('paw', 'อาหารสัตว์เลี้ยงหมด', `${st.pet.name} หิวแล้ว`, 'หาร้าน', () => UI.openShops());
    for (const id of st.goals.active) { const g = D.GOALS.find(x => x.id === id); if (!g) continue; const [p, txt] = G.goalProgress(id); add('target', 'เป้าหมาย: ' + g.name, `${Math.round(Math.min(1, p) * 100)}% · ${txt}`, 'ดูเป้าหมาย', () => UI.openGoals()); }
    UI.sheet('ภารกิจวันนี้', 'สรุปจากสถานะจริงของตัวละคร งาน และเป้าหมายที่ติดตาม', body => {
      if (!out.length) body.append(h('p.muted', 'ตอนนี้ทุกอย่างเรียบร้อยดี · ลองตั้งเป้าหมายชีวิตเพื่อให้มีภารกิจติดตาม'), h('button.primary', { onclick: () => UI.openGoals() }, 'ตั้งเป้าหมาย'));
      else body.append(h('div.rows', out));
    }, { narrow: true });
  };
  UI.openPhone = function () {
    const apps = [['bank', 'ธนาคาร', () => UI.openFinance()], ['chart', 'หุ้น/ลงทุน', () => UI.openInvest()], ['laptop', 'งานฟรีแลนซ์', () => UI.openJobs('freelance')], ['news', 'ข่าวตลาด', () => { UI.close(); UI.marketNews(); }],
      ['friends', 'รายชื่อ', () => UI.openRel()], ['map', 'แผนที่', () => UI.openMap()], ['target', 'เป้าหมาย', () => UI.openGoals()], ['gear', 'ตั้งค่า', () => UI.openSettings()]];
    UI.sheet('โทรศัพท์', 'แอปในโทรศัพท์เชื่อมกับระบบการเงิน งาน และความสัมพันธ์ในเกม', body => body.append(h('div.appgrid', apps.map(([ic, l, f]) => h('button.app', { onclick: f }, icon(ic), h('span', l))))), { narrow: true });
  };
  UI.openPet = function () {
    const st = S();
    UI.sheet('สัตว์เลี้ยง', '', body => {
      if (!st.pet) { body.append(h('p.muted', 'ยังไม่มีสัตว์เลี้ยง · เมื่อรับเลี้ยงแล้ว ความสุขจะเพิ่มขึ้นทุกวัน แต่มีค่าอาหารประมาณ ฿1,500/เดือน'), h('div.btnrow', h('button.primary', { onclick: () => UI.openShops() }, 'ดูร้านค้า'))); return; }
      body.append(h('div.cardrow', h('div.kv', h('span', 'ชื่อ'), h('b', st.pet.name)), h('div.kv', h('span', 'ความสุขของน้อง'), h('b', Math.round(st.pet.joy) + ' / 100')), h('div.kv', h('span', 'อาหารสัตว์เหลือ'), h('b', (st.inv.petfood || 0) + ' วัน')), h('div.kv', h('span', 'อยู่ด้วยกัน'), h('b', (G.day() - st.pet.since) + ' วัน'))));
      body.append(h('p.warnline', 'น้องยังไม่แสดงตัวในฉากบ้าน (ยังไม่มีภาพสัตว์เลี้ยงในชุดภาพปัจจุบัน) · การเล่นกับน้องในฉาก: ' + T('dev')));
    }, { narrow: true });
  };
  UI.openWardrobe = function () {
    UI.sheet('แต่งตัว', '', body => {
      body.append(h('div.devnote', icon('hanger'), h('div', h('b', 'เปลี่ยนชุด · ' + T('dev')), h('small', 'ชุดใหม่จะซื้อได้ที่ร้านเสื้อผ้าในห้าง และเปลี่ยนได้ที่ตู้เสื้อผ้าในบ้าน (อัปเดตในอนาคต) · ตอนนี้ตัวละครใช้ชุดตามภาพตัวละครที่เลือก'))),
        h('div.btnrow', h('button.primary', { onclick: () => UI.openMap('mall') }, 'ไปร้านเสื้อผ้าในห้าง')));
    }, { narrow: true });
  };
  UI.openMore = function () {
    const items = [['map', 'แผนที่', () => UI.openMap()], ['bag', 'กระเป๋า', () => UI.openBag()], ['quest', 'ภารกิจวันนี้', () => UI.openQuests()], ['love', 'ความสัมพันธ์', () => UI.openRel()],
      ['phone', 'โทรศัพท์', () => UI.openPhone()], ['paw', 'สัตว์เลี้ยง', () => UI.openPet()], ['hanger', 'แต่งตัว', () => UI.openWardrobe()], ['home', 'บ้าน', () => UI.goHome()],
      ['sofa', 'ตกแต่งบ้าน', () => { if (!W.scene || !W.scene.furnHome) { UI.close(); return G.toast('ต้องอยู่ในบ้านจึงจะตกแต่งได้', 'warn'); } UI.openDecor(); }], ['cart', 'ร้านค้า', () => UI.openShops()], ['briefcase', 'งาน', () => UI.openJobs()], ['moneybag', 'การเงิน', () => UI.openFinance()],
      ['chart', 'ลงทุน', () => UI.openInvest()], ['friends', 'เพื่อน', () => UI.openRel('friends')], ['heart', 'ความรัก', () => UI.openRel('love')], ['target', 'เป้าหมาย', () => UI.openGoals()],
      ['save', 'บันทึกเกม', () => { G.save(); UI.close(); }], ['eyeoff', 'ซ่อนปุ่มทั้งหมด', () => { UI.close(); UI.setImmersive(true); }], ['gear', 'ตั้งค่า', () => UI.openSettings()]];
    UI.sheet(T('more'), '', body => body.append(h('div.appgrid', items.map(([ic, l, f]) => h('button.app', { onclick: f }, icon(ic), h('span', l))))), { narrow: true });
  };

  // ---------------- เฟด/เปลี่ยนฉาก ----------------
  UI.fade = function (fn, label) {
    const f = $('#fade'); f.textContent = label || ''; f.classList.add('on');
    setTimeout(() => { try { fn(); } finally { setTimeout(() => f.classList.remove('on'), 120); } }, 260);
  };

  // ---------------- แผนที่เมือง ----------------
  // หมุดตรงกับตำแหน่งป้ายในภาพเมือง · ร้าน/สถานที่ในย่านไลฟ์สไตล์จะไปโผล่หน้าประตูในฉากถนนที่เดินได้จริง
  const MAPW = 1672, MAPH = 941; let mapTraffic = null;
  function hereId() {
    if (W.key === 'street') { const p = W.player; let best = 'home', bd = 1e9; for (const sp of W.scene.spots) if (D.CITY.find(c => c.id === sp.id)) { const d = Math.hypot(sp.x - p.x, sp.y - p.y); if (d < bd) { bd = d; best = sp.id; } } return best; }
    return W.PLACE[W.key] || S().player.place || 'home';
  }
  UI.openMap = function (pre) {
    if (G.activity) return G.toast('กำลังทำกิจกรรมอยู่', 'warn');
    const st = S(); const here = hereId();
    const hereC = D.CITY.find(c => c.id === here) || D.CITY[0];
    let sel = (typeof pre === 'string' && D.CITY.find(c => c.id === pre)) || null, mz = 1, mapMoved = false;
    UI.sheet('แผนที่เมือง', 'แตะหมุดเพื่อดูระยะทาง เวลา และค่าเดินทาง', (body, re) => {
      const map = h('div.citymap', { style: { width: (mz * 100) + '%' } }, h('img', { src: 'assets/scenes/citymap.webp', alt: 'แผนที่เมือง', draggable: 'false', onerror: e => { e.target.replaceWith(h('div.imgfail', 'โหลดภาพแผนที่ไม่ได้')); } }));
      for (const c of D.CITY) {
        const open = placeOpen(c);
        map.append(h('button.pin' + (c.id === here ? '.here' : '') + (sel === c ? '.sel' : '') + (open ? '' : '.closed'), { style: { left: (c.x / MAPW * 100) + '%', top: (c.y / MAPH * 100) + '%' }, onclick: () => { if (mapMoved) return; sel = c; re(); }, 'aria-label': c.name }, h('span', c.icon), h('em', c.name)));
      }
      const wrap = h('div.mapwrap', map);
      if (mapTraffic) mapTraffic.stop(); mapTraffic = CITYMAP.attach(map); // รถวิ่งตามถนนจริงบนแผนที่
      body.append(h('div.mapbox', wrap, h('div.mapzoom', h('button', { 'aria-label': 'ซูมแผนที่เข้า', onclick: () => zoomMap(1.3) }, '+'), h('button', { 'aria-label': 'ซูมแผนที่ออก', onclick: () => zoomMap(1 / 1.3) }, '−'))));
      const zoomMap = (f, cx, cy) => {
        const r = wrap.getBoundingClientRect(); cx = cx == null ? r.width / 2 : cx; cy = cy == null ? r.height / 2 : cy;
        const nz = Math.max(1, Math.min(3, mz * f)); if (nz === mz) return;
        const fx = (wrap.scrollLeft + cx) / map.offsetWidth, fy = (wrap.scrollTop + cy) / map.offsetHeight;
        mz = nz; map.style.width = (mz * 100) + '%';
        wrap.scrollLeft = fx * map.offsetWidth - cx; wrap.scrollTop = fy * map.offsetHeight - cy; layoutPins();
      };
      const pts = new Map(); let pz = null, drag0 = null;
      wrap.addEventListener('pointerdown', e => { pts.set(e.pointerId, [e.clientX, e.clientY]); mapMoved = false;
        if (pts.size === 2) { const [p1, p2] = [...pts.values()]; pz = { d: Math.hypot(p1[0] - p2[0], p1[1] - p2[1]) || 1, z: mz }; drag0 = null; }
        else drag0 = { x: e.clientX, y: e.clientY, sl: wrap.scrollLeft, st: wrap.scrollTop }; });
      wrap.addEventListener('pointermove', e => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
        if (pz && pts.size === 2) { const [p1, p2] = [...pts.values()], r = wrap.getBoundingClientRect(); zoomMap(pz.z * Math.hypot(p1[0] - p2[0], p1[1] - p2[1]) / pz.d / mz, (p1[0] + p2[0]) / 2 - r.left, (p1[1] + p2[1]) / 2 - r.top); mapMoved = true; return; }
        if (drag0 && mz > 1) { const dx = e.clientX - drag0.x, dy = e.clientY - drag0.y; if (Math.hypot(dx, dy) > 6) mapMoved = true; wrap.scrollLeft = drag0.sl - dx; wrap.scrollTop = drag0.st - dy; } });
      const endp = e => { pts.delete(e.pointerId); if (pts.size < 2) pz = null; if (!pts.size) { drag0 = null; setTimeout(() => { mapMoved = false; }, 0); } };
      wrap.addEventListener('pointerup', endp); wrap.addEventListener('pointercancel', endp);
      wrap.addEventListener('wheel', e => { e.preventDefault(); const r = wrap.getBoundingClientRect(); zoomMap(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
      const layoutPins = () => {
        const placed = [];
        const ems = [...map.querySelectorAll('.pin')].sort((a, b) => (b.classList.contains('sel') - a.classList.contains('sel')) || (b.classList.contains('here') - a.classList.contains('here')));
        for (const pin of ems) {
          const em = pin.querySelector('em'); em.classList.remove('below', 'hide');
          const important = pin.classList.contains('sel') || pin.classList.contains('here');
          const test = () => { const r = em.getBoundingClientRect(); return placed.some(q => r.left < q.right && r.right > q.left && r.top < q.bottom && r.bottom > q.top); };
          if (test()) { em.classList.add('below'); if (test()) { if (!important) { em.classList.add('hide'); continue; } em.classList.remove('below'); } }
          placed.push(em.getBoundingClientRect());
        }
      };
      requestAnimationFrame(layoutPins);
      const info = h('div.mapinfo');
      if (!sel) info.append(h('p.muted', `ตอนนี้อยู่ใกล้: ${hereC.name} · แตะหมุดเพื่อดูวิธีเดินทาง`));
      else {
        const km = sel.id === here ? 0 : Math.max(.5, Math.round(Math.hypot(sel.x - hereC.x, sel.y - hereC.y) / MAPW * 8 * 10) / 10);
        info.append(h('h3', sel.icon + ' ' + sel.name));
        const op = placeOpen(sel);
        if (!op) info.append(h('p.warnline', placeHoursText(sel)));
        if (sel.id === here) info.append(h('p.muted', 'คุณอยู่แถวนี้แล้ว'), sel.scene ? h('button.primary', { onclick: () => { UI.close(); UI.fade(() => W.enter(sel.scene, sel.spawn)); } }, 'ไปที่ทางเข้า') : null);
        else {
          info.append(h('p', `ระยะทางประมาณ ${km} กม.`));
          const row = h('div.travel');
          for (const o of G.travelOptions(km)) row.append(h('button.tcard' + (o.disabled ? '.dis' : ''), { disabled: o.disabled || !op ? true : null, onclick: () => travel(sel, o, km) }, h('span.big', o.icon), h('b', o.name), h('small', `${mins(o.mins)} · ${o.cost ? fmt(o.cost) : 'ฟรี'}`), o.disabled ? h('small.why', o.disabled) : null));
          info.append(row);
          if (!st.car && !st.bike) info.append(h('p.muted', 'มีรถหรือสกู๊ตเตอร์จะเดินทางเร็วขึ้น ซื้อได้ที่โชว์รูมรถยนต์และ Moto Hub'));
        }
      }
      body.append(info);
    }, { wide: true });
  };
  function placeOpen(c) {
    if (c.id === 'office') return G.officeOpenNow() || !S().jobs.office && G.hour() >= 7 && G.hour() < 19;
    return c.shop ? G.shopOpen(c.shop) : true;
  }
  function placeHoursText(c) {
    if (c.id === 'office') return 'ออฟฟิศเปิดวันจันทร์–ศุกร์ 07:00–19:00';
    return c.shop ? `ร้านปิดอยู่ · เปิด ${G.shopHours(c.shop)}` : '';
  }
  function travel(dest, o, km) {
    if (o.cost && !G.pay(o.cost, `ค่าเดินทาง (${o.name}) ไป${dest.name}`, 'ค่าเดินทาง')) return;
    if (o.car) G.useCar(km);
    const fromC = D.CITY.find(c => c.id === hereId()) || D.CITY[0];
    const mode = o.car ? 'car' : o.id === 'bus' ? 'bus' : o.ride ? 'ride' : 'walk';
    const arrive = () => {
      G.applyEff(o.eff); S().player.place = dest.id;
      if (dest.park) UI.fade(() => { if (dest.scene && W.key !== dest.scene) W.enter(dest.scene, dest.spawn); UI.placeMenu(dest.id); });
      else UI.fade(() => W.enter(dest.scene, dest.spawn));
    };
    // แสดงการเดินทางจริงบนแผนที่: รถ/รถเมล์วิ่งตาม Road Graph · เดินตาม Pedestrian Graph (ทางเท้า) · เวลาในเกมเดินตามระยะทาง
    const ms = Math.min(6500, Math.max(2600, o.mins * 70)); let adv = 0;
    UI.sheet('กำลังเดินทางไป' + dest.name.replace(/ \(อยู่ระหว่างพัฒนา\)/, ''), `${o.name} · ${mins(o.mins)} ในเกม · ${o.cost ? fmt(o.cost) : 'ฟรี'}`, body => {
      const map = h('div.citymap', { style: { width: '100%' } }, h('img', { src: 'assets/scenes/citymap.webp', alt: 'แผนที่เมือง', draggable: 'false' }));
      for (const c of [fromC, dest]) map.append(h('div.pin' + (c === dest ? '.sel' : '.here'), { style: { left: (c.x / MAPW * 100) + '%', top: (c.y / MAPH * 100) + '%' } }, h('span', c.icon), h('em', c.name)));
      const bar = h('div.pbar', h('i'));
      body.append(h('div.mapwrap', map), bar, h('button.ghost', { onclick: () => { ctl.stop(); G.advance(o.mins - adv); UI.close(); arrive(); } }, 'ข้ามแอนิเมชัน'));
      if (mapTraffic) mapTraffic.stop();
      const ctl = mapTraffic = CITYMAP.attach(map);
      ctl.travel([fromC.x, fromC.y], [dest.x, dest.y], mode, ms, t => { const tg = o.mins * t; if (tg > adv) { G.advance(tg - adv); adv = tg; } bar.firstChild.style.width = (t * 100) + '%'; },
        () => { setTimeout(() => { ctl.stop(); UI.close(); arrive(); }, 250); });
    }, { lock: true, wide: true });
  }

  // ---------------- สถานที่แบบเมนู (ภาพหน้าร้าน + กิจกรรม) ----------------
  // ใช้กับสถานที่ที่ยังไม่มีภาพภายในพร้อมเฟอร์นิเจอร์แยกชิ้น
  const PLACES = {
    park: { name: 'สวนสาธารณะ', img: 'ui/scene_park.webp' },
    beach: { name: 'ชายหาด / รีสอร์ท', img: null },
    rest: { name: 'ร้านอาหารสวนหลังคา', img: 'ui/ext_rest.webp', shop: 'cafe' },
    mall: { name: 'ห้างสรรพสินค้า', img: 'ui/view_mall.webp' },
    moto: { name: 'Moto Hub ร้านมอเตอร์ไซค์', img: 'ui/ext_moto.webp', shop: 'moto' },
    police: { name: 'สถานีตำรวจ', img: 'places/police.webp' },
    bank: { name: 'ธนาคาร', img: 'places/bank.webp' },
    airport: { name: 'สนามบิน', img: 'places/airport.webp' },
    school: { name: 'โรงเรียน', img: 'places/school.webp', dev: true },
    gym: { name: 'ฟิตเนส', img: 'places/gym.webp', dev: true },
    cinema: { name: 'โรงภาพยนตร์', img: 'places/cinema.webp', dev: true },
    fire: { name: 'สถานีดับเพลิง', img: 'places/fire.webp', dev: true },
    condo: { name: 'คอนโดมิเนียม', img: 'places/condo.webp', dev: true },
    port: { name: 'ท่าเรือ', img: 'places/port.webp', dev: true },
    biz: { name: 'ย่านธุรกิจ', img: 'places/biz.webp', dev: true }
  };
  // เมนูงานอาชีพ ณ สถานที่ทำงาน
  function careerOpts(key, back) {
    const st = S(), out = [];
    for (const [id, C0] of Object.entries(D.CAREERS)) {
      if (C0.place !== key) continue;
      const c = st.jobs.career;
      if (c && c.id === id) {
        const sh = G.careerShiftNow(), L = C0.levels[c.level];
        out.push({ icon: C0.icon, label: `เข้ากะ: ${C0.name} · ${L.title}`, sub: sh && !sh.why ? `${UI.mins(sh.mins)} · วันทำงานรอบนี้ ${c.days}/${C0.fullDays}${sh.late ? ' · มาสาย ผลงานลดลง' : ''}${sh.night ? ' · กะดึก +15%' : ''}` : '', disabled: sh && sh.why ? sh.why : null,
          onClick: () => W.act(`ทำงาน: ${C0.name}`, sh.mins, { energy: C0.flight ? -2.6 : -2.2, stress: 2.4, social: 3, hunger: 1 }, 'idle', () => { G.careerWorked(sh.mins, sh); G.toast(`เลิกงานแล้ว · นับเป็นวันทำงาน (${S().jobs.career.days}/${C0.fullDays})`, 'good'); back(); }, { hide: true, icon: C0.icon }) });
      } else {
        const why = G.careerWhy(id);
        out.push({ icon: C0.icon, label: `สมัครงาน${C0.name}`, sub: `${C0.levels[0].title} ฿${C0.levels[0].salary.toLocaleString()}/เดือน · ${C0.desc}${C0.fee ? ` · ค่าอบรม ${fmt(C0.fee)}` : ''}`, disabled: why,
          onClick: () => { G.applyCareer(id); back(); } });
        if (C0.feeLoan && !why) out.push({ icon: '🎓', label: `สมัคร${C0.name} (ผ่อนค่าเรียนเป็นหนี้การศึกษา)`, sub: `เพิ่มหนี้ ${fmt(C0.fee)} ดอกเบี้ยต่ำ`, onClick: () => { G.applyCareer(id, true); back(); } });
      }
    }
    return out;
  }
  UI.placeMenu = function (key) {
    const P = PLACES[key]; const st = S();
    const here = Object.keys(D.NPCS).filter(id => W.npcPlace(id) === key);
    const back = () => UI.placeMenu(key);
    const opts = [];
    if (key === 'park' || key === 'beach') {
      const beach = key === 'beach';
      opts.push(
        { icon: '🚶', label: beach ? 'เดินเล่นริมหาด' : 'เดินเล่นรอบสระน้ำ', sub: '60 นาที · ความเครียด− สุขภาพ+', onClick: () => W.act('เดินเล่น', 60, { happy: 10, stress: -16, energy: -5, health: 4 }, 'idle', back, { hide: true, icon: '🚶' }) },
        { icon: '🏃', label: 'วิ่งออกกำลังกาย', sub: '45 นาที · สุขภาพ++', onClick: () => W.act('วิ่ง', 45, { health: 18, stress: -20, energy: -30, hygiene: -38, hunger: -8 }, 'idle', back, { hide: true, icon: '🏃' }) },
        { icon: beach ? '🌊' : '🌇', label: beach ? 'เล่นน้ำทะเล' : 'นั่งชมวิวริมน้ำ', sub: '30 นาที · ความสุข+', onClick: () => W.act(beach ? 'เล่นน้ำทะเล' : 'นั่งชมวิว', 30, { happy: 18, stress: -14, hygiene: beach ? -10 : 0 }, 'idle', back, { hide: true }) },
        { icon: '🧺', label: 'ปิกนิก', sub: Object.keys(st.inv.food).length ? 'ใช้อาหารในกระเป๋า 1 อย่าง · 45 นาที' : 'ต้องมีอาหารในกระเป๋า', disabled: Object.keys(st.inv.food).length ? null : 'ไม่มีอาหารในกระเป๋า', onClick: () => { const id = Object.keys(st.inv.food)[0]; const it = D.ITEMS[id]; st.inv.food[id]--; if (!st.inv.food[id]) delete st.inv.food[id]; W.act('ปิกนิก', 45, { happy: 16, stress: -10, social: here.length ? 10 : 2 }, 'idle', () => { G.applyEff(it.eff); back(); }, { hide: true }); } });
    }
    if (key === 'rest') {
      opts.push({ icon: '🍽️', label: 'สั่งอาหารและนั่งทาน', sub: `เปิด ${G.shopHours('cafe')} · พนักงาน: ${D.NPCS.fah.name}`, disabled: G.shopOpen('cafe') ? null : 'ร้านปิดอยู่', onClick: () => UI.openShop('cafe') });
      opts.push({ icon: '🧑‍🍳', label: 'สมัครพาร์ตไทม์เสิร์ฟอาหาร 4 ชม.', sub: 'ชั่วโมงละ ฿70 + ทิป · ทักษะการสื่อสาร+', disabled: G.shopOpen('cafe') && G.hour() + 4 <= D.SHOPS.cafe.close ? null : 'นอกเวลาร้าน', onClick: () => UI.serveShift() });
    }
    if (key === 'mall') {
      const go = (sc, shop) => () => { if (!G.shopOpen(shop)) return G.toast('ร้านปิดอยู่ · เปิด ' + G.shopHours(shop), 'bad'); UI.fade(() => W.enter(sc, 'door')); };
      for (const [sc, shop, ic, sub] of [['super_in', 'super', '🛒', 'อาหารสด วัตถุดิบ ของใช้'], ['hg_in', 'general', '🛋️', 'เฟอร์นิเจอร์ ของแต่งบ้าน'], ['elec_in', 'elec', '📺', 'ทีวี ตู้เย็น แล็ปท็อป มือถือ'], ['clothes_in', 'clothes', '👜', 'เสื้อผ้า รองเท้า กระเป๋า']])
        opts.push({ icon: ic, label: 'เข้า' + D.SHOPS[shop].name, sub: `${sub} · เปิด ${G.shopHours(shop)}`, disabled: G.shopOpen(shop) ? null : 'ร้านปิดอยู่', onClick: go(sc, shop) });
      opts.push({ icon: '🛍️', label: 'เดินห้างช้อปปิ้งเล่น', sub: '60 นาที · ความสุข+ (ใช้เงิน ~฿300)', onClick: () => { if (G.pay(300, 'เดินห้างซื้อของเล็กน้อย', 'ช้อปปิ้ง')) W.act('เดินห้าง', 60, { happy: 14, stress: -8, energy: -6, social: 4 }, 'idle', back, { hide: true, icon: '🛍️' }); } });
    }
    if (P.dev) opts.push({ icon: '🚧', label: P.name + ' · อยู่ระหว่างพัฒนา', sub: 'สถานที่นี้มีบนแผนที่แล้ว กิจกรรมภายในจะเพิ่มในอัปเดตถัดไป', disabled: 'อยู่ระหว่างพัฒนา' });
    if (key === 'bank') opts.push({ icon: '🏦', label: 'ทำธุรกรรมการเงิน', sub: 'ฝาก ถอน โอน ชำระหนี้ (เหมือนแอปธนาคาร)', onClick: () => UI.openFinance() });
    if (key === 'airport') opts.push({ icon: '🧳', label: 'เที่ยวบินโดยสาร', sub: 'การท่องเที่ยวต่างเมือง', disabled: 'อยู่ระหว่างพัฒนา' });
    opts.push(...careerOpts(key, back));
    if (key === 'moto') opts.push({ icon: '🛵', label: 'ดูสกู๊ตเตอร์และบิ๊กไบค์', sub: `เปิด ${G.shopHours('moto')} · พนักงาน: ${D.NPCS.mek.name}`, disabled: G.shopOpen('moto') ? null : 'ร้านปิดอยู่', onClick: () => UI.openShop('moto') },
      { icon: '🔧', label: 'ซ่อมบำรุงรถยนต์/มอเตอร์ไซค์', sub: 'เช็กสภาพ ล้างรถ ชาร์จแบต', onClick: () => UI.garageMenu() });
    for (const id of here) { const N = D.NPCS[id]; opts.push({ icon: '💬', label: `คุยกับ${N.name} (${N.role})`, sub: `ความสัมพันธ์: ${G.relLabel(st.rel[id].v)}`, onClick: () => UI.talk({ id, x: 0, y: 0, virtual: true }, back) }); }
    opts.push({ icon: '↩️', label: W.key === 'street' && !['police', 'bank', 'airport'].includes(key) && !P.dev ? 'กลับไปที่ถนน' : 'ออกจากที่นี่ (แผนที่)', sub: '', onClick: () => { if (W.key !== 'street' || ['police', 'bank', 'airport'].includes(key) || P.dev) UI.openMap(); } });
    UI.choices(P.name, here.length ? `ตอนนี้มีคนรู้จักอยู่ที่นี่ ${here.length} คน` : '', opts);
    if (P.img) { const sh = $('#modal .sheet-body'); if (sh) sh.prepend(h('img.placeimg', { src: 'assets/' + P.img, alt: P.name })); }
  };
  UI.serveShift = function () {
    const wage = 70 * G.jobMul();
    W.act('พาร์ตไทม์เสิร์ฟอาหาร', 240, { energy: -5, stress: 2.5, social: 6, hunger: -1 }, 'idle', () => {
      const tip = Math.round(G.rnd(40, 220) * (1 + G.skillLv('comm') * .08));
      G.earn(wage * 4 + tip, `ค่าแรงเสิร์ฟอาหาร 4 ชม. + ทิป ${fmt(tip)}`, 'รายได้งาน', 'cash'); S().jobs.shifts++; G.addRel('fah', 3);
      G.toast(`ได้ค่าแรง ${fmt(wage * 4)} + ทิป ${fmt(tip)} (เงินสด)`, 'good');
    }, { hide: true, icon: '🧑‍🍳', onTick: m => G.addXP('comm', m / 60 * 8) });
  };
  UI.garageMenu = function () {
    const st = S(), opts = [];
    if (st.car) {
      const cost = Math.round((100 - st.car.cond) * 95 * (G.has('careful') ? .85 : 1));
      opts.push({ icon: '🔧', label: `ซ่อมบำรุงรถยนต์ (${fmt(cost)})`, sub: `สภาพตอนนี้ ${Math.round(st.car.cond)}% · ขับมาแล้ว ${Math.round(st.car.km)} กม.`, onClick: () => G.repairCar() });
      opts.push({ icon: '🧽', label: 'ล้างรถ (฿150)', sub: '30 นาที · สภาพรถ +2', onClick: () => { if (G.pay(150, 'ล้างรถ', 'รถ')) W.act('รอล้างรถ', 30, { happy: 8 }, 'idle', () => { st.car.cond = G.clamp(st.car.cond + 2); }, { hide: true }); } });
    } else opts.push({ icon: '🚗', label: 'ยังไม่มีรถยนต์', sub: 'ซื้อได้ที่โชว์รูมรถยนต์', disabled: true });
    if (st.bike || st.bigbike) opts.push({ icon: '🛵', label: 'เช็กและชาร์จ/เติมน้ำมันมอเตอร์ไซค์ (฿60)', sub: '15 นาที', onClick: () => { if (G.pay(60, 'เช็กมอเตอร์ไซค์', 'ค่าเดินทาง')) W.act('เช็กมอเตอร์ไซค์', 15, {}, 'idle', null, { hide: true }); } });
    UI.choices('ศูนย์บริการ Moto Hub', 'ช่างเมฆดูแลรถให้ทุกคัน', opts);
  };

  // ---------------- คลินิก โรงพยาบาล โรงแรม ----------------
  UI.clinicMenu = function () {
    const nd = S().player.needs, doc = W.npcs.find(x => x.id === 'thana'), nida = W.npcs.find(x => x.id === 'nida');
    const tips = [];
    if (nd.health < 50) tips.push('สุขภาพต่ำ แนะนำพักผ่อนให้พอและพบแพทย์');
    if (nd.stress > 60) tips.push('ความเครียดสูง ลองนั่งสมาธิหรือเดินเล่นในสวน');
    if (nd.energy < 30) tips.push('ดูเหนื่อยมาก นอนให้ได้ 7–8 ชั่วโมงนะ');
    if (!tips.length) tips.push('ดูแข็งแรงดี วิตามินรวมช่วยลดโอกาสป่วยได้ 30 วัน');
    UI.choices('คลินิกและร้านยาใบเตย', 'ค่าบริการเป็นเงินในเกม', [
      { icon: '💬', label: 'ปรึกษาเภสัชกร (ฟรี)', sub: '10 นาที', onClick: () => W.act('ปรึกษาเภสัชกร', 10, { stress: -6 }, 'idle', () => { if (nida) W.say(nida, tips[0], 6); else G.toast('เภสัชกรแนะนำ: ' + tips[0], 'good'); G.addRel('nida', 2); }, { face: 'back' }) },
      { icon: '🩺', label: 'พบแพทย์ตรวจอาการ (฿650)', sub: '45 นาที · สุขภาพ +30 · ความเครียด−', disabled: doc ? null : 'แพทย์เข้าเวร 09:00–20:00', onClick: () => { if (G.pay(650, 'ค่าตรวจรักษาที่คลินิก', 'ยา/สุขภาพ')) W.act('พบแพทย์', 45, { health: 40, stress: -8 }, 'idle', () => { W.say(doc, 'พักผ่อนเยอะ ๆ ดื่มน้ำมาก ๆ นะครับ', 4); G.addRel('thana', 2); }, { face: 'back' }); } },
      { icon: '💊', label: 'ซื้อยาและวิตามิน', sub: 'เปิดหน้าร้านยา', onClick: () => UI.openShop('pharm') }
    ]);
  };
  UI.hospitalMenu = function () {
    const st = S();
    UI.choices('โรงพยาบาลเมือง', 'ลงทะเบียนที่เคาน์เตอร์ · ค่าบริการเป็นเงินในเกม', [
      { icon: '📋', label: 'ตรวจสุขภาพประจำปี (฿2,500)', sub: '2 ชั่วโมง · สุขภาพ +20 · ลดโอกาสป่วย 60 วัน', onClick: () => { if (G.pay(2500, 'ตรวจสุขภาพประจำปี', 'ยา/สุขภาพ')) W.act('ตรวจสุขภาพ', 120, { health: 10, stress: -2 }, 'idle', () => { st.buffs.vitamin = Math.max(st.buffs.vitamin || 0, G.day() + 60); G.toast('ผลตรวจปกติ ป้องกันการป่วยถึงวันที่ ' + (G.day() + 60), 'good'); }, { hide: true, icon: '🏥' }); } },
      { icon: '🚑', label: 'รักษาอาการป่วย (฿3,800)', sub: '3 ชั่วโมง · สุขภาพฟื้นเต็ม', onClick: () => { if (G.pay(3800, 'ค่ารักษาพยาบาล', 'ยา/สุขภาพ')) W.act('รักษาตัว', 180, { health: 30, energy: 4, stress: -4 }, 'idle', () => G.applyEff({ health: 100 }), { hide: true, icon: '🏥' }); } },
      { icon: '🧠', label: 'พบนักจิตวิทยา (฿1,500)', sub: '60 นาที · ความเครียด −40', onClick: () => { if (G.pay(1500, 'ปรึกษานักจิตวิทยา', 'ยา/สุขภาพ')) W.act('ปรึกษานักจิตวิทยา', 60, { stress: -40, happy: 10 }, 'idle', null, { hide: true }); } }
    ]);
  };
  UI.hotelMenu = function () {
    UI.choices('โรงแรม The Oasis', 'บริการสำหรับผู้เข้าพักและบุคคลทั่วไป', [
      { icon: '🛏️', label: 'พักค้างคืนห้องดีลักซ์ (฿2,400)', sub: 'นอนถึง 08:00 · พลังงานเต็ม · ความสุข+', onClick: () => { const h = G.hour() + G.minute() / 60; const m = Math.round(((h >= 8 ? 32 : 8) - h) * 60); if (G.pay(2400, 'ห้องพักโรงแรม 1 คืน', 'ท่องเที่ยว')) W.act('พักที่โรงแรม', Math.max(120, m), { energy: 16, stress: -6, happy: 3, health: 1 }, 'idle', () => G.applyEff({ hygiene: 100 }), { hide: true, icon: '🛏️' }); } },
      { icon: '💆', label: 'สปาและนวด (฿1,200)', sub: '90 นาที · ความเครียด −45', onClick: () => { if (G.pay(1200, 'สปาโรงแรม', 'ท่องเที่ยว')) W.act('ทำสปา', 90, { stress: -30, happy: 12, hygiene: 20 }, 'idle', null, { hide: true }); } },
      { icon: '🍱', label: 'บุฟเฟต์อาหารนานาชาติ (฿890)', sub: '90 นาที · ความอิ่มเต็ม · ความสุข+', onClick: () => { if (G.pay(890, 'บุฟเฟต์โรงแรม', 'อาหาร')) W.act('ทานบุฟเฟต์', 90, { happy: 10, social: 6 }, 'idle', () => G.applyEff({ hunger: 100 }), { hide: true }); } },
      { icon: '🧳', label: 'สมัครงานพนักงานโรงแรมรายวัน', sub: '6 ชม. · ฿650 + ทักษะการสื่อสาร', disabled: G.hour() >= 8 && G.hour() <= 14 ? null : 'รับสมัครช่วง 08:00–14:00', onClick: () => W.act('ทำงานโรงแรม', 360, { energy: -5, stress: 2, social: 5 }, 'idle', () => { G.earn(Math.round(650 * G.jobMul()), 'ค่าแรงพนักงานโรงแรมรายวัน', 'รายได้งาน'); G.toast('ได้ค่าแรง ' + fmt(650 * G.jobMul()), 'good'); }, { hide: true, icon: '🧳', onTick: m => G.addXP('comm', m / 60 * 7) }) }
    ]);
  };

  // ---------------- ร้านค้า ----------------
  UI.openShop = function (key) {
    const sh = D.SHOPS[key]; const st = S();
    const N = D.NPCS[sh.staff];
    const state = { tier: {}, qty: {} };
    UI.sheet(sh.name, `เปิด ${G.shopHours(key)} · พนักงาน: ${N.name}`, (body, re) => {
      if (!G.shopOpen(key)) { body.append(h('p.warnline', `ร้านปิดแล้ว เปิดอีกครั้ง ${String(sh.open).padStart(2, '0')}:00 น.`)); return; }
      body.append(h('div.staffline', portraitEl(W.npcCid(sh.staff), 48), h('div', h('b', N.name), h('p', UI.fixQ(G.pick(D.LINES.shopWelcome).replace(/\{p\}/g, N.polite))))));
      if (key === 'cafe') body.append(h('div.jobstrip', icon('🧑‍🍳'), h('span', 'รับพาร์ตไทม์เสิร์ฟอาหาร 4 ชั่วโมง · ชั่วโมงละ ฿70 + ทิป'), h('button', { disabled: G.hour() + 4 > sh.close ? true : null, onclick: () => { UI.close(); UI.serveShift(); } }, G.hour() + 4 > sh.close ? 'ใกล้ปิดร้านแล้ว' : 'เริ่มทำกะเลย')));
      if (sh.job) {
        const h0 = G.hour();
        body.append(h('div.jobstrip', icon('🧑‍🍳'), h('span', 'รับพนักงานรายกะ 4 ชั่วโมง · ชั่วโมงละ ฿62'), h('button', { disabled: h0 + 4 > sh.close ? true : null, onclick: () => { UI.close(); shiftWork(); } }, h0 + 4 > sh.close ? 'ใกล้ปิดร้านแล้ว' : 'เริ่มทำกะเลย')));
      }
      const grid = h('div.shopgrid');
      for (const code of sh.items) {
        if (code.startsWith('c:')) { grid.append(carCard(code.slice(2), re)); continue; }
        const tier = state.tier[code] || 0;
        const it = G.shopItem(code, tier);
        const card = h('div.item');
        let art;
        if (it.kind === 'furn') art = h('img.art', { src: 'assets/furniture/' + D.FURN_TYPES[it.type].sprite + '.webp', alt: it.name, onerror: e => e.target.replaceWith(h('span.art.emoji', '🪑')) });
        else art = h('span.art.emoji', it.icon || '🛍️');
        card.append(art, h('b', it.name));
        if (it.kind === 'furn') {
          const T = D.FURN_TYPES[it.type];
          card.append(h('div.tiers', D.TIERS.map((t, i) => h('button.tier' + (i === tier ? '.on' : ''), { onclick: () => { state.tier[code] = i; re(); } }, t.name))));
          const owned = st.home.furn.filter(f => f.type === it.type);
          card.append(h('small', `ฟื้นฟูเร็วขึ้น ×${D.TIERS[tier].q}${owned.length ? ' · มีแล้ว ' + owned.length + ' ชิ้น' : ''}`));
          void T;
        } else if (it.eff) card.append(h('small', Object.entries(it.eff).map(([k, v]) => `${G.NEEDS[k]} ${v > 0 ? '+' : ''}${v}`).join(' · ')));
        if (it.desc) card.append(h('small', it.desc));
        const ownedItem = (it.kind === 'item' && st.inv.items[it.id]) || (it.kind === 'pet' && st.pet);
        const stack = ['food', 'ingredient', 'med'].includes(it.kind);
        const q = state.qty[code] || 1;
        const foot = h('div.buy', h('span.price', fmt(it.price * q)));
        if (stack) foot.append(h('span.qty', h('button', { onclick: () => { state.qty[code] = Math.max(1, q - 1); re(); }, 'aria-label': 'ลด' }, '−'), h('span', q), h('button', { onclick: () => { state.qty[code] = Math.min(20, q + 1); re(); }, 'aria-label': 'เพิ่ม' }, '+')));
        const afford = G.liquid() >= it.price * q;
        foot.append(h('button.primary', { disabled: ownedItem || !afford ? true : null, onclick: () => {
          if (it.kind === 'cafe') { if (G.pay(it.price, 'ซื้อ' + it.name, 'อาหาร')) { UI.close(); W.act('ทาน' + it.name, it.mins, { social: 6 }, 'sit', () => { G.applyEff(it.eff); }, W.seatFor()); } return; }
          if (G.buy(code, { tier, qty: q })) { W.player.pose = 'buy'; G.toast(`ซื้อ${it.name}แล้ว · เหลือเงินพร้อมใช้ ${fmt(G.liquid())}`, 'good'); G.addRel(sh.staff, .5); G.addXP('sales', 1); re(); }
        } }, ownedItem ? 'มีแล้ว' : !afford ? 'เงินไม่พอ' : it.kind === 'cafe' ? 'สั่งและนั่งทาน' : 'ซื้อ'));
        card.append(foot);
        grid.append(card);
      }
      body.append(grid, h('div.walletline', `เงินสด ${fmt(st.money.cash)} · บัญชี ${fmt(st.money.bank)} — จ่ายด้วยเงินสดก่อน ส่วนที่เหลือตัดจากบัญชี`));
    }, { wide: true });
  };
  function carCard(id, re) {
    const c = D.CARS[id], st = S();
    const inst = Math.round(c.price * .75 * (1 + .028 * 5) / 60);
    return h('div.item.car', h('span.art.emoji', id === 'suv' ? '🚙' : id === 'eco' ? '🚗' : '🚘'), h('b', c.name), h('span.price', fmt(c.price)),
      h('small', `ค่าน้ำมัน ~${c.fuel} บาท/กม. · ประกัน+บำรุง ${fmt(c.upkeep)}/เดือน`),
      h('small', `ผ่อน: ดาวน์ 25% (${fmt(c.price * .25)}) + ${fmt(inst)} × 60 งวด`),
      st.car ? h('small.why', st.car.id === id ? 'คันนี้เป็นรถของคุณ' : 'มีรถอยู่แล้ว') : null,
      h('div.buy', h('button', { disabled: st.car || G.liquid() < c.price ? true : null, onclick: () => { if (G.buyCar(id, false)) re(); } }, 'ซื้อเงินสด'),
        h('button.primary', { disabled: st.car || G.liquid() < c.price * .25 ? true : null, onclick: () => { if (G.buyCar(id, true)) re(); } }, 'ผ่อนชำระ')),
      st.car && st.car.id === id ? h('button.ghost', { onclick: () => { G.sellCar(); re(); } }, `ขายรถคืน (ประมาณ ${fmt(st.car.value * (st.car.cond / 100 * .3 + .7))})`) : null);
  }
  function shiftWork() {
    const wage = 62 * G.jobMul();
    W.act('ทำกะที่ซูเปอร์มาร์เก็ต', 240, { energy: -4.5, stress: 2, social: 5, hunger: -1 }, 'work', () => {
      G.earn(wage * 4, 'ค่าแรงกะซูเปอร์มาร์เก็ต 4 ชม.', 'รายได้งาน', 'cash'); S().jobs.shifts++; G.addRel('mali', 3);
      G.toast(`ได้ค่าแรง ${fmt(wage * 4)} (เงินสด)`, 'good');
    }, { face: 'back', onTick: m => { G.addXP('sales', m / 60 * 10); G.addXP('comm', m / 60 * 5); }, onCancel: p => { const pay = Math.floor(p * 4) * wage; if (pay) G.earn(pay, 'ค่าแรงกะ (ทำไม่ครบ)', 'รายได้งาน', 'cash'); } });
  }

  // ---------------- กระเป๋า ----------------
  UI.openBag = function () {
    const st = S(); const state = { tab: 'food' };
    UI.sheet('กระเป๋าและของใช้', '', (body, re) => {
      UI.tabs(body, [['food', 'อาหาร'], ['med', 'ยา'], ['items', 'ของใช้'], ['furn', 'เฟอร์นิเจอร์'], ['car', 'ยานพาหนะ']], state, re);
      const list = h('div.rows');
      if (state.tab === 'food') {
        list.append(h('div.row', icon('🥬'), h('span.grow', `วัตถุดิบทำอาหาร ${st.inv.ingr} มื้อ`), h('small.muted', 'ใช้ทำอาหารที่ครัวในบ้าน')));
        for (const [id, q] of Object.entries(st.inv.food)) { const it = D.ITEMS[id]; list.append(h('div.row', icon(it.icon), h('span.grow', `${it.name} × ${q}`), h('button', { onclick: () => { st.inv.food[id]--; if (!st.inv.food[id]) delete st.inv.food[id]; UI.close(); W.act('กิน' + it.name, it.mins, {}, 'idle', () => G.applyEff(it.eff)); } }, 'กินเลย'))); }
        if (!Object.keys(st.inv.food).length) list.append(h('p.muted', 'ไม่มีอาหารพร้อมทาน ซื้อได้ที่ซูเปอร์มาร์เก็ตต้นไม้'));
      }
      if (state.tab === 'med') {
        for (const [id, q] of Object.entries(st.inv.meds)) { const it = D.ITEMS[id]; list.append(h('div.row', icon(it.icon), h('span.grow', `${it.name} × ${q}`), h('button', { onclick: () => { st.inv.meds[id]--; if (!st.inv.meds[id]) delete st.inv.meds[id]; G.applyEff(it.eff); if (it.buff) { st.buffs[it.buff] = G.day() + 30; } G.toast('ใช้' + it.name + 'แล้ว', 'good'); re(); } }, 'ใช้'))); }
        if (!Object.keys(st.inv.meds).length) list.append(h('p.muted', 'ไม่มียา ซื้อได้ที่ร้านยาใบเตย'));
        if (st.buffs.vitamin >= G.day()) list.append(h('p.goodline', `วิตามินช่วยป้องกันการป่วยถึงวันที่ ${st.buffs.vitamin}`));
      }
      if (state.tab === 'items') {
        for (const id of Object.keys(st.inv.items)) { const it = D.ITEMS[id]; list.append(h('div.row', icon(it.icon), h('span.grow', h('b', it.name), h('small', it.desc || '')))); }
        if (st.pet) list.append(h('div.row', icon('🐩'), h('span.grow', h('b', st.pet.name), h('small', `ความสุข ${Math.round(st.pet.joy)} · อาหารเหลือ ${st.inv.petfood || 0} วัน (ถ้าหมดจะซื้ออัตโนมัติวันละ ฿50)`))));
        if (!list.children.length) list.append(h('p.muted', 'ยังไม่มีของใช้พิเศษ'));
      }
      if (state.tab === 'furn') {
        for (const f of st.home.furn) { const T = D.FURN_TYPES[f.type]; list.append(h('div.row', h('img.mini', { src: 'assets/furniture/' + T.sprite + '.webp', alt: '' }), h('span.grow', h('b', T.name), h('small', `ระดับ${D.TIERS[f.tier].name} · ${f.fixed ? 'ติดตั้งถาวร' : f.placed ? 'วางในบ้านแล้ว' : 'เก็บในคลัง'}`)))); }
        list.append(h('button.primary', { onclick: () => UI.openDecor() }, 'ตกแต่งบ้าน'));
      }
      if (state.tab === 'car') {
        if (st.car) { const c = D.CARS[st.car.id]; list.append(h('div.row', icon('🚗'), h('span.grow', h('b', c.name), h('small', `สภาพ ${Math.round(st.car.cond)}% · มูลค่า ${fmt(st.car.value)} · ${st.car.loan ? 'กำลังผ่อน' : 'ปลอดภาระ'} · ขับ ${Math.round(st.car.km)} กม.`)))); }
        if (st.bike) list.append(h('div.row', icon('🛵'), h('span.grow', 'สกู๊ตเตอร์ไฟฟ้า · ขี่ได้เมื่อเลือกเดินทางด้วยสกู๊ตเตอร์')));
        if (st.bigbike) list.append(h('div.row', icon('🏍️'), h('span.grow', 'บิ๊กไบค์ 650 ซีซี')));
        if (!st.car && !st.bike && !st.bigbike) list.append(h('p.muted', 'ยังไม่มียานพาหนะ เดินหรือขึ้นรถโดยสารได้'));
      }
      body.append(list);
    });
  };

  // ---------------- ตกแต่งบ้าน ----------------
  UI.openDecor = function () {
    const st = S();
    if (!W.scene || !W.scene.furnHome) return G.toast('ต้องอยู่ในบ้านจึงจะตกแต่งได้', 'warn');
    const state = { tab: 'all' };
    UI.sheet('ตกแต่งบ้าน', `${st.home.name || 'บ้านของฉัน'} · เลือกชิ้นแล้วลากไปวาง หมุนให้ตรงมุมห้อง บันทึกอัตโนมัติ`, (body, re) => {
      const cats = ['ห้องนอน', 'ห้องนั่งเล่น', 'ห้องครัว', 'ห้องน้ำ', 'ห้องทำงาน', 'ของตกแต่ง'];
      UI.tabs(body, [['all', 'ทั้งหมด'], ['store', 'ในคลัง']].concat(cats.map(c => [c, c])), state, re);
      const list = h('div.rows');
      const furn = st.home.furn.filter(f => D.FURN_TYPES[f.type]).filter(f => state.tab === 'all' ? true : state.tab === 'store' ? !f.placed : D.FURN_TYPES[f.type].cat === state.tab);
      furn.sort((x, y) => (x.placed === y.placed ? 0 : x.placed ? 1 : -1));
      for (const f of furn) {
        const T = D.FURN_TYPES[f.type];
        list.append(h('div.row', h('img.mini', { src: 'assets/furniture/' + T.sprite + '.webp', alt: '' }), h('span.grow', h('b', T.name), h('small', `${T.cat} · ระดับ${D.TIERS[f.tier || 0].name} · ${f.placed ? 'วางอยู่ในบ้าน' : 'อยู่ในคลัง'}`)),
          h('button.primary', { onclick: () => { UI.close(); W.startPlace(f); } }, f.placed ? 'ย้าย/หมุน' : 'วาง'),
          f.placed ? h('button', { onclick: () => { W.storeFurn(f); re(); } }, 'เก็บ') : null));
      }
      if (!furn.length) list.append(h('p.muted', state.tab === 'store' ? 'คลังว่าง · ของที่ซื้อใหม่หรือเก็บไว้จะอยู่ที่นี่' : 'ไม่มีเฟอร์นิเจอร์ในหมวดนี้'));
      body.append(list, h('p.muted', 'ซื้อเฟอร์นิเจอร์เพิ่มได้ที่ร้านเฟอร์นิเจอร์ในห้าง และเครื่องใช้ไฟฟ้าที่ร้านเครื่องใช้ไฟฟ้า ของที่ซื้อจะเข้าคลังของบ้าน'),
        h('div.btnrow', h('button.ghost', { onclick: () => UI.openMap() }, 'เปิดแผนที่ไปห้าง')));
    });
  };

  // ---------------- งาน ----------------
  UI.openJobs = function (tab) {
    const st = S(); const state = { tab: tab || 'office', mode: 'walk', offers: null };
    UI.sheet('งานและรายได้', 'เลือกงานที่เหมาะกับเวลาและทักษะของคุณ', (body, re) => {
      UI.tabs(body, [['office', 'งานประจำ'], ['career', 'อาชีพ (ตำรวจ ธนาคาร ช่าง การบิน)'], ['freelance', 'ฟรีแลนซ์'], ['ride', 'ขับรถรับส่ง'], ['delivery', 'ส่งอาหาร/พัสดุ'], ['shift', 'งานร้านค้า'], ['biz', 'ธุรกิจ'], ['skills', 'ทักษะ']], state, re);
      const box = h('div.panel');
      if (state.tab === 'office') {
        const o = st.jobs.office, J = D.JOBS.office;
        box.append(h('p.muted', J.desc));
        if (!o) box.append(h('div.cardrow', h('div.kv', h('span', 'เงินเดือนเริ่มต้น'), h('b', fmt(J.levels[0].salary))), h('div.kv', h('span', 'เวลาทำงาน'), h('b', 'จ.–ศ. 09:00–17:00'))), h('button.primary', { onclick: () => { G.applyOffice(); re(); } }, 'สมัครงาน (ออนไลน์)'));
        else {
          const L = J.levels[o.level], need = G.officePromoNeed();
          box.append(h('div.cardrow', h('div.kv', h('span', 'ตำแหน่ง'), h('b', L.title)), h('div.kv', h('span', 'เงินเดือน'), h('b', fmt(L.salary))), h('div.kv', h('span', 'วันทำงานรอบนี้'), h('b', o.days + ' / 22 วัน')), h('div.kv', h('span', 'วันจ่ายเงินเดือนถัดไป'), h('b', 'วันที่ ' + G.dom(G.officeNext()) + ' เดือน ' + G.month(G.officeNext())))));
          box.append(progress('ผลงานสู่การเลื่อนตำแหน่ง', o.perf / need.perf, `${Math.round(o.perf)} / ${need.perf} · ต้องมีทักษะสื่อสารระดับ ${need.comm} (ตอนนี้ ${G.skillLv('comm')})`));
          box.append(h('p.muted', 'ทำงานอย่างน้อย 4 ชั่วโมงต่อวันจึงนับเป็นวันทำงาน · ขาดงานวันธรรมดาผลงานจะลดลง · หักประกันสังคม 5% (สูงสุด ฿750)'));
          box.append(h('div.btnrow', h('button.primary', { onclick: () => UI.openMap() }, 'ไปออฟฟิศ (แผนที่)'), h('button.ghost', { onclick: () => { G.quitOffice(); re(); } }, 'ลาออก')));
        }
      }
      if (state.tab === 'career') {
        const c = st.jobs.career;
        if (c) {
          const C0 = D.CAREERS[c.id], L = C0.levels[c.level], need = G.careerPromoNeed();
          box.append(h('div.cardrow', h('div.kv', h('span', 'อาชีพ'), h('b', C0.name)), h('div.kv', h('span', 'ตำแหน่ง'), h('b', L.title)), h('div.kv', h('span', 'เงินเดือน'), h('b', fmt(L.salary))), h('div.kv', h('span', 'วันทำงานรอบนี้'), h('b', `${c.days} / ${C0.fullDays} วัน`)), h('div.kv', h('span', 'จ่ายเงินเดือนถัดไป'), h('b', 'วันที่ ' + G.dom(G.careerNext()) + ' เดือน ' + G.month(G.careerNext())))));
          box.append(progress('ผลงานสู่การเลื่อนตำแหน่ง', c.perf / need.perf, `${Math.round(c.perf)} / ${need.perf} · ต้องมีทักษะ${D.SKILLS[need.skill].name}ระดับ ${need.lv} (ตอนนี้ ${G.skillLv(need.skill)})`));
          box.append(h('p.muted', C0.desc + ' · ทำงานกะละ 4 ชม. ขึ้นไปจึงนับวัน · หักประกันสังคม 5%'));
          box.append(h('div.btnrow', h('button.primary', { onclick: () => UI.openMap(C0.place) }, 'ไปที่ทำงาน (แผนที่)'), h('button.ghost', { onclick: () => { G.quitCareer(); re(); } }, 'ลาออก')));
        } else box.append(h('p.muted', 'สมัครที่สถานที่ทำงานจริงบนแผนที่ หรือกดสมัครด้านล่าง · ทำงานประจำได้ทีละงาน'));
        for (const [id, C0] of Object.entries(D.CAREERS)) {
          if (c && c.id === id) continue;
          const why = G.careerWhy(id);
          box.append(h('div.row', icon(C0.icon), h('span.grow', h('b', C0.name), h('small', `${C0.levels[0].title} ${fmt(C0.levels[0].salary)} → ${C0.levels[C0.levels.length - 1].title} ${fmt(C0.levels[C0.levels.length - 1].salary)}`), h('small', C0.desc + (C0.fee ? ` · ค่าอบรม ${fmt(C0.fee)}` : '')), why ? h('small.why', why) : null),
            h('button.primary', { disabled: why ? true : null, onclick: () => { G.applyCareer(id); re(); } }, 'สมัคร'),
            C0.feeLoan ? h('button', { disabled: why ? true : null, onclick: () => { G.applyCareer(id, true); re(); } }, 'สมัคร (ผ่อนค่าเรียน)') : null));
        }
      }
      if (state.tab === 'freelance') {
        const atDesk = !!W.deskAt(), laptop = st.inv.items.laptop;
        box.append(h('p.muted', 'ทำที่โต๊ะทำงานในบ้าน หรือที่ไหนก็ได้ถ้ามีแล็ปท็อป · งานใหม่ทุก 2 วัน'));
        if (!atDesk && !laptop) box.append(h('p.warnline', W.key === 'home_in' ? 'ยังไม่มีโต๊ะทำงานในบ้าน ซื้อได้ที่ร้านของใช้ลายทาง หรือซื้อแล็ปท็อปเพื่อทำงานได้ทุกที่' : 'ต้องอยู่ที่โต๊ะทำงานในบ้าน หรือมีแล็ปท็อปจึงจะรับงานได้'));
        for (const g of st.jobs.gigs) {
          const lv = G.skillLv(g.skill), pay = G.gigPay(g);
          const why = lv < g.need ? `ต้องมีทักษะ${D.SKILLS[g.skill].name}ระดับ ${g.need} (ตอนนี้ ${lv})` : g.laptop && !laptop ? 'งานนี้ต้องใช้แล็ปท็อป' : (!atDesk && !laptop) ? 'ต้องอยู่ที่โต๊ะทำงานหรือมีแล็ปท็อป' : null;
          box.append(h('div.row', icon(D.SKILLS[g.skill].icon), h('span.grow', h('b', g.name), h('small', `${g.hours} ชม. · ใช้ทักษะ${D.SKILLS[g.skill].name} ${g.need ? 'ระดับ ' + g.need + '+' : ''}${g.laptop ? ' · ต้องใช้แล็ปท็อป' : ''}`), why ? h('small.why', why) : null), h('span.price', fmt(pay)),
            h('button.primary', { disabled: why ? true : null, onclick: () => {
              UI.close(); st.jobs.gigs = st.jobs.gigs.filter(x => x !== g);
              const at = W.deskAt() || {};
              W.act('ฟรีแลนซ์: ' + g.name, g.hours * 60, { energy: -5, stress: 2.5, hunger: -1 }, 'work', () => { G.earn(pay, 'ค่าจ้างฟรีแลนซ์: ' + g.name, 'รายได้งาน'); st.jobs.gigsDone++; G.toast(`ส่งงานแล้ว ได้รับ ${fmt(pay)} เข้าบัญชี`, 'good'); }, Object.assign({ onTick: m => G.addXP(g.skill, m / 60 * 14), icon: '🧑‍💻' }, at));
            } }, 'รับงาน')));
        }
        if (!st.jobs.gigs.length) box.append(h('p.muted', 'ทำงานหมดแล้ว งานใหม่จะมาในอีกไม่กี่วัน'));
      }
      if (state.tab === 'ride') {
        if (!st.car) box.append(h('p.warnline', 'ต้องมีรถยนต์ก่อน ซื้อหรือผ่อนได้ที่โชว์รูมล้อทอง'));
        else if (st.car.cond < 15) box.append(h('p.warnline', 'สภาพรถต่ำเกินไป ซ่อมที่อู่ในย่านร้านค้ามุมสวนก่อน'));
        else {
          state.offers = state.offers && state.offers.kind === 'ride' ? state.offers : { kind: 'ride', list: G.rideOffers() };
          box.append(h('p.muted', `เลือกเที่ยวรับส่ง · ค่าน้ำมันคิดจากระยะทาง (รถของคุณ ~${D.CARS[st.car.id].fuel} บาท/กม.) · สภาพรถ ${Math.round(st.car.cond)}%`));
          for (const o of state.offers.list) box.append(h('div.row', icon('🧍'), h('span.grow', h('b', `${o.a} → ${o.b}`), h('small', `${o.km} กม. · ${mins(o.mins)} · ค่าน้ำมัน ~${fmt(o.fuel)}`)), h('span.price', fmt(o.fare)),
            h('button.primary', { onclick: () => { UI.close(); W.act('รับส่งผู้โดยสาร', o.mins, { stress: 3, energy: -4, social: 6 }, 'sit', () => { G.earn(o.fare, `ค่าโดยสาร ${o.a} → ${o.b}`, 'รายได้งาน'); G.pay(o.fuel, 'ค่าน้ำมัน (รับส่งผู้โดยสาร)', 'รถ') || G.bill(o.fuel, 'ค่าน้ำมัน', 'รถ'); G.useCar(o.km * 1.3); st.jobs.rides++; G.toast(`ได้ค่าโดยสาร ${fmt(o.fare)} · ค่าน้ำมัน ${fmt(o.fuel)}`, 'good'); }, { route: { a: o.a, b: o.b, icon: '🚗' }, icon: '🚗' }); } }, 'รับงาน')));
          box.append(h('button.ghost', { onclick: () => { state.offers = null; re(); } }, 'ดูงานใหม่'));
        }
      }
      if (state.tab === 'delivery') {
        const modes = [['walk', '🚶 เดินส่ง', true], ['bike', '🛵 มอเตอร์ไซค์ไฟฟ้า', st.bike], ['car', '🚗 รถยนต์', !!st.car]];
        box.append(h('div.seg', modes.map(([k, l, ok]) => h('button' + (state.mode === k ? '.on' : ''), { disabled: ok ? null : true, onclick: () => { state.mode = k; state.offers = null; re(); } }, l + (ok ? '' : ' (ยังไม่มี)')))));
        state.offers = state.offers && state.offers.kind === state.mode ? state.offers : { kind: state.mode, list: G.deliveryOffers(state.mode) };
        for (const o of state.offers.list) box.append(h('div.row', icon('📦'), h('span.grow', h('b', `รับจาก${o.a}`), h('small', `${o.km} กม. · ${mins(o.mins)}${o.fuel ? ' · ค่าพลังงาน ~' + fmt(o.fuel) : ''}`)), h('span.price', fmt(o.pay)),
          h('button.primary', { onclick: () => { UI.close(); W.act('ส่งของจาก' + o.a, o.mins, { energy: o.mode === 'walk' ? -14 : -5, stress: 2, hunger: -2, hygiene: o.mode === 'walk' ? -10 : -3 }, o.mode === 'walk' ? 'walk' : 'sit', () => { G.earn(o.pay, 'ค่าส่งของจาก' + o.a, 'รายได้งาน'); if (o.fuel) G.pay(o.fuel, 'ค่าน้ำมัน/ไฟ (ส่งของ)', 'ค่าเดินทาง'); if (o.mode === 'car') G.useCar(o.km * 1.6); G.addXP(o.mode === 'walk' ? 'comm' : 'drive', 6); st.jobs.deliveries++; G.toast(`ส่งสำเร็จ ได้ ${fmt(o.pay)}`, 'good'); }, { route: { a: o.a, b: 'ลูกค้า', icon: o.mode === 'walk' ? '🚶' : o.mode === 'bike' ? '🛵' : '🚗' }, icon: '📦' }); } }, 'รับงาน')));
        box.append(h('button.ghost', { onclick: () => { state.offers = null; re(); } }, 'ดูงานใหม่'));
      }
      if (state.tab === 'shift') {
        box.append(h('p', D.JOBS.shift_super.desc), h('p.muted', `ทำไปแล้ว ${st.jobs.shifts} กะ · ได้เงินสดทันทีเมื่อจบกะ · ใช้ทักษะการขาย`));
        box.append(W.key === 'super_in' ? h('button.primary', { onclick: () => { UI.close(); if (!G.shopOpen('super') || G.hour() + 4 > D.SHOPS.super.close) return G.toast('ร้านใกล้ปิดหรือปิดแล้ว', 'warn'); shiftWork(); } }, 'เริ่มทำกะ 4 ชั่วโมง') : h('button.primary', { onclick: () => UI.openMap() }, 'ไปซูเปอร์มาร์เก็ต (ย่านร้านค้ามุมสวน)'));
      }
      if (state.tab === 'biz') { box.append(h('p.muted', 'เปิดหรือบริหารธุรกิจของตัวเองได้ที่หน้า "ลงทุน" แท็บธุรกิจ')); box.append(h('button.primary', { onclick: () => UI.openInvest('biz') }, 'ไปที่ธุรกิจของฉัน')); }
      if (state.tab === 'skills') {
        for (const k in D.SKILLS) box.append(progress(`${D.SKILLS[k].icon} ${D.SKILLS[k].name} · ระดับ ${G.skillLv(k)}`, G.skillProg(k), skillHint(k)));
      }
      body.append(box);
    }, { wide: true });
  };
  const skillHint = k => ({ comm: 'พูดคุย ทำงานออฟฟิศ เรียนออนไลน์', drive: 'ขับรถ รับส่งผู้โดยสาร', finance: 'อ่านหนังสือ ข่าวการเงิน ลงทุน', cook: 'ทำอาหารที่บ้าน', tech: 'ฟรีแลนซ์ เรียนออนไลน์ ทำงานออฟฟิศ', sales: 'ทำกะร้านค้า ธุรกิจ' })[k];
  function progress(label, p, sub) {
    p = Math.max(0, Math.min(1, p || 0));
    return h('div.prog', h('div.pl', h('span', label), h('b', Math.round(p * 100) + '%')), h('div.pbar', h('i', { style: { width: p * 100 + '%' } })), sub ? h('small', sub) : null);
  }
  UI.progress = progress;

  // ---------------- การเงิน ----------------
  UI.openFinance = function (tab) {
    const st = S(); const state = { tab: tab || 'over', range: 'today' };
    UI.sheet('การเงินของฉัน', 'ทุกการรับ–จ่ายถูกบันทึกอัตโนมัติ', (body, re) => {
      UI.tabs(body, [['over', 'ภาพรวม'], ['acct', 'บัญชีและโอนเงิน'], ['ledger', 'รายการเงิน'], ['sum', 'สรุปรายวัน/เดือน'], ['debt', 'หนี้สิน']], state, re);
      const box = h('div.panel');
      if (state.tab === 'over') {
        const nw = G.netWorth();
        box.append(h('div.hero', h('span', 'มูลค่าทรัพย์สินสุทธิ'), h('b.big' + (nw < 0 ? '.neg' : ''), fmt(nw))));
        box.append(h('div.cardrow', kv('เงินสด', fmt(st.money.cash)), kv('บัญชีใช้จ่าย', fmt(st.money.bank)), kv('บัญชีออมทรัพย์', fmt(st.money.savings)), kv('หนี้รวม', fmt(G.debtTotal()), 'neg')));
        const fx = G.fixedTotal(), pv = G.passiveTotal();
        box.append(progress('อิสรภาพทางการเงิน: รายได้จากสินทรัพย์ ÷ ค่าใช้จ่ายประจำ', pv / fx, `${fmt(pv)} / ${fmt(fx)} ต่อเดือน`));
        const two = h('div.two');
        two.append(h('div', h('h4', 'ค่าใช้จ่ายประจำต่อเดือน'), table(G.fixedCosts().map(r => [r[0], fmt(r[1])]), ['รวม', fmt(fx)])));
        const pr = G.passive();
        two.append(h('div', h('h4', 'รายได้จากสินทรัพย์ต่อเดือน (คาดการณ์)'), pr.length ? table(pr.map(r => [r[0], fmt(r[1])]), ['รวม', fmt(pv)]) : h('p.muted', 'ยังไม่มี ลองเริ่มจากหุ้นปันผลหรือห้องเช่าในหน้าลงทุน')));
        box.append(two);
        box.append(h('h4', 'ทรัพย์สิน'), table(G.assets().map(r => [r[0], fmt(r[1])]), ['หักหนี้สิน', fmt(-G.debtTotal())]));
      }
      if (state.tab === 'acct') {
        box.append(h('div.cardrow', kv('เงินสด (กระเป๋า)', fmt(st.money.cash)), kv('บัญชีใช้จ่าย', fmt(st.money.bank)), kv('บัญชีออมทรัพย์ 1.5%/ปี', fmt(st.money.savings))));
        box.append(h('p.muted', 'เงินออมแยกจากเงินใช้จ่าย ร้านค้าจะไม่ตัดจากบัญชีออม แต่ยังนับเป็นทรัพย์สินของคุณ'));
        const f = h('form.transfer', { onsubmit: e => { e.preventDefault(); const fd = new FormData(f); if (fd.get('from') === fd.get('to')) return G.toast('เลือกบัญชีต้นทางและปลายทางให้ต่างกัน', 'bad'); G.transfer(fd.get('from'), fd.get('to'), +fd.get('amt')); re(); } },
          h('label', 'จาก', sel('from', 'bank')), h('label', 'ไป', sel('to', 'savings')), h('label', 'จำนวน', h('input#tamt', { name: 'amt', type: 'number', min: 1, step: 1, value: 1000, inputmode: 'numeric' })), h('button.primary', { type: 'submit' }, 'โอนเงิน'));
        box.append(f, h('div.btnrow', [500, 1000, 5000, 10000].map(v => h('button.chip', { onclick: () => { $('#tamt').value = v; } }, fmt(v)))),
          h('div.btnrow', h('button', { onclick: () => { G.transfer('bank', 'cash', 1000); re(); } }, 'ถอนเงินสด ฿1,000 (ATM)'), h('button', { onclick: () => { G.transfer('cash', 'bank', Math.floor(st.money.cash)); re(); } }, 'ฝากเงินสดทั้งหมด')));
      }
      if (state.tab === 'ledger') {
        box.append(h('div.seg', [['today', 'วันนี้'], ['week', '7 วัน'], ['month', 'เดือนนี้'], ['all', 'ทั้งหมด']].map(([k, l]) => h('button' + (state.range === k ? '.on' : ''), { onclick: () => { state.range = k; re(); } }, l))));
        const d = G.day(), m = G.month();
        const rows = st.ledger.filter(r => state.range === 'all' || (state.range === 'today' ? r.d === d : state.range === 'week' ? r.d > d - 7 : G.month(r.d) === m)).slice(0, 200);
        const t = h('div.tablewrap', h('table.ledger', h('thead', h('tr', h('th', 'เวลา'), h('th', 'รายการ'), h('th', 'หมวด'), h('th.num', 'จำนวน'))),
          h('tbody', rows.map(r => h('tr', h('td', `ว.${r.d} ${G.hm(r.t)}`), h('td', r.desc, r.acct ? h('small', ' · ' + r.acct) : null), h('td', r.cat), h('td.num' + (r.amt > 0 ? '.pos' : r.amt < 0 ? '.neg' : ''), r.amt ? (r.amt > 0 ? '+' : '') + fmt(r.amt) : '—'))))));
        box.append(rows.length ? t : h('p.muted', 'ยังไม่มีรายการในช่วงนี้'));
      }
      if (state.tab === 'sum') {
        const d = G.day(); const today = st.days[d] || { inc: 0, exp: 0, cats: {} };
        box.append(h('h4', `วันนี้ (วันที่ ${G.dom()} เดือน ${G.month()})`), h('div.cardrow', kv('รายรับ', fmt(today.inc), 'pos'), kv('รายจ่าย', fmt(today.exp), 'neg'), kv('คงเหลือสุทธิ', fmt(today.inc - today.exp))));
        const m = G.month(); const mc = {}; let mi = 0, me = 0;
        for (const k in st.days) if (G.month(+k) === m) { const x = st.days[k]; mi += x.inc; me += x.exp; for (const c in x.cats) mc[c] = (mc[c] || 0) + x.cats[c]; }
        box.append(h('h4', `เดือนที่ ${m}`), h('div.cardrow', kv('รายรับรวม', fmt(mi), 'pos'), kv('รายจ่ายรวม', fmt(me), 'neg'), kv('คงเหลือสุทธิ', fmt(mi - me))));
        box.append(table(Object.entries(mc).sort((a, b) => a[1] - b[1]).map(([c, v]) => [c, h('span.' + (v >= 0 ? 'pos' : 'neg'), fmt(v))])));
        // กราฟแท่ง 14 วัน
        const days = []; for (let x = Math.max(1, d - 13); x <= d; x++) days.push([x, st.days[x] || { inc: 0, exp: 0 }]);
        const mx = Math.max(100, ...days.map(([, v]) => Math.max(v.inc, v.exp)));
        box.append(h('h4', 'รายรับ–รายจ่าย 14 วันล่าสุด'), h('div.bars', { role: 'img', 'aria-label': 'กราฟรายรับรายจ่ายรายวัน' }, days.map(([x, v]) => h('div.bcol', { title: `วันที่ ${G.dom(x)}: รับ ${fmt(v.inc)} จ่าย ${fmt(v.exp)}` }, h('i.inc', { style: { height: v.inc / mx * 100 + '%' } }), h('i.exp', { style: { height: v.exp / mx * 100 + '%' } }), h('span', G.dom(x))))),
          h('div.legend', h('span.inc', 'รายรับ'), h('span.exp', 'รายจ่าย')));
      }
      if (state.tab === 'debt') {
        if (!st.debts.length) box.append(h('p.goodline', 'ไม่มีหนี้คงค้าง 🎉'));
        for (const dt of st.debts) {
          const id = 'pay_' + dt.id;
          box.append(h('div.debt', h('div.grow', h('b', dt.name), h('small', `คงเหลือ ${fmt(dt.bal)} · ดอกเบี้ย ${(dt.rate * 100).toFixed(2)}%/เดือน · ชำระขั้นต่ำ/งวด ${fmt(G.debtMin(dt))}`)),
            h('input', { id, type: 'number', min: 1, value: Math.round(Math.min(dt.bal, G.debtMin(dt))), inputmode: 'numeric', 'aria-label': 'จำนวนที่จะชำระ' }), h('button.primary', { onclick: () => { G.payDebt(dt.id, +$('#' + id).value); re(); } }, 'ชำระ')));
        }
        box.append(h('p.muted', 'ระบบจะตัดชำระขั้นต่ำทุกวันที่ 1 ของเดือน ถ้าเงินไม่พอจะกลายเป็นหนี้บัตรเครดิต (ดอกเบี้ย 1.5%/เดือน)'));
        box.append(h('h4', 'กู้เงินส่วนบุคคล'), h('div.debt', h('div.grow', h('small', 'วงเงินสูงสุด ฿150,000 · ดอกเบี้ย 1.2%/เดือน · ขั้นต่ำ 5% ของยอดคงเหลือ')), h('input#borrowAmt', { type: 'number', min: 1000, step: 1000, value: 10000, 'aria-label': 'จำนวนเงินกู้' }), h('button', { onclick: () => { G.borrow(+$('#borrowAmt').value); re(); } }, 'กู้เงิน')));
        if (!st.home.owned) box.append(h('h4', 'ซื้อบ้านที่อยู่ตอนนี้'), h('div.debt', h('div.grow', h('small', 'ราคา ฿1,800,000 · ดาวน์ ฿450,000 · ผ่อน ฿9,700/เดือน · เลิกจ่ายค่าเช่า ฿6,500')), h('button.primary', { disabled: G.liquid() < 450000 ? true : null, onclick: () => { G.buyHouse(); re(); } }, G.liquid() < 450000 ? 'เงินดาวน์ยังไม่พอ' : 'ซื้อบ้าน')));
      }
      body.append(box);
    }, { wide: true });
    function sel(name, v) { return h('select', { name }, ['cash', 'bank', 'savings'].map(a => h('option', { value: a, selected: a === v ? true : null }, G.acctName(a)))); }
  };
  function kv(k, v, cls) { return h('div.kv', h('span', k), h('b' + (cls ? '.' + cls : ''), v)); }
  function table(rows, total) { return h('div.tablewrap', h('table.simple', h('tbody', rows.map(r => h('tr', h('td', r[0]), h('td.num', r[1]))), total ? h('tr.total', h('td', total[0]), h('td.num', total[1])) : null))); }

  // ---------------- ลงทุน ----------------
  UI.openInvest = function (tab) {
    const st = S(); const state = { tab: tab || 'stock', q: {} };
    UI.sheet('การลงทุนและธุรกิจ', 'ข้อมูลจำลองในเกมเท่านั้น ราคาขึ้นลงได้และไม่รับประกันกำไร', (body, re) => {
      UI.tabs(body, [['stock', 'หุ้น'], ['div', 'ปฏิทินปันผล'], ['prop', 'สินทรัพย์ให้เช่า'], ['biz', 'ธุรกิจ']], state, re);
      const box = h('div.panel');
      if (state.tab === 'stock') {
        box.append(h('div.cardrow', kv('มูลค่าหุ้นที่ถือ', fmt(G.stockValue())), kv('เงินพร้อมลงทุน', fmt(G.liquid())), kv('ค่าธรรมเนียมซื้อขาย', (G.has('risky') ? '0.08' : G.weak('risky') ? '0.25' : '0.15') + '% (ขั้นต่ำ ฿10)')));
        for (const s of D.STOCKS) {
          const p = st.stocks.price[s.id], hist = st.stocks.hist[s.id], prev = hist[hist.length - 2] || p, ch = (p / prev - 1) * 100;
          const hd = st.stocks.hold[s.id]; const qid = 'q_' + s.id;
          const pl = hd ? hd.q * p - hd.cost : 0;
          box.append(h('div.stock', h('div.sym', h('b', s.id), h('small', s.name + ' · ' + s.sector)), spark(hist.concat([p])),
            h('div.px', h('b', p.toFixed(2)), h('small.' + (ch >= 0 ? 'pos' : 'neg'), (ch >= 0 ? '▲' : '▼') + Math.abs(ch).toFixed(2) + '%')),
            h('div.yd', h('small', s.divYield ? `ปันผล ${(s.divYield * 100).toFixed(0)}% ต่อปี (ของราคาหุ้น) · ${s.divFreq === 'month' ? 'แบ่งจ่ายทุกเดือน เดือนละ ' + (s.divYield * 100 / 12).toFixed(2) + '%' : 'แบ่งจ่ายทุก 6 เดือน ครั้งละ ' + (s.divYield * 100 / 2).toFixed(1) + '%'}` : 'ไม่จ่ายปันผล (เน้นเติบโต)'), hd ? h('small', `ถือ ${hd.q} หุ้น · ทุนเฉลี่ย ${(hd.cost / hd.q).toFixed(2)} · `, h('span.' + (pl >= 0 ? 'pos' : 'neg'), (pl >= 0 ? 'กำไร ' : 'ขาดทุน ') + fmt(pl))) : null),
            h('div.trade', h('input', { id: qid, type: 'number', min: 1, step: 1, value: 100, 'aria-label': 'จำนวนหุ้น ' + s.id }), h('button.primary', { onclick: () => { G.buyStock(s.id, +$('#' + qid).value); re(); } }, 'ซื้อ'), h('button', { disabled: hd ? null : true, onclick: () => { G.sellStock(s.id, +$('#' + qid).value); re(); } }, 'ขาย'))));
        }
        box.append(h('p.muted', 'ราคาเปลี่ยนทุกชั่วโมงในเกม (อัตราเติบโตเฉลี่ย 2–12% ต่อปีพร้อมความผันผวน) · ข้อมูลในเกมไม่ใช่คำแนะนำการลงทุนจริง'));
      }
      if (state.tab === 'div') {
        box.append(h('p.muted', 'อัตราปันผลแสดงเป็น % ต่อปีของราคาหุ้น · จ่ายวันที่ 15 · แบบรายเดือนจ่ายทุกเดือน (ปีละ 12 ครั้ง) · แบบ 6 เดือนจ่ายเดือนที่ 6 และ 12 · หักภาษี 10% · ยอดจริงขึ้นลงตามราคาหุ้นและผลประกอบการ (±15%) ไม่รับประกันผลตอบแทน'));
        const rows = D.STOCKS.filter(s => s.divYield).map(s => { const nd = G.nextDividend(s); const hd = st.stocks.hold[s.id]; const per = s.divFreq === 'month' ? 12 : 2; const est = hd ? hd.q * st.stocks.price[s.id] * s.divYield / per * .9 : 0; return [s.id + ' ' + s.name, `${(s.divYield * 100).toFixed(0)}% ต่อปี · ${s.divFreq === 'month' ? 'รายเดือน' : 'ทุก 6 เดือน'}`, nd ? `วันที่ 15 เดือน ${G.month(nd)} (อีก ${nd - G.day()} วัน)` : '-', hd ? fmt(est) : 'ยังไม่ถือ']; });
        box.append(h('div.tablewrap', h('table.simple', h('thead', h('tr', h('th', 'หุ้น'), h('th', 'อัตรา'), h('th', 'จ่ายครั้งถัดไป'), h('th.num', 'คาดว่าจะได้'))), h('tbody', rows.map(r => h('tr', r.map((c, i) => h(i === 3 ? 'td.num' : 'td', c))))))));
      }
      if (state.tab === 'prop') {
        for (const P of D.PROPERTIES) {
          const own = st.props.find(p => p.id === P.id);
          const net = P.rent * (1 - P.vacancy) - P.upkeep;
          box.append(h('div.asset', h('div.grow', h('b', P.name), h('small', P.desc),
            h('div.cardrow', kv('ราคา', fmt(P.price)), kv('ค่าเช่า/เดือน', fmt(P.rent)), kv('ค่าบำรุง/เดือน', fmt(P.upkeep)), kv('โอกาสห้องว่าง', Math.round(P.vacancy * 100) + '%'), kv('สุทธิเฉลี่ย/เดือน', fmt(net), 'pos'), kv('ผลตอบแทน/ปี', (net * 12 / P.price * 100).toFixed(1) + '%'))),
            own ? h('div.btnrow', h('small.goodline', `เป็นเจ้าของแล้ว · มูลค่าประมาณ ${fmt(G.propValue(own))} · ${own.occ ? 'มีผู้เช่า' : 'ว่างอยู่'}`), h('button.ghost', { onclick: () => { G.sellProp(P.id); re(); } }, 'ขาย'))
              : h('button.primary', { disabled: G.liquid() < P.price ? true : null, onclick: () => { G.buyProp(P.id); re(); } }, G.liquid() < P.price ? `เงินไม่พอ (ขาด ${fmt(P.price - G.liquid())})` : 'ซื้อ')));
        }
        box.append(h('p.muted', 'ความเสี่ยง: เดือนที่ไม่มีผู้เช่าจะไม่มีรายได้แต่ยังต้องจ่ายค่าบำรุง และอาจมีค่าซ่อมแซมฉุกเฉิน'));
      }
      if (state.tab === 'biz') bizPanel(box, re);
      body.append(box);
    }, { wide: true });
  };
  function spark(arr) {
    const c = document.createElement('canvas'); c.width = 180; c.height = 56; c.className = 'spark';
    const x = c.getContext('2d'); const a = arr.slice(-40); const mn = Math.min(...a), mx = Math.max(...a); const up = a[a.length - 1] >= a[0];
    const col = up ? '#7fd3a0' : '#f08a8a';
    x.strokeStyle = 'rgba(255,255,255,.08)'; x.beginPath(); x.moveTo(0, 28); x.lineTo(180, 28); x.stroke();
    x.beginPath(); a.forEach((v, i) => { const px = i / (a.length - 1) * 176 + 2, py = 52 - (v - mn) / (mx - mn || 1) * 48; i ? x.lineTo(px, py) : x.moveTo(px, py); });
    x.strokeStyle = col; x.lineWidth = 2; x.stroke();
    x.lineTo(178, 56); x.lineTo(2, 56); x.closePath(); x.fillStyle = up ? 'rgba(127,211,160,.15)' : 'rgba(240,138,138,.15)'; x.fill();
    const ly = 52 - (a[a.length - 1] - mn) / (mx - mn || 1) * 48; x.fillStyle = col; x.beginPath(); x.arc(178, ly, 3, 0, 7); x.fill();
    return c;
  }
  function bizPanel(box, re) {
    const st = S(), b = st.biz;
    if (!b) {
      box.append(h('p.muted', 'เลือกธุรกิจที่จะเริ่ม · ต้องจ้างพนักงานให้ครบจึงจะเปิดร้านได้เต็มที่ หรือไปช่วยงานเองที่ร้าน'));
      for (const [k, B] of Object.entries(D.BUSINESSES)) {
        const estRev = B.baseCust * B.ticket, estProfit = estRev * (1 - B.cogs) - B.rent / 30 - 480 * B.staffNeed;
        box.append(h('div.asset', h('div.grow', h('b', B.name), h('div.cardrow', kv('เงินลงทุน', fmt(B.cost)), kv('ค่าเช่า/เดือน', fmt(B.rent)), kv('ลูกค้าพื้นฐาน/วัน', B.baseCust + ' คน'), kv('ยอดต่อบิล', fmt(B.ticket)), kv('ต้นทุนสินค้า', Math.round(B.cogs * 100) + '%'), kv('กำไรคาดการณ์/วัน', '~' + fmt(estProfit)))),
          h('button.primary', { disabled: G.liquid() < B.cost ? true : null, onclick: () => { G.startBiz(k); re(); } }, G.liquid() < B.cost ? `เงินไม่พอ (ขาด ${fmt(B.cost - G.liquid())})` : 'เริ่มธุรกิจ')));
      }
      return;
    }
    const B = D.BUSINESSES[b.type], last = b.hist[b.hist.length - 1];
    box.append(h('h3', B.name), h('div.cardrow', kv('ความพึงพอใจลูกค้า', Math.round(b.sat) + '/100'), kv('พนักงาน', `${b.staff.length}/${B.staffNeed} คน`), kv('กำไรสะสม', fmt(b.profitTotal), b.profitTotal >= 0 ? 'pos' : 'neg'), kv('มูลค่ากิจการ', fmt(b.value))));
    if (last) box.append(h('h4', 'เมื่อวาน'), h('div.cardrow', kv('ลูกค้า', last.cust + ' คน'), kv('ยอดขาย', fmt(last.rev)), kv('ต้นทุนสินค้า', fmt(last.cogs), 'neg'), kv('ค่าแรง', fmt(last.wages), 'neg'), kv('ค่าเช่า (เฉลี่ยรายวัน)', fmt(last.rent), 'neg'), kv('กำไรสุทธิ', fmt(last.profit), last.profit >= 0 ? 'pos' : 'neg')));
    else box.append(h('p.muted', 'สรุปยอดขายจะคำนวณตอนเที่ยงคืนของทุกวัน'));
    if (b.hist.length) { const hs = b.hist.slice(-14); const mx = Math.max(100, ...hs.map(x => Math.abs(x.profit))); box.append(h('h4', 'กำไร/ขาดทุนรายวัน'), h('div.bars.pl', hs.map(x => h('div.bcol', { title: `กำไร ${fmt(x.profit)}` }, h('i.' + (x.profit >= 0 ? 'inc' : 'exp'), { style: { height: Math.abs(x.profit) / mx * 100 + '%' } }), h('span', G.dom(x.day)))))); }
    box.append(h('h4', 'พนักงานและตารางงาน'));
    for (const s of b.staff) box.append(h('div.row', icon('🧑‍🍳'), h('span.grow', h('b', s.name), h('small', `ฝีมือ ${s.skill} · ค่าจ้าง ${fmt(s.wage)}/วัน · กะ${s.shift}`)), h('button', { onclick: () => { G.toggleShift(s.name); re(); } }, 'สลับกะ'), h('button.ghost', { onclick: () => { G.fire(s.name); re(); } }, 'เลิกจ้าง')));
    const pool = D.STAFF_POOL.map((s, i) => [s, i]).filter(([s]) => !b.staff.find(x => x.name === s.name));
    box.append(h('div.hirepool', pool.map(([s, i]) => h('button.chip', { onclick: () => { G.hire(i); re(); } }, `จ้าง${s.name} (ฝีมือ ${s.skill}, ${fmt(s.wage)}/วัน)`))));
    box.append(h('h4', 'อัปเกรดร้าน'));
    for (const U of D.BIZ_UPGRADES) { const got = b.upgrades.includes(U.id); box.append(h('div.row', icon(got ? '✅' : '🛠️'), h('span.grow', h('b', U.name), h('small', Object.entries(U.eff).map(([k, v]) => ({ cust: 'ลูกค้า', sat: 'ความพึงพอใจ', speed: 'ความเร็วบริการ' })[k] + ' +' + Math.round(v * 100) + '%').join(' · '))), h('span.price', fmt(U.cost)), h('button.primary', { disabled: got || G.liquid() < U.cost ? true : null, onclick: () => { G.bizUpgrade(U.id); re(); } }, got ? 'มีแล้ว' : 'ซื้อ'))); }
    box.append(h('div.btnrow', h('button.primary', { onclick: () => { UI.close(); W.act('ช่วยงานที่' + B.name, 240, { energy: -7, stress: 2, social: 6 }, 'work', () => { b.ownerDay = G.day(); b.sat = G.clamp(b.sat + 3); G.toast('ช่วยงานที่ร้านแล้ว วันนี้ร้านมีคนพอ ลูกค้าพอใจขึ้น', 'good'); }, { onTick: m => G.addXP('sales', m / 60 * 12), icon: '🏪' }); } }, 'ไปช่วยงานที่ร้าน 4 ชม.'), h('button.ghost', { onclick: () => { G.sellBiz(); re(); } }, 'ขายกิจการ')));
  }

  // ---------------- ข่าวการเงิน ----------------
  UI.marketNews = function () {
    const st = S(); const s = G.pick(D.STOCKS); const hist = st.stocks.hist[s.id]; const ch = (st.stocks.price[s.id] / hist[Math.max(0, hist.length - 6)] - 1) * 100;
    G.toast(`📰 ${s.name} (${s.id}) ${ch >= 0 ? 'ขึ้น' : 'ลง'} ${Math.abs(ch).toFixed(1)}% ใน 5 วัน`, ch >= 0 ? 'good' : 'warn');
  };

  // ---------------- ความสัมพันธ์ ----------------
  UI.openRel = function (mode) {
    const st = S();
    const title = mode === 'love' ? 'ความรัก' : mode === 'friends' ? 'เพื่อน' : 'ความสัมพันธ์';
    const sub = mode === 'love' ? 'คนที่คบหาได้ (ไม่ใช่พนักงานร้าน) · ความสัมพันธ์ 90 ขึ้นไปขอสร้างครอบครัวได้ผ่านเมนูคุยกับคนนั้น' : mode === 'friends' ? 'คนที่คุณเคยคุยด้วยแล้ว · คุยและชวนทำกิจกรรมเพื่อเพิ่มความสนิท' : 'คนที่คุณรู้จักในเมือง · ความสัมพันธ์เพิ่มจากการพูดคุยและทำกิจกรรมด้วยกัน';
    UI.sheet(title, sub, body => {
      const g = h('div.relgrid');
      const ids = Object.keys(D.NPCS).filter(id => mode === 'love' ? !D.NPCS[id].staff : mode === 'friends' ? st.rel[id].met : true).sort((a, b) => st.rel[b].v - st.rel[a].v);
      if (!ids.length) body.append(h('p.muted', mode === 'friends' ? 'ยังไม่ได้คุยกับใคร · เดินไปหาคนในเมืองแล้วแตะเพื่อทักทาย' : 'ยังไม่มีรายชื่อ'));
      for (const id of ids) {
        const N = D.NPCS[id], r = st.rel[id];
        const loc = W.npcPlace(id);
        g.append(h('div.relcard' + (r.met ? '' : '.unmet'), portraitEl(W.npcCid(id), 56), h('div.grow', h('b', N.name + (st.family === id ? ' 💞' : '')), h('small', N.role), h('small', `${W.npcStatus(id)} · ${W.placeName(loc)}`),
          h('div.relbar', h('i', { style: { width: Math.max(0, r.v) + '%' } })), h('small', `${G.relLabel(r.v)} (${Math.round(r.v)})${r.met ? '' : ' · ยังไม่เคยคุย'}`))));
      }
      body.append(g);
      if (st.family) body.append(h('p.goodline', `คุณสร้างครอบครัวกับ${D.NPCS[st.family].name}แล้ว · ค่าสังคมลดช้าลง ความสุขเพิ่มขึ้น · มีค่าใช้จ่ายครอบครัว ฿3,000/เดือน`));
    }, { wide: true });
  };

  // ---------------- NPC ----------------
  UI.npcMenu = function (n) {
    const st = S(), N = D.NPCS[n.id], r = st.rel[n.id];
    n.talkingWith = W.t + 999;
    if (!n.virtual) W.faceTo(W.player, n.x, n.y);
    const done = () => { n.talkingWith = W.t + 1.5; };
    const opts = [
      { icon: '👋', label: 'ทักทาย', sub: 'ทักทายสั้น ๆ', onClick: () => { greet(n); done(); } },
      { icon: '💬', label: 'พูดคุย', sub: '10 นาที · ความสัมพันธ์และค่าสังคม+', onClick: () => UI.talk(n, done) },
      { icon: '💼', label: 'ถามเรื่องงาน', sub: 'ขอคำแนะนำเรื่องงานและรายได้', onClick: () => askJob(n, done) }
    ];
    if (N.staff && D.SHOPS[N.staff]) opts.push({ icon: '🛍️', label: 'ซื้อสินค้า', sub: D.SHOPS[N.staff].name, onClick: () => { done(); UI.openShop(N.staff); } });
    if (N.staff === 'garage') opts.push({ icon: '🔧', label: 'ให้ช่วยดูรถ', sub: 'ซ่อมบำรุง/ล้างรถ', onClick: () => { done(); W.useSpot({ act: 'garage' }); } });
    opts.push({ icon: '🎉', label: 'ชวนทำกิจกรรม', sub: 'ไปกาแฟ เดินเล่น ออกกำลังกาย กินข้าว', onClick: () => invite(n, done) });
    if (r.v >= 45 && !st.family && !N.staff) opts.push({ icon: '💞', label: 'จีบ / ชวนไปเดท', sub: 'ความสัมพันธ์ 45 ขึ้นไป · อาจได้รับการตอบรับหรือปฏิเสธ', onClick: () => flirt(n, done) });
    if (r.v >= 90 && !st.family && !N.staff) opts.push({ icon: '💞', label: 'ขอสร้างครอบครัวด้วยกัน', sub: 'ความสัมพันธ์ระดับคนพิเศษ', onClick: () => propose(n, done) });
    UI.choices(`${N.name} · ${N.role}`, `${G.relLabel(r.v)} (${Math.round(r.v)}) · สถานะ: ${n.state || 'ว่าง'}`, opts);
    const m = $('#modal'); m.querySelector('.scrim').addEventListener('click', done);
    m.querySelector('.x').addEventListener('click', done);
    m.querySelector('.sheet-head').prepend(portraitEl(W.npcCid(n.id), 52));
  };
  const pol = (id, s) => UI.fixQ(s.replace(/\{p\}/g, D.NPCS[id].polite || 'ค่ะ').replace(/\{n\}/g, S().player.name));
  function greet(n) {
    const st = S(), r = st.rel[n.id];
    const per = G.hour() < 11 ? 'morning' : G.hour() < 16 ? 'noon' : G.hour() < 20 ? 'evening' : 'night';
    W.player.pose = 'wave'; setTimeout(() => { if (W.player.pose === 'wave') W.player.pose = 'idle'; }, 1200);
    W.say(W.player, G.pick(['สวัสดี!', 'หวัดดีจ้า', 'สวัสดีครับ/ค่ะ']), 1.8);
    setTimeout(() => W.say(n, pol(n.id, G.pick(D.LINES.greet[per])), 3), 900);
    G.addRel(n.id, r.greetDay === G.day() ? .3 : 2); r.greetDay = G.day();
    G.applyEff({ social: 3 }); G.addXP('comm', 1);
  }
  UI.talk = function (n, after) {
    const st = S(), N = D.NPCS[n.id], r = st.rel[n.id];
    const topic = G.pick(D.LINES.smalltalk);
    const dia = $('#talk'); dia.hidden = false; dia.innerHTML = ''; W.modal = true;
    const finish = () => { dia.hidden = true; W.modal = false; after && after(); };
    if (!n.virtual) { W.say(n, pol(n.id, topic.q), 4); }
    dia.append(h('div.tport', portraitEl(W.npcCid(n.id), 64)), h('div.tbody', h('b', N.name), h('p', pol(n.id, topic.q)),
      h('div.tchoices', topic.a.map(([txt, val, trait]) => h('button', { onclick: () => {
        const tired = r.talkDay === G.day() && r.talks >= 3 ? .4 : 1;
        let d = (val * 2.5 + 1) * tired; let react = val >= 2 ? 'ใช่เลย! คิดเหมือนกัน' : val === 1 ? 'อืม ก็จริงนะ' : val < 0 ? 'เหรอ… ไม่ค่อยเห็นด้วยเท่าไหร่' : 'โอเค ๆ';
        if (trait && st.player.traits.includes(trait)) { d += 2; react = 'พูดแบบนี้แสดงว่าเป็นคน' + D.TRAITS[trait].name + 'แน่ ๆ ' + react; }
        if (trait && st.player.weak === trait) d -= 1;
        if (r.talkDay !== G.day()) { r.talkDay = G.day(); r.talks = 0; } r.talks++;
        W.say(W.player, txt, 2.6); if (!n.virtual) setTimeout(() => W.say(n, react, 3), 1200);
        G.addRel(n.id, d); G.applyEff({ social: 9, happy: val > 0 ? 3 : 0, stress: -2 }); G.addXP('comm', 5); G.advance(10);
        dia.querySelector('p').textContent = react; dia.querySelector('.tchoices').innerHTML = '';
        // สีหน้าตามผลการคุยและระดับความสัมพันธ์
        const emo = val >= 2 ? (r.v >= 60 ? 'love' : 'laugh') : val === 1 ? 'smile' : val < 0 ? 'pout' : 'normal';
        const tp = dia.querySelector('.tport'); if (tp) { tp.innerHTML = ''; tp.append(portraitEl(W.npcCid(n.id), 64, emo)); }
        if (!n.virtual) n.emo = { k: emo, until: W.t + 4 };
        W.player.emo = { k: val >= 1 ? 'happy' : val < 0 ? 'sad' : 'normal', until: W.t + 3 };
        dia.querySelector('.tchoices').append(h('small.muted', `ความสัมพันธ์ ${d >= 0 ? '+' : ''}${d.toFixed(1)} · ตอนนี้: ${G.relLabel(r.v)}`), h('button.primary', { onclick: finish }, 'จบบทสนทนา'));
      } }, txt)), h('button.ghost', { onclick: finish }, 'ขอตัวก่อนนะ'))));
  };
  function askJob(n, done) {
    const st = S(), N = D.NPCS[n.id];
    let line, act = null;
    if (n.id === 'boss') {
      if (!st.jobs.office) { line = 'ตอนนี้ฝ่ายปฏิบัติการรับคนอยู่ค่ะ เงินเดือนเริ่ม ฿16,500 สนใจไหมคะ?'; act = { label: 'สนใจครับ/ค่ะ สมัครเลย', f: () => { G.applyOffice(); W.say(n, 'ยินดีต้อนรับสู่ทีมค่ะ! เริ่มงานได้ที่โต๊ะทำงานเลย', 4); G.addRel('boss', 5); } }; }
      else { const need = G.officePromoNeed(); line = `ตั้งใจทำงานต่อไปนะคะ ผลงานตอนนี้ ${Math.round(st.jobs.office.perf)}/${need.perf} ถ้าทักษะการสื่อสารถึงระดับ ${need.comm} จะพิจารณาเลื่อนตำแหน่งให้ค่ะ`; }
    } else if (n.id === 'mali') { line = 'ร้านเรารับพนักงานรายกะ 4 ชั่วโมงค่ะ ชั่วโมงละ 62 บาท ถ้าว่างมาช่วยกันได้เลย'; if (W.key === 'super_in') act = { label: 'ขอทำกะเลย', f: () => { if (G.hour() + 4 > D.SHOPS.super.close) return G.toast('ใกล้ปิดร้านแล้ว', 'warn'); shiftWork(); } }; }
    else if (n.id === 'tan') line = st.car ? 'มีรถแล้วลองรับงานขับรถรับส่งดูครับ ช่วงเย็นคนเยอะ' : 'ถ้ามีรถ คุณจะรับงานขับรถรับส่งได้ เราผ่อนได้ ดาวน์แค่ 25% ครับ';
    else if (n.id === 'krit') line = 'แล็ปท็อปช่วยให้รับงานฟรีแลนซ์ได้ทุกที่ครับ งานใหญ่ ๆ ต้องใช้แล็ปท็อปทั้งนั้น';
    else line = pol(n.id, G.pick(D.LINES.jobTalk));
    if (!n.virtual) W.say(n, line, 6);
    G.addRel(n.id, .8); G.applyEff({ social: 3 });
    UI.choices(N.name + ' แนะนำเรื่องงาน', '', [{ icon: '💡', label: line, sub: '', disabled: true }].concat(act ? [{ icon: '✅', label: act.label, onClick: () => { act.f(); done(); } }] : []).concat([{ icon: '💼', label: 'เปิดเมนูงาน', onClick: () => { done(); UI.openJobs(); } }, { icon: '👍', label: 'ขอบคุณสำหรับคำแนะนำ', onClick: done }]));
  }
  function invite(n, done) {
    const st = S(), r = st.rel[n.id], N = D.NPCS[n.id];
    const opts = D.LINES.invite.map(iv => ({ icon: { coffee: '☕', walk: '🌳', workout: '🏃', dinner: '🍜' }[iv.id], label: iv.name, sub: `${UI.mins(iv.mins)} · ${iv.cost ? fmt(iv.cost) : 'ฟรี'}${iv.need ? ' · ต้องสนิทระดับ ' + iv.need + '+' : ''}`, disabled: r.v < iv.need ? 'ยังไม่สนิทพอ' : N.staff && n.state === 'ทำงาน' ? 'กำลังทำงานอยู่' : null,
      onClick: () => {
        const chance = .45 + r.v / 100 + (G.has('social') ? .15 : 0) - (st.player.needs.hygiene < 25 ? .25 : 0);
        if (Math.random() > chance) { W.say(n, pol(n.id, G.pick(['วันนี้ไม่สะดวกเลย ไว้คราวหน้านะ{p}', 'ขอโทษนะ{p} ติดธุระอยู่', 'คราวหน้าได้ไหม{p}'])), 3.5); G.addRel(n.id, -.5); done(); return; }
        if (iv.cost && !G.pay(iv.cost, `${iv.name}กับ${N.name}`, 'สังคม')) { done(); return; }
        W.say(n, pol(n.id, 'ไปสิ{p}! ดีเลย'), 2.5);
        W.act(`${iv.name}กับ${N.name}`, iv.mins, Object.fromEntries(Object.entries(iv.eff).map(([k, v]) => [k, v / iv.mins * 60])), iv.id === 'workout' ? 'exercise' : iv.id === 'walk' ? 'walk' : 'sit', () => { G.addRel(n.id, iv.rel); done(); W.say(n, pol(n.id, 'สนุกมากเลย ไว้ไปด้วยกันอีกนะ{p}'), 3); }, { icon: '🎉' });
      } }));
    UI.choices('ชวน' + N.name + 'ทำกิจกรรม', `โอกาสตอบรับขึ้นกับความสนิท (ตอนนี้ ${G.relLabel(r.v)})`, opts.concat([{ icon: '↩️', label: 'ไว้คราวหน้า', onClick: done }]));
  }
  // จีบ: โอกาสตอบรับขึ้นกับระดับความสัมพันธ์ (ไม่จำกัดเพศ) · ปฏิเสธได้อย่างสุภาพ ความสัมพันธ์ลดเล็กน้อย
  function flirt(n, done) {
    const st = S(), N = D.NPCS[n.id], r = st.rel[n.id];
    const p = Math.min(.92, .25 + (r.v - 45) / 60 + (st.player.traits.includes('social') ? .1 : 0));
    const ok = Math.random() < p;
    if (ok) { W.say(n, pol(n.id, G.pick(['เขินนะ… แต่ก็ดีใจ{p}', 'ไปสิ{p} ฉันก็อยากไปกับเธอ', 'ชอบเหมือนกัน{p}'])), 4); n.emo = { k: G.pick(['shy', 'love']), until: W.t + 5 }; W.player.emo = { k: 'happy', until: W.t + 4 }; G.addRel(n.id, 6); G.applyEff({ happy: 12, social: 10, stress: -6 }); G.toast(`${N.name} ตอบรับ! ความสัมพันธ์ +6`, 'good'); }
    else { W.say(n, pol(n.id, G.pick(['ขอโทษนะ{p} ตอนนี้ยังอยากเป็นเพื่อนกันก่อน', 'ขอบคุณ{p} แต่ยังไม่พร้อม', 'ยังไม่ใช่ตอนนี้นะ{p}'])), 4); n.emo = { k: 'shock', until: W.t + 4 }; W.player.emo = { k: 'sad', until: W.t + 4 }; G.addRel(n.id, -3); G.applyEff({ happy: -6 }); G.toast(`${N.name} ปฏิเสธอย่างสุภาพ · ความสัมพันธ์ −3 ลองใหม่เมื่อสนิทกันมากขึ้น`, 'warn'); }
    G.advance(15); done();
  }
  function propose(n, done) {
    const st = S(), N = D.NPCS[n.id];
    if (Math.random() < .12) { W.say(n, pol(n.id, 'ขอเวลาคิดอีกหน่อยนะ{p}'), 4); n.emo = { k: 'shy', until: W.t + 4 }; W.player.emo = { k: 'sad', until: W.t + 3 }; G.toast(`${N.name} ขอเวลาคิดก่อน ลองใหม่วันหลัง`, 'warn'); G.addRel(n.id, -1); return done(); }
    n.emo = { k: 'love', until: W.t + 6 }; W.player.emo = { k: 'love', until: W.t + 6 };
    W.say(n, pol(n.id, 'ฉันก็รู้สึกแบบเดียวกัน… ตกลง{p}!'), 5);
    st.family = n.id; G.applyEff({ happy: 30, social: 30, stress: -15 });
    st.goals.done.family = st.goals.done.family || G.day();
    G.emit('event', { title: '💞 ครอบครัวใหม่', text: `คุณกับ${N.name}ตัดสินใจใช้ชีวิตด้วยกัน ${N.name}จะกลับมาที่บ้านช่วงเย็นและวันหยุด · มีค่าใช้จ่ายครอบครัวเดือนละ ฿3,000`, choices: [{ t: 'อบอุ่นที่สุด' }] });
    done();
  }

  // ---------------- เหตุการณ์ ----------------
  const evQ = [];
  UI.event = function (ev) {
    if (ev.random && evQ.some(e => e.random)) return; // ไม่ให้เหตุการณ์สุ่มค้างซ้อนกัน
    evQ.push(ev);
  };
  setInterval(() => {
    if (!evQ.length || !$('#modal').hidden || !$('#talk').hidden || !G.S()) return;
    const ev = evQ.shift();
    UI.sheet(ev.title, ev.random ? 'เหตุการณ์สุ่ม · เลือกวิธีรับมือ' : '', body => {
      body.append(h('p.evtext', ev.text));
      const list = h('div.choices');
      for (const c of ev.choices) list.append(h('button.choice', { onclick: () => {
        const out = ev.random || c.money ? G.resolveChoice(ev, c) : (G.applyEff(c.eff || {}), []);
        if (out === null) return;
        body.innerHTML = ''; body.append(h('p.evtext', '“' + c.t + '”'), out.length ? h('ul.result', out.map(o => h('li', o))) : null, h('button.primary', { onclick: UI.close }, 'ตกลง'));
      } }, icon('➜'), h('span.ct', h('b', c.t), c.note ? h('small', c.note) : null)));
      body.append(list);
    }, { narrow: true, lock: true });
  }, 400);
  UI.pendingEvents = () => evQ.length;
  G.on('event', UI.event);

  // ---------------- เป้าหมาย ----------------
  UI.openGoals = function () {
    const st = S();
    UI.sheet('เป้าหมายชีวิต', 'เลือกได้สูงสุด 3 เป้าหมาย · ไม่จำเป็นต้องรวยอย่างเดียว', (body, re) => {
      for (const g of D.GOALS) {
        const on = st.goals.active.includes(g.id), done = st.goals.done[g.id];
        const [p, txt] = G.goalProgress(g.id);
        body.append(h('div.goal' + (on ? '.on' : '') + (done ? '.done' : ''), h('span.gi', g.icon), h('div.grow', h('b', g.name + (done ? ' · สำเร็จแล้ว ✓' : '')), h('small', g.desc), on || done ? progress('', done ? 1 : p, txt) : null),
          h('button' + (on ? '.ghost' : '.primary'), { onclick: () => { if (on) st.goals.active = st.goals.active.filter(x => x !== g.id); else { if (st.goals.active.length >= 3) return G.toast('เลือกได้สูงสุด 3 เป้าหมาย ยกเลิกอันเดิมก่อน', 'warn'); st.goals.active.push(g.id); } re(); } }, on ? 'เลิกติดตาม' : 'ตั้งเป็นเป้าหมาย')));
      }
    });
  };

  // ---------------- ตั้งค่า ----------------
  UI.openSettings = function () {
    const st = S(); let confirmNew = false;
    UI.sheet('ตั้งค่าและบันทึกเกม', 'เกมบันทึกอัตโนมัติทุก 2 ชั่วโมงในเกม และเมื่อปิดหน้า', (body, re) => {
      body.append(h('div.btnrow', h('button.primary', { onclick: () => G.save() }, '💾 บันทึกเกม'), h('button', { onclick: () => { if (G.load()) { UI.close(); W.enter(S().player.scene && D.SCENES[S().player.scene] ? S().player.scene : 'home_in'); G.toast('โหลดเกมล่าสุดแล้ว', 'good'); } else G.toast('ไม่พบเกมที่บันทึกไว้', 'bad'); } }, '📂 โหลดเกมล่าสุด')));
      body.append(h('h4', 'ชื่อตัวละคร'), h('div.btnrow', h('input#rename', { value: st.player.name, maxlength: 16, 'aria-label': 'ชื่อตัวละคร', oninput: e => { const v = UI.cleanName(e.target.value, true); if (v !== e.target.value) e.target.value = v; } }),
        h('button.primary', { onclick: () => { const v = UI.cleanName($('#rename').value); if (!v) { G.toast('กรุณาใส่ชื่อตัวละคร', 'bad'); return; } st.player.name = v; if (W.player) W.player.label = st.settings.labels ? v : ''; G.save(true); G.toast('เปลี่ยนชื่อเป็น ' + v + ' แล้ว', 'good'); } }, 'บันทึกชื่อ')));
      body.append(h('h4', 'การแสดงผล'),
        toggle('แสดงป้ายชื่อเหนือตัวละคร', st.settings.labels, v => { st.settings.labels = v; if (W.player) W.player.label = v ? st.player.name : ''; W.npcs.forEach(n => { n.label = v ? D.NPCS[n.id].name : ''; }); }),
        toggle('แสดงพื้นที่เดิน/สิ่งกีดขวาง (โหมดตรวจสอบ)', W.debug, v => { W.debug = v; }),
        toggle('แสดงเส้นถนน (Road Graph) และทางเท้า (Pedestrian Graph) บนแผนที่', !!W.debugMap, v => { W.debugMap = v; }),
        toggle('เสียงคลิกปุ่ม', !!st.settings.sound, v => { st.settings.sound = v; if (v) UI.click(); }),
        toggle('ลดการเคลื่อนไหวของเมนู (Reduced motion)', !!st.settings.reduce, v => { st.settings.reduce = v; UI.applyPrefs(); }),
        toggle('เปิดแผงสถานะตัวละครค้างไว้', statusOpen(), v => { st.settings.statusOpen = v; const s = $('#status'); if (s) s.classList.toggle('open', v); }),
        h('label.setrow', 'ภาษาป้ายเมนู (HUD)', h('select', { onchange: e => { st.settings.lang = e.target.value; UI.buildHUD(); UI.refreshHUD(); } }, [['th', 'ไทย'], ['en', 'English (เฉพาะป้ายเมนู)']].map(([v, l]) => h('option', { value: v, selected: (st.settings.lang || 'th') === v ? true : null }, l)))),
        h('label.setrow', 'ขนาดตัวอักษร', h('select', { onchange: e => { st.settings.text = +e.target.value; document.documentElement.style.fontSize = (16 * st.settings.text) + 'px'; } }, [[.9, 'เล็ก'], [1, 'ปกติ'], [1.12, 'ใหญ่'], [1.25, 'ใหญ่มาก']].map(([v, l]) => h('option', { value: v, selected: st.settings.text === v ? true : null }, l)))));
      body.append(h('h4', 'วิธีควบคุม'), h('ul.help', h('li', 'คลิก/แตะพื้นเพื่อเดิน · คลิกหมุดหรือคนเพื่อเดินไปโต้ตอบ'), h('li', 'W A S D หรือปุ่มลูกศรเพื่อเดิน · E หรือ Space เพื่อโต้ตอบสิ่งที่อยู่ใกล้'), h('li', 'ลากเพื่อเลื่อนกล้อง · ล้อเมาส์หรือหยิกสองนิ้วเพื่อซูม · Esc ปิดหน้าต่าง'), h('li', 'ปุ่มด้านบนกลางใช้หยุดเวลา/ปกติ/×2/×3 (ปุ่มลัด 0–3) · ระหว่างทำกิจกรรมเวลาจะเดินเร็วอัตโนมัติ'), h('li', 'ซ่อนปุ่มทั้งหมด: กดปุ่มรูปตามุมขวาบน ปุ่ม H หรือแตะหน้าจอพร้อมกันสองนิ้ว (แตะแล้วยกทันที ไม่ใช่บีบซูม) · เวลาและตัวละครยังเดินตามปกติ'), h('li', 'โหมดจัดวางเฟอร์นิเจอร์: R = หมุน · Enter = วาง · Esc = ยกเลิก')));
      body.append(h('h4', 'ข้อจำกัดของเวอร์ชันนี้'), h('ul.help', h('li', 'ตัวละครเป็นภาพนิ่งหลายมุม (หน้า เฉียง ข้าง หลัง นั่ง) ยังไม่มี sprite sheet เดินหลายเฟรม การเดินจึงใช้การโยกตัว ระบบรองรับการเพิ่มเฟรมเดินภายหลัง (ชื่อไฟล์ <รหัส>_<มุม>_walk0…n)'), h('li', 'ท่านอนใช้ภาพหน้าตรงวางราบบนที่นอนและห่มผ้า · ท่านั่งใช้ภาพนั่งที่แนบมา'), h('li', 'บ้านและซูเปอร์มาร์เก็ตประกอบจากฉากเปล่า + เฟอร์นิเจอร์แยกชิ้น · คลินิก โชว์รูม ออฟฟิศ โรงพยาบาล โรงแรม ใช้ภาพที่ตกแต่งแล้วพร้อมผนัง/เคาน์เตอร์บังตัวละคร'), h('li', 'ห้าง ร้านอาหาร Moto Hub สวน และชายหาด ยังเป็นเมนูพร้อมภาพหน้าสถานที่'), h('li', 'รถยนต์ยังไม่มีภาพในฉาก การขับรถแสดงเป็นแถบเส้นทาง · สกู๊ตเตอร์/บิ๊กไบค์ขี่ออกจากฉากถนนจริง'), h('li', 'หุ้น ปันผล ธุรกิจ และลอตเตอรี่เป็นเงินจำลองในเกมเท่านั้น ไม่รับประกันผลตอบแทน')));
      body.append(h('h4', 'สำรองเซฟ'), h('div.btnrow', h('button', { onclick: () => { const t = $('#saveText'); t.value = G.exportSave(); t.select(); try { navigator.clipboard.writeText(t.value).then(() => G.toast('คัดลอกข้อมูลเซฟแล้ว', 'good'), () => G.toast('เลือกข้อความแล้ว กดคัดลอกเองได้เลย', 'warn')); } catch (e) { /* เลือกข้อความไว้แล้ว */ } } }, 'ส่งออกเป็นข้อความ'), h('button', { onclick: () => { if (G.importSave($('#saveText').value)) { UI.close(); W.enter(S().player.scene in D.SCENES ? S().player.scene : 'home_in'); G.toast('นำเข้าเซฟแล้ว', 'good'); } } }, 'นำเข้าจากข้อความ')), h('textarea#saveText', { rows: 3, placeholder: 'วางข้อมูลเซฟที่นี่เพื่อนำเข้า', 'aria-label': 'ข้อมูลเซฟ' }));
      body.append(h('h4', 'เริ่มชีวิตใหม่'), confirmNew ? h('div.btnrow', h('span.warnline', 'ข้อมูลเกมนี้จะหายทั้งหมด ยืนยันไหม?'), h('button.danger', { onclick: () => { G.wipe(); location.reload(); } }, 'ยืนยัน เริ่มใหม่'), h('button', { onclick: () => { confirmNew = false; re(); } }, 'ยกเลิก')) : h('button.ghost', { onclick: () => { confirmNew = true; re(); } }, 'ลบเซฟและเริ่มใหม่'));
      body.append(h('h4', 'ทดสอบระบบ'), h('div.btnrow', h('button', { onclick: () => { UI.close(); G.triggerEvent(); } }, 'สุ่มเหตุการณ์ตอนนี้'), h('button', { onclick: () => { G.advance(60); G.toast('ข้ามเวลา 1 ชั่วโมง', 'good'); } }, 'ข้ามเวลา 1 ชม.'), h('button', { onclick: () => { const left = (24 - G.hour()) * 60 - G.minute() + 7 * 60; G.advance(left); G.toast('ข้ามไปเช้าวันถัดไป', 'good'); } }, 'ข้ามไปเช้าพรุ่งนี้')));
    });
  };
  function toggle(label, on, f) { const id = 't' + Math.random().toString(36).slice(2, 7); return h('label.setrow', { for: id }, label, h('input', { id, type: 'checkbox', checked: on ? true : null, onchange: e => f(e.target.checked) })); }

  // ---------------- หน้าเริ่มเกม/สร้างตัวละคร ----------------
  UI.title = function (onNew, onContinue) {
    const t = $('#title'); t.hidden = false;
    const info = G.saveInfo();
    t.querySelector('.tbtns').innerHTML = '';
    t.querySelector('.tbtns').append(...[info ? h('button.primary.big', { onclick: onContinue }, h('span', 'เล่นต่อ'), h('small', `${info.name} · วันที่ ${info.day} · ${fmt(info.money)}`)) : null, h('button' + (info ? '.ghostlight' : '.primary.big'), { onclick: onNew }, 'เริ่มชีวิตใหม่')].filter(Boolean));
  };
  // เซฟเดิมที่ใช้ตัวละครชุดก่อน: ให้เลือกตัวละครชุดใหม่ 1 ครั้ง (ข้อมูลอื่นทั้งหมดคงเดิม)
  UI.repick = function (onDone) {
    const st = S(); let pick = D.PLAYABLE[0].cid;
    UI.sheet('เลือกตัวละครชุดใหม่', `ตัวละครในเกมเปลี่ยนเป็นชุดใหม่แล้ว · ${st.player.name} เงิน งาน บ้าน และความสัมพันธ์ยังอยู่ครบ เลือกหน้าตาใหม่ 1 ครั้ง`, (body, re) => {
      body.append(h('div.pickgrid', D.PLAYABLE.map(pl => h('button.pick' + (pick === pl.cid ? '.on' : ''), { onclick: () => { pick = pl.cid; re(); }, 'aria-label': pl.name, title: pl.name }, portraitEl(pl.cid, 56), h('small', pl.name)))),
        h('div.btnrow', { style: { marginTop: '.8rem' } }, h('button.primary', { onclick: () => { st.player.cid = pick; G.save(true); UI.close(); onDone && onDone(); } }, 'ใช้ตัวละครนี้')));
    }, { lock: true });
  };
  UI.creator = function (onDone) {
    const cr = $('#creator'); cr.hidden = false;
    setTimeout(() => W.preloadChar(D.PLAYABLE[0].cid).then(() => { try { draw(); } catch (e) { /* ยังไม่พร้อม */ } }), 0);
    const st = { cid: D.PLAYABLE[0].cid, name: '', traits: ['diligent', 'frugal'], weak: 'risky', tab: 'char', view: 0 };
    const VIEWS = [['front', 'หน้า', false], ['front3q', 'เฉียงขวา', false], ['side', 'ขวา', false], ['back3q', 'หลังเฉียงขวา', false], ['back', 'หลัง', false], ['back3q_l', 'หลังเฉียงซ้าย', false], ['side_l', 'ซ้าย', false], ['front3q_l', 'เฉียงซ้าย', false], ['sitfloor', 'ท่านั่ง', false]];
    const draw = () => {
      const pv = cr.querySelector('.cpreview'); pv.innerHTML = '';
      const frame = h('div.cframe'); pv.append(frame);
      const V = VIEWS[st.view];
      frame.append(h('div.turn', h('button', { onclick: () => { st.view = (st.view + VIEWS.length - 1) % VIEWS.length; draw(); }, 'aria-label': 'มุมก่อนหน้า' }, '⟲'),
        h('span', 'มุม: ' + V[1]), h('button', { onclick: () => { st.view = (st.view + 1) % VIEWS.length; draw(); }, 'aria-label': 'มุมถัดไป' }, '⟳')));
      pv.append(h('div.cinfo', h('div.cname', st.name || 'ยังไม่ได้ตั้งชื่อ'), h('div.ctraits', st.traits.map(t => h('span.tchip', D.TRAITS[t].icon + ' ' + D.TRAITS[t].name)), st.weak ? h('span.tchip.weak', 'ท้าทาย: ' + D.TRAITS[st.weak].name) : null)));
      requestAnimationFrame(() => {
        const fi = C.frameInfo(st.cid, V[0]) || C.frameInfo(st.cid, 'front');
        const fh = frame.clientHeight - 60, fw = frame.clientWidth - 16;
        const hgt = Math.max(110, Math.min(fh * (V[0] === 'sitfloor' ? .8 : 1), fw * fi.h / fi.w));
        const c = bodyEl(st.cid, Math.round(hgt), V[0]);
        if (V[2]) c.style.transform = 'scaleX(-1)';
        frame.prepend(h('div.cstage', c));
      });
    };
    const panel = () => {
      const p = cr.querySelector('.cpanel'); const oldBody = p.querySelector('.cbody'); const keepScroll = oldBody && st.lastTab === st.tab ? oldBody.scrollTop : 0; st.lastTab = st.tab; p.innerHTML = '';
      p.append(h('div.tabs', [['char', 'เลือกตัวละคร'], ['traits', 'บุคลิก']].map(([k, l]) => h('button.tab' + (st.tab === k ? '.on' : ''), { onclick: () => { st.tab = k; panel(); } }, l))));
      const b = h('div.cbody'); p.append(b); requestAnimationFrame(() => { b.scrollTop = keepScroll; });
      if (st.tab === 'char') {
        b.append(h('div.copt', h('h4', h('label', { for: 'cname' }, 'ชื่อตัวละครของคุณ')), h('input#cname', { value: st.raw != null ? st.raw : st.name, maxlength: 16, autocomplete: 'off', placeholder: 'เช่น ใบเตย หรือ Mint', 'aria-describedby': 'cnamehint', oninput: e => { const v = UI.cleanName(e.target.value, true); if (v !== e.target.value) e.target.value = v; st.raw = v; st.name = UI.cleanName(v); st.nameErr = false; const hn = cr.querySelector('#cnamehint'); if (hn) { hn.textContent = UI.nameHint(st.name); hn.className = 'hint'; } cr.querySelector('.cname').textContent = st.name || 'ยังไม่ได้ตั้งชื่อ'; } }),
          h('small#cnamehint.hint' + (st.nameErr ? '.err' : ''), st.nameErr ? 'กรุณาตั้งชื่อตัวละครก่อนเริ่มเกม' : UI.nameHint(st.name))));
        b.append(h('h4', 'เลือกตัวละคร (ตัวสำเร็จรูป ' + D.PLAYABLE.length + ' แบบ)'));
        b.append(h('div.pickgrid', D.PLAYABLE.map(pl => h('button.pick' + (st.cid === pl.cid ? '.on' : ''), { onclick: () => { st.cid = pl.cid; W.preloadChar(pl.cid).then(() => { draw(); panel(); }); }, 'aria-label': pl.name, title: pl.name }, portraitEl(pl.cid, 58), h('small', pl.name)))));
        b.append(h('p.muted', 'ตัวละครเป็นภาพสำเร็จรูปหลายมุม (หน้า เฉียง ข้าง หลัง และท่านั่ง) จึงไม่มีการเปลี่ยนสีผม ตา คิ้ว หรือปาก · ชื่อที่ตั้งจะบันทึกไว้กับเซฟ'));
      }
      if (st.tab === 'traits') {
        b.append(h('p.muted', 'เลือกจุดเด่น 2 อย่าง และข้อท้าทาย 1 อย่าง · ส่งผลเล็กน้อยเท่านั้น ไม่ปิดกั้นอาชีพหรือกิจกรรม'));
        const grid = h('div.traitgrid');
        for (const [k, t] of Object.entries(D.TRAITS)) {
          const isS = st.traits.includes(k), isW = st.weak === k;
          grid.append(h('div.trait' + (isS ? '.on' : '') + (isW ? '.weak' : ''), h('b', t.icon + ' ' + t.name), h('small', t.desc),
            h('div.btnrow', h('button' + (isS ? '.primary' : ''), { onclick: () => { if (isS) st.traits = st.traits.filter(x => x !== k); else { if (st.traits.length >= 2) st.traits.shift(); st.traits.push(k); if (st.weak === k) st.weak = null; } panel(); draw(); } }, isS ? 'จุดเด่น ✓' : 'เลือกเป็นจุดเด่น'),
              h('button' + (isW ? '.warnbtn' : '.ghost'), { onclick: () => { st.weak = isW ? null : k; st.traits = st.traits.filter(x => x !== k); panel(); draw(); } }, isW ? 'ข้อท้าทาย ✓' : 'ข้อท้าทาย'))));
        }
        b.append(grid);
      }
      const getProblem = () => !UI.cleanName(st.name) ? 'name' : st.traits.length < 2 ? 'traits' : !st.weak ? 'weak' : null;
      const problem = getProblem();
      const msg = { name: 'ตั้งชื่อตัวละครก่อน', traits: 'เลือกจุดเด่นให้ครบ 2 อย่าง (แท็บบุคลิก)', weak: 'เลือกข้อท้าทาย 1 อย่าง (แท็บบุคลิก)' };
      p.append(h('div.cfoot', h('small' + (problem ? '.why' : '.muted') + '.cmsg', problem ? msg[problem] : 'พร้อมแล้ว · เริ่มด้วยเงิน ฿20,500 และหนี้การศึกษา ฿45,000'),
        h('button.primary.big', { onclick: () => {
          const pr = getProblem();
          if (pr === 'name') { st.tab = 'char'; st.nameErr = true; panel(); const i = cr.querySelector('#cname'); if (i) i.focus(); return; }
          if (pr) { st.tab = 'traits'; panel(); return; }
          cr.hidden = true;
          onDone({ name: UI.cleanName(st.name), cid: st.cid, traits: st.traits.slice(), weak: st.weak });
        } }, 'เริ่มใช้ชีวิต →')));
    };
    draw(); panel();
    window.addEventListener('resize', () => { if (!cr.hidden) draw(); });
  };

  window.UI = UI;
})();
