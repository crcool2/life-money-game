/* เกมส์ชีวิตและการเงิน — โลกในฉาก: ผู้เล่น, NPC, การเดิน, การโต้ตอบกับจุดต่าง ๆ และกิจกรรม */
'use strict';
(function () {
  const D = window.DATA, C = window.CORE;
  const W = { scene: null, key: null, grid: null, player: null, npcs: [], pet: null, target: null, pending: null, near: null, t: 0, placing: null, debug: false };
  // สถานที่ (ใช้กับแผนที่และตาราง NPC)
  const PLACE = { home_in: 'home', home_out: 'home', street: 'street', super_in: 'mall', clinic_in: 'clinic', cars_in: 'cars', office: 'office', hosp_in: 'hosp', hotel_in: 'hotel', conv_in: 'super', rest_in: 'rest', cafe_in: 'rest', moto_in: 'moto', hg_in: 'mall', elec_in: 'mall', clothes_in: 'mall' };
  W.PLACE = PLACE;
  const S = () => G.S();
  const T = () => W.t;
  const hypot = Math.hypot;
  const NAMES = { home: 'อยู่บ้าน', home_in: 'บ้านของคุณ', street: 'ย่านไลฟ์สไตล์', office: 'ออฟฟิศ', park: 'สวนสาธารณะ', super_in: 'ซูเปอร์มาร์เก็ต', clinic_in: 'คลินิก', hosp_in: 'โรงพยาบาล', hotel_in: 'โรงแรม', cars_in: 'โชว์รูมรถ', mall: 'ห้างสรรพสินค้า', rest_in: 'ร้านอาหาร', moto_in: 'Moto Hub', conv_in: 'ร้านสะดวกซื้อ', cafe_in: 'คาเฟ่', hg_in: 'ร้านของแต่งบ้านในห้าง', elec_in: 'ร้านเครื่องใช้ไฟฟ้าในห้าง', clothes_in: 'ร้านเสื้อผ้าในห้าง' };

  // ---------------- ตัวละคร ----------------
  // NPC ใช้ภาพชุดใหม่ ถ้าผู้เล่นเลือกตัวเดียวกัน NPC จะเปลี่ยนไปใช้ตัวสำรอง
  W.npcCid = function (id) {
    const N = D.NPCS[id], pc = S() && S().player.cid;
    if (N.cid !== pc) return N.cid;
    const used = new Set(Object.values(D.NPCS).map(n => n.cid)); used.add(pc);
    return D.SPARE_CIDS.find(c => !used.has(c)) || D.SPARE_CIDS[0];
  };
  // ตอนเริ่มเกมโหลดเฉพาะ: ภาพหน้า (ไว้เลือกตัวละคร) ของทุกตัว + ภาพทุกท่าของผู้เล่นและ NPC หลัก · ที่เหลือโหลดเมื่อเข้าฉาก
  W.allCharFiles = function () {
    const out = D.PLAYABLE.flatMap(p => [C.charPath(p.cid, 'face_normal'), C.charPath(p.cid, 'front'), C.charPath(p.cid, 'front3q')]);
    const st = S(); if (st && window.CHAR_META[st.player.cid]) out.push(...C.charFiles(st.player.cid));
    return out.filter(p => { const [cid, ...f] = p.split('/')[1].split('_'); return window.CHAR_META[cid] && window.CHAR_META[cid][f.join('_')]; });
  };
  W.preloadChar = cid => Promise.all(C.charFiles(cid).map(p => C.loadImage(p)));

  // ---------------- ฉาก ----------------
  // เฟอร์นิเจอร์ในบ้านมาจากข้อมูลผู้เล่น (st.home.furn) ทั้งหมด จึงย้าย หมุน เก็บ และบันทึกได้ทุกชิ้น
  // ฐานแบบกำหนดเอง (เช่น เคาน์เตอร์ตัว L) เป็นพิกัดภาพ → พิกัดฉาก
  function applyFeet(p, Ty) {
    if (Ty.foot) { p.fl = Ty.foot; p.fr = Ty.foot; }
    p._g = C.propGeom(p);
    if (Ty.feetPx) { p.feet = Ty.feetPx.map(poly => poly.map(q => C.propPt(p, q[0], q[1]))); p._g = C.propGeom(p); }
    return p;
  }
  function furnProp(f) {
    const Ty = D.FURN_TYPES[f.type]; if (!Ty) return null;
    const p = { id: f.id, img: Ty.sprite, x: f.x, y: f.y, s: Ty.s || .6, flip: !!f.flip, furn: f, bed: Ty.bed || null, passable: !!(Ty.passable || Ty.wall), floorItem: !!(Ty.floor || Ty.wall) };
    if (Ty.floor) p.sortY = -1;
    if (Ty.wall) { p.sortY = -2; p.nofoot = true; p.wall = true; } // ของติดผนัง: วาดบนผนัง อยู่หลังทุกอย่าง ไม่กันทางเดิน
    applyFeet(p, Ty); const pts = p._g.feet.flat(); p._xr = pts.length ? [Math.min(...pts.map(q => q[0])), Math.max(...pts.map(q => q[0]))] : [p._g.x0, p._g.x0 + p._g.w];
    return p;
  }
  function homeProps(sc) {
    const st = S(); G.migrateHome && G.migrateHome();
    sc.props = st.home.furn.filter(f => f.placed && f.x != null).map(furnProp).filter(Boolean);
  }
  function rebuildGrid() {
    if (W.scene && W.scene.furnHome) homeProps(W.scene);
    W.grid = C.buildGrid(W.scene);
    for (const p of W.scene.props) p._use = null;
  }
  W.rebuildGrid = rebuildGrid;
  const snap = (x, y, r) => { const c = C.nearestWalkable(W.grid, x, y, r || 25); return c ? C.cellPt(c) : [x, y]; };
  W.enter = function (key, spawn) {
    const sc = D.SCENES[key]; if (!sc) return;
    sc._key = key; C.prepScene(sc); C.setScene(sc);
    W.key = key; W.scene = sc; W.target = null; W.pending = null; W.placing = null;
    const st = S(); st.player.scene = key; st.player.place = PLACE[key] || st.player.place;
    rebuildGrid();
    if (sc.furnHome && st.home.needsCheck) checkHome();
    let pos = (spawn && sc.spawns[spawn]) || null;
    if (!pos && !spawn && st.player.x != null && C.walkable(W.grid, st.player.x, st.player.y)) pos = [st.player.x, st.player.y];
    if (!pos) pos = sc.spawns.start || Object.values(sc.spawns)[0];
    pos = snap(pos[0], pos[1]);
    W.player = { kind: 'char', isPlayer: true, cid: st.player.cid, x: pos[0], y: pos[1], path: [], speed: sc.ch * 1.45, pose: 'idle', facing: { f: 'front3q', flip: false }, seed: 1.3, ring: true, label: st.settings.labels ? st.player.name : '' };
    st.player.x = pos[0]; st.player.y = pos[1];
    W.npcs = []; syncNPCs(true);
    W.pet = null;
    C.cam.x = pos[0]; C.cam.y = pos[1] - sc.ch * .4; C.cam.follow = true;
    C.cam.zoom = sc.outdoor ? 2.2 : (innerWidth < 600 ? 1.15 : 1.25);
    if (C.cam.user && !sc.outdoor) C.cam.zoom = C.cam.user;
    if (key === 'home_in') C.cam.zoom = Math.max(C.cam.user || 0, innerWidth < 600 ? 1.7 : 2.1); // บ้านหลังใหม่เป็นภาพมุมกว้าง ซูมเข้าให้เห็นตัวละครชัด
    if (key === 'home_out') { C.cam.zoom = 1; if (innerWidth > innerHeight * 1.2) { C.cam.x = 660; C.cam.y = 420; C.cam.follow = false; } } // มุมมองบ้านจากภายนอก: เห็นตัวบ้านทั้งหลัง
    if (sc.shop) {
      const staff = W.npcs.find(n => D.NPCS[n.id].staff === sc.shop);
      if (staff) setTimeout(() => { if (W.key === key) say(staff, UI.fixQ(G.pick(D.LINES.shopWelcome).replace(/\{p\}/g, D.NPCS[staff.id].polite || 'ค่ะ')), 4); }, 700);
    }
    G.emit('scene', key);
  };

  // ---------------- NPC ----------------
  function npcPlace(id) {
    const N = D.NPCS[id], st = S(), h = G.hour();
    if (st.family === id && (h >= 19 || h < 8 || G.isWeekend())) return h >= 22 || h < 7 ? 'home' : 'home_in';
    if (N.staff === 'office') return !G.isWeekend() && h >= 8 && h < 18 ? 'office' : 'home';
    if (N.staff === 'clinic') return h >= 9 && h < 20 ? N.home : 'home';
    if (N.staff === 'hosp' || N.staff === 'hotel') return N.home;
    if (N.staff) return G.shopOpen(N.staff) ? N.home : 'home';
    if (!N.schedule) return 'home';
    let loc = 'home';
    for (const [hh, l] of N.schedule) if (h >= hh) loc = l;
    if (G.isWeekend() && loc === 'office') loc = 'park';
    return loc;
  }
  W.npcPlace = npcPlace;
  W.placeName = loc => NAMES[loc] || loc;
  W.npcStatus = function (id) {
    const n = W.npcs.find(x => x.id === id);
    if (n) return n.state;
    const loc = npcPlace(id), N = D.NPCS[id];
    if (loc === 'home') return G.hour() >= 22 || G.hour() < 6 ? 'พักผ่อน (นอน)' : 'ว่าง (อยู่บ้าน)';
    if (N.staff || loc === 'office') return 'ทำงาน';
    if (loc === 'park') return 'พักผ่อน';
    return 'ว่าง';
  };
  function exitPoint() { const sp = W.scene.spots.find(s => s.act === 'go' || s.act === 'map'); return sp ? snap(sp.x, sp.y) : Object.values(W.scene.spawns)[0]; }
  function randomPoint(cx, cy, r) {
    for (let i = 0; i < 40; i++) { const x = cx + (Math.random() * 2 - 1) * r, y = cy + (Math.random() * 2 - 1) * r * .6; if (C.walkable(W.grid, x, y)) return [x, y]; }
    return null;
  }
  function syncNPCs(initial) {
    const want = Object.keys(D.NPCS).filter(id => npcPlace(id) === W.key);
    for (const n of W.npcs) if (!want.includes(n.id) && !n.leaving) { n.leaving = true; n.state = 'เดินทาง'; goTo(n, ...exitPoint()); }
    const sc = W.scene;
    for (const id of want) {
      if (W.npcs.find(n => n.id === id)) continue;
      const N = D.NPCS[id];
      let pos, fixed = false;
      if (N.staff && N.pos) { pos = N.pos; fixed = true; }
      else if (initial) pos = randomPoint(sc.W / 2, sc.H * .6, sc.W * .45) || exitPoint();
      else pos = exitPoint();
      if (!fixed) pos = snap(pos[0], pos[1]);
      const n = { kind: 'char', id, cid: W.npcCid(id), x: pos[0], y: pos[1], path: [], speed: sc.ch * (.75 + Math.random() * .3), pose: 'idle', facing: { f: N.face || 'front3q', flip: Math.random() < .5 && !fixed }, seed: Math.random() * 9, staff: !!N.staff, fixed, home: pos, next: T() + 1 + Math.random() * 4, label: S().settings.labels ? N.name : '' };
      n.state = N.staff ? 'ทำงาน' : W.key === 'office' ? 'ทำงาน' : 'ว่าง';
      W.npcs.push(n);
      if (!initial && !fixed) { const p = randomPoint(sc.W / 2, sc.H * .6, sc.W * .3); if (p) goTo(n, p[0], p[1]); n.state = 'เดินทาง'; }
    }
  }
  W.syncNPCs = syncNPCs;
  // หาเส้นทาง: ถ้าไปตรง ๆ ไม่ได้ ลองผ่านประตูเชื่อมห้อง (scene.links) เช่น ประตูห้องนอน/ห้องน้ำ
  function route(x0, y0, x, y) {
    const direct = C.astar(W.grid, x0, y0, x, y); if (direct) return direct;
    let best = null;
    for (const L of (W.scene && W.scene.links) || []) for (const [s, e] of [[L.a, L.b], [L.b, L.a]]) {
      const p1 = C.astar(W.grid, x0, y0, s[0], s[1]); if (!p1) continue;
      const p2 = C.astar(W.grid, e[0], e[1], x, y); if (!p2) continue;
      const tp = [e[0], e[1]]; tp.tp = L.label || 'ประตู';
      const path = p1.concat([tp], p2.slice(1));
      if (!best || path.length < best.length) best = path;
    }
    return best;
  }
  W.route = route;
  function goTo(ent, x, y) {
    const path = route(ent.x, ent.y, x, y);
    if (!path) return false;
    ent.path = path.slice(1); return true;
  }
  function say(ent, text, secs) { ent.bubble = { text, until: T() + (secs || 3.5) }; ent.talkUntil = T() + Math.min(2.2, secs || 2); }
  W.say = say;
  const faceTo = (e, x, y) => { const f = C.faceFrom(x - e.x, y - e.y); if (f) e.facing = f; };
  W.faceTo = faceTo;

  // ---------------- อัปเดตทุกเฟรม ----------------
  W.update = function (dt, input) {
    W.t += dt;
    const p = W.player; if (!p) return;
    const act = G.activity;
    if (!act && !W.modal && (input.dx || input.dy)) {
      p.path = []; W.pending = null; W.target = null;
      const L = hypot(input.dx, input.dy), sp = p.speed * dt;
      const nx = p.x + input.dx / L * sp, ny = p.y + input.dy / L * sp * .6;
      if (C.walkable(W.grid, nx, ny)) { p.x = nx; p.y = ny; }
      else if (C.walkable(W.grid, nx, p.y)) p.x = nx;
      else if (C.walkable(W.grid, p.x, ny)) p.y = ny;
      faceTo(p, p.x + input.dx, p.y + input.dy * .6);
      p.pose = 'walk'; C.cam.follow = true;
    } else if (!act) {
      clearActPose(p);
      stepPath(p, dt);
      if (!p.path.length) {
        if (p.pose === 'walk') p.pose = 'idle';
        if (W.pending) { const pd = W.pending; W.pending = null; W.target = null; runPending(pd); }
      }
    } else {
      p.pose = act.pose || 'idle';
      if (act.stand) { p.x = act.stand[0]; p.y = act.stand[1]; }
      if (act.facing) p.facing = act.facing;
      p.seat = act.seat || null; p.onProp = act.prop || null; p.sitFrame = act.sitFrame || null; p.bed = act.bed || null;
      p.sitPose = act.sitPose || (/อ่าน|เรียน/.test(act.label) ? 'sit_read' : /โทร|มือถือ|ข่าว|โซเชียล/.test(act.label) ? 'sit_phone' : null);
      p.hidden = !!act.hide; p.occY = act.occY != null ? act.occY : null;
      if (act.ride && act.rideDir) { p.x += act.rideDir * W.scene.ch * 2.2 * dt; }
    }
    S().player.x = p.x; S().player.y = p.y;
    for (const n of W.npcs) updateNPC(n, dt);
    W.npcs = W.npcs.filter(n => !(n.leaving && !n.path.length));
    if (W.pet) updatePet(W.pet, dt);
    if (Math.random() < dt / 14) npcChat();
    W.near = nearest();
  };
  // จบกิจกรรมบนเฟอร์นิเจอร์ → กลับมายืนบนพื้นที่เดินได้ ไม่ชนของ
  function clearActPose(p) {
    if (p.seat || p.bed || p.onProp || p.hidden) {
      p.seat = p.bed = p.onProp = p.sitFrame = p.sitPose = p.occY = null; p.hidden = false;
      if (p.returnTo) { const r = snap(p.returnTo[0], p.returnTo[1]); p.x = r[0]; p.y = r[1]; }
      p.returnTo = null; if (p.pose !== 'walk') p.pose = 'idle';
    }
    if (!C.walkable(W.grid, p.x, p.y)) { const r = snap(p.x, p.y, 12); p.x = r[0]; p.y = r[1]; }
  }
  function stepPath(e, dt) {
    if (!e.path.length) return;
    if (e.path[0].tp) { const n = e.path.shift(); e.x = n[0]; e.y = n[1]; e.fadeIn = T(); return; } // เปิดประตูผ่านไปอีกห้อง
    const [tx, ty] = e.path[0]; const dx = tx - e.x, dy = ty - e.y, d = hypot(dx, dy);
    const sp = e.speed * dt;
    if (d <= sp) { e.x = tx; e.y = ty; e.path.shift(); }
    else { e.x += dx / d * sp; e.y += dy / d * sp; }
    if (d > .5) { const f = C.faceFrom(dx, dy); if (f) e.facing = f; }
    e.pose = 'walk';
  }
  function updateNPC(n, dt) {
    if (n.talkingWith) { n.pose = 'idle'; faceTo(n, W.player.x, W.player.y); if (n.talkingWith < T()) { n.talkingWith = 0; if (n.fixed) n.facing = { f: D.NPCS[n.id].face || 'front', flip: false }; } return; }
    if (n.path.length) { stepPath(n, dt); if (!n.path.length) { n.pose = 'idle'; if (n.state === 'เดินทาง' && !n.leaving) n.state = n.staff || W.key === 'office' ? 'ทำงาน' : 'ว่าง'; } return; }
    if (n.chatUntil && n.chatUntil > T()) return;
    if (n.chatUntil) { n.chatUntil = 0; n.state = n.staff || W.key === 'office' ? 'ทำงาน' : 'ว่าง'; }
    n.pose = n.fixed ? (Math.sin(T() * .7 + n.seed) > .7 ? 'work' : 'idle') : 'idle';
    if (n.fixed) return; // พนักงานยืนประจำหลังเคาน์เตอร์
    if (T() > n.next) {
      n.next = T() + 4 + Math.random() * 8;
      const pt = randomPoint(n.x, n.y, W.scene.ch * 2.2);
      if (pt && hypot(pt[0] - W.player.x, pt[1] - W.player.y) > W.scene.ch * .4) goTo(n, pt[0], pt[1]);
    }
  }
  function updatePet(p, dt) {
    if (p.path.length) { stepPath(p, dt); return; }
    if (Math.random() < dt / 3) { const pl = W.player; const pt = randomPoint(pl.x + 40, pl.y + 10, 110); if (pt) goTo(p, pt[0], pt[1]); }
  }
  function npcChat() {
    const free = W.npcs.filter(n => !n.fixed && !n.leaving && !n.path.length && !n.talkingWith && !n.chatUntil);
    if (free.length < 2) return;
    const a = free[0], b = free.slice(1).sort((x, y) => hypot(x.x - a.x, x.y - a.y) - hypot(y.x - a.x, y.y - a.y))[0];
    const line = G.pick(D.LINES.npcChat);
    const g = W.scene.ch * .35, mid = [(a.x + b.x) / 2, (a.y + b.y) / 2];
    const pa = randomPoint(mid[0] - g, mid[1], g * .5), pb = randomPoint(mid[0] + g, mid[1], g * .5);
    const far = hypot(a.x - b.x, a.y - b.y) > W.scene.ch * .8;
    if (pa && far) goTo(a, pa[0], pa[1]);
    if (pb && far) goTo(b, pb[0], pb[1]);
    const delay = hypot(a.x - b.x, a.y - b.y) / a.speed * 1000 + 300;
    a.state = b.state = 'กำลังพูดคุย';
    a.chatUntil = b.chatUntil = T() + delay / 1000 + 6;
    setTimeout(() => { if (!W.npcs.includes(a)) return; faceTo(a, b.x, b.y); faceTo(b, a.x, a.y); say(a, line[0], 2.6); }, delay);
    setTimeout(() => { if (!W.npcs.includes(b)) return; say(b, line[1], 2.6); }, delay + 2600);
  }

  // ---------------- สิ่งที่โต้ตอบได้ ----------------
  const FURN_ICON = { sleep: '🛏️', lamp: '💡', wardrobe: '👔', sofa: '🛋️', seat: '🪑', tv: '📺', desk: '💻', cook: '🍳', fridge: '🧊', eat: '🍽️', dishes: '🧽', laundry: '🧺', toilet: '🚽', wash: '🪥', shower: '🚿', plant: '🪴' };
  // จุดใช้งานอยู่หน้าฐานของเฟอร์นิเจอร์ (ตัวละครเดินไปยืนตรงนี้ก่อนเริ่มกิจกรรม)
  // เลือกด้านที่เดินถึงได้ (ด้านหน้าก่อน) แล้วยืนห่างจากขอบฐานเล็กน้อย
  function usePoint(p) {
    const Tu = p.furn && D.FURN_TYPES[p.furn.type];
    if (Tu && Tu.use) { const q = C.propPt(p, Tu.use[0], Tu.use[1]); if (C.walkable(W.grid, q[0], q[1])) return q; const c = C.nearestWalkable(W.grid, q[0], q[1], 6); if (c) return C.cellPt(c); }
    const f = p._g.feet[0]; if (!f) return [p.x, p.y + 10];
    const cx = f.reduce((a, q) => a + q[0], 0) / f.length, cy = f.reduce((a, q) => a + q[1], 0) / f.length, off = W.scene.ch * .14;
    const cand = [];
    for (let i = 0; i < f.length; i++) { const a = f[i], b = f[(i + 1) % f.length]; for (const t of [.5, .3, .7]) { const mx = a[0] + (b[0] - a[0]) * t, my = a[1] + (b[1] - a[1]) * t; let nx = mx - cx, ny = (my - cy) * 2; const L = hypot(nx, ny) || 1; nx /= L; ny /= L; cand.push([mx + nx * off, my + ny * off * .6, ny]); } }
    const front = f.reduce((a, q) => q[1] > a[1] ? q : a, f[0]); cand.push([front[0], front[1] + off * .8, 1.2]);
    const ok = cand.filter(q => C.walkable(W.grid, q[0], q[1])).sort((a, b) => b[2] - a[2]);
    const reach = ok.find(q => W.player && route(W.player.x, W.player.y, q[0], q[1]));
    const pick = reach || ok[0];
    if (pick) return [pick[0], pick[1]];
    const c = C.nearestWalkable(W.grid, front[0], front[1] + off, 14); return c ? C.cellPt(c) : [front[0], front[1] + off];
  }
  W.usePoint = usePoint;
  W.spots = function () {
    const list = W.scene.spots.slice();
    if (W.scene.furnHome) for (const p of W.scene.props) {
      const Ty = D.FURN_TYPES[p.furn.type]; if (!Ty.action) continue;
      if (!p._use) p._use = usePoint(p);
      list.push({ id: p.id, x: p._use[0], y: p._use[1], label: Ty.name, icon: FURN_ICON[Ty.action] || '✨', act: 'furn', prop: p, r: 10, lift: 30 });
    }
    return list;
  };
  function nearest() {
    const p = W.player, R = W.scene.ch * .55; let best = null, bd = 1e9;
    for (const sp of W.spots()) { const d = hypot(sp.x - p.x, (sp.y - p.y) * 1.3); if (d < R && d < bd) { bd = d; best = { type: 'spot', sp }; } }
    for (const n of W.npcs) { if (n.leaving) continue; const d = hypot(n.x - p.x, (n.y - p.y) * 1.3); if (d < R * 1.6 && d < bd + 6) { bd = d; best = { type: 'npc', n }; } }
    return best;
  }
  // ---------------- คลิก/แตะในฉาก ----------------
  W.click = function (wx, wy) {
    if (G.activity) return G.toast('กำลังทำกิจกรรมอยู่ · กด "หยุด" ก่อนถ้าจะไปที่อื่น', 'warn');
    if (W.placing) return placeClick(wx, wy);
    const p = W.player, ch = W.scene.ch;
    for (const sp of W.spots()) {
      const r = sp.r || 12, lift = sp.lift || 34;
      if (hypot(wx - sp.x, wy - (sp.y - lift)) < r * 1.8 || hypot(wx - sp.x, (wy - sp.y) * 1.4) < r * 1.4) return walkThen(sp.x, sp.y, { type: 'spot', sp });
    }
    for (const n of W.npcs) if (Math.abs(wx - n.x) < ch * .2 && wy < n.y + 4 && wy > n.y - ch) {
      const side = p.x < n.x ? -1 : 1;
      return walkThen(n.x + side * ch * .35, n.y + ch * .1, { type: 'npc', n });
    }
    if (!C.nearestWalkable(W.grid, wx, wy, 6)) return G.toast('ตรงนั้นเดินไปไม่ได้', 'warn');
    if (!goTo(p, wx, wy)) return G.toast('หาเส้นทางไปจุดนั้นไม่เจอ', 'warn');
    W.target = [wx, wy]; W.pending = null; C.cam.follow = true;
  };
  function walkThen(x, y, pending) {
    const p = W.player;
    if (hypot(p.x - x, p.y - y) < W.scene.ch * .3) { W.pending = null; return runPending(pending); }
    if (!goTo(p, x, y)) {
      let ok = false; const st = W.scene.ch * .14;
      for (let r = st; r <= st * 9 && !ok; r += st) for (let a = 0; a < 12 && !ok; a++) {
        const tx = x + Math.cos(a / 12 * Math.PI * 2) * r, ty = y + Math.sin(a / 12 * Math.PI * 2) * r * .6 + r * .25;
        if (C.walkable(W.grid, tx, ty) && goTo(p, tx, ty)) ok = true;
      }
      if (!ok) return G.toast('เดินไปถึงไม่ได้ ลองเดินอ้อมไปใกล้ ๆ ก่อน', 'warn');
    }
    W.pending = pending; W.target = [x, y]; C.cam.follow = true;
  }
  function runPending(pd) {
    if (!pd) return;
    if (pd.type === 'spot' && pd.sp) W.useSpot(pd.sp);
    if (pd.type === 'npc' && pd.n && W.npcs.includes(pd.n)) UI.npcMenu(pd.n);
  }
  W.interactNearest = function () { const n = W.near; if (!n) return G.toast('ไม่มีอะไรให้โต้ตอบใกล้ ๆ · แตะหมุดหรือคนเพื่อเดินไปหา', 'warn'); if (n.type === 'spot') W.useSpot(n.sp); else UI.npcMenu(n.n); };

  // ---------------- โหมดจัดวางเฟอร์นิเจอร์ (เฉพาะในบ้าน) ----------------
  // เลือกชิ้น → ลาก/แตะเพื่อเลื่อน → ปล่อยนิ้วหรือแตะเพื่อวาง · หมุน (กลับด้านตามมุมห้อง) · เก็บเข้าคลัง
  W.startPlace = function (f) {
    if (!W.scene || !W.scene.furnHome) return G.toast('ต้องอยู่ในบ้านจึงจะจัดวางได้', 'warn');
    if (G.activity) G.cancelActivity(true);
    const was = f.placed ? { x: f.x, y: f.y, flip: f.flip } : null;
    if (f.placed) { f.placed = false; rebuildGrid(); }
    const x0 = was ? was.x : C.cam.x, y0 = was ? was.y : C.cam.y + W.scene.ch * .3;
    W.placing = { f, x: Math.round(x0), y: Math.round(y0), flip: was ? !!was.flip : false, ok: false, was };
    W.placing.ok = canPlace(f, W.placing.x, W.placing.y);
    G.emit('placing', W.placing);
  };
  W.placeMove = function (wx, wy) { const pl = W.placing; if (!pl) return; const wall = D.FURN_TYPES[pl.f.type].wall; pl.x = Math.round(wx); pl.y = Math.round(wy + (wall ? W.scene.ch * .25 : W.scene.ch * .15)); pl.ok = canPlace(pl.f, pl.x, pl.y); };
  W.flipPlace = () => { const pl = W.placing; if (pl) { pl.flip = !pl.flip; pl.ok = canPlace(pl.f, pl.x, pl.y); } };
  W.cancelPlace = () => { const pl = W.placing; if (!pl) return; if (pl.was) { Object.assign(pl.f, pl.was, { placed: true }); rebuildGrid(); } W.placing = null; G.emit('placing', null); };
  W.confirmPlace = () => { const pl = W.placing; if (pl) placeClick(pl.x, pl.y - W.scene.ch * (D.FURN_TYPES[pl.f.type].wall ? .25 : .15)); };
  W.storePlacing = () => { const pl = W.placing; if (!pl) return; pl.f.placed = false; S().home.edited = true; W.placing = null; rebuildGrid(); G.emit('placing', null); G.emit('home'); G.save(true); G.toast('เก็บ' + D.FURN_TYPES[pl.f.type].name + 'เข้าคลังแล้ว', 'good'); };
  function ghostProp(f, x, y, flip) { const Ty = D.FURN_TYPES[f.type]; const p = { img: Ty.sprite, x, y, s: Ty.s || .6, flip, floorItem: !!(Ty.floor || Ty.wall), nofoot: !!Ty.wall }; return applyFeet(p, Ty); }
  W.ghostProp = () => W.placing ? ghostProp(W.placing.f, W.placing.x, W.placing.y, W.placing.flip) : null;
  function canPlace(f, x, y) {
    const Ty = D.FURN_TYPES[f.type];
    const g = ghostProp(f, x, y, W.placing && W.placing.flip);
    if (Ty.wall) { // ของติดผนัง: ทั้งชิ้นต้องอยู่บนผนัง (ไม่ใช่พื้น) และไม่ทับของติดผนังชิ้นอื่น
      const G0 = g._g, pts = [];
      for (let i = 1; i < 4; i++) for (let j = 1; j < 4; j++) pts.push([G0.x0 + G0.w * i / 4, G0.y0 + G0.h * j / 4]);
      if (pts.some(q => q[0] < 0 || q[1] < 0 || q[0] > W.scene.W || q[1] > W.scene.H || C.inWalk(W.scene, q[0], q[1]))) return false;
      for (const p of W.scene.props) if (p.wall && p.furn !== f) { const o = p._g; if (G0.x0 < o.x0 + o.w && G0.x0 + G0.w > o.x0 && G0.y0 < o.y0 + o.h && G0.y0 + G0.h > o.y0) return false; }
      return true;
    }
    const polys = g._g.feet; if (!polys.length) return false;
    const why = r => { W._why = r; return false; };
    const all = polys.flat(), cx = all.reduce((a, q) => a + q[0], 0) / all.length, cy = all.reduce((a, q) => a + q[1], 0) / all.length;
    const others = W.scene.props.filter(p => p.furn !== f && !p.passable);
    for (const pts0 of polys) {
      const px = pts0.reduce((a, q) => a + q[0], 0) / pts0.length, py = pts0.reduce((a, q) => a + q[1], 0) / pts0.length;
      // ฐานหดเข้าเล็กน้อย ให้วางชิดผนังหรือชิดกันได้พอดีโดยไม่นับว่าชน
      const shrink = (P, k) => P.map(q => [px + (q[0] - px) * k, py + (q[1] - py) * k]);
      const pts = shrink(pts0, .88), ptw = shrink(pts0, .74);
      const edge = P => P.concat([[px, py]], P.map((q, i) => { const r = P[(i + 1) % P.length]; return [(q[0] + r[0]) / 2, (q[1] + r[1]) / 2]; }));
      // ฐานทั้งหมดต้องอยู่บนพื้น (ไม่ทับกำแพง) · ขอบหลังชิดผนังได้
      for (const q of edge(ptw)) if (!C.inWalk(W.scene, q[0], q[1])) return why('wall');
      if (Ty.passable) continue;
      const samp = edge(pts);
      for (const p of others) for (const ft of p._g.feet) { for (const q of samp) if (C.inPoly(q[0], q[1], ft)) return why('overlap:' + p.furn.type); for (const q of ft) if (C.inPoly(q[0], q[1], pts)) return why('overlap:' + p.furn.type); }
      if (W.player && !(W.placing && W.placing.check) && C.inPoly(W.player.x, W.player.y, pts)) return why('player');
      for (const sp of W.scene.spots) if (C.inPoly(sp.x, sp.y, pts) || (sp.act === 'go' && hypot(sp.x - cx, sp.y - cy) < W.scene.ch * .55)) return why('door'); // ประตู/ทางเข้า (จุดใช้งานอื่นแค่ห้ามทับ)
      for (const L of W.scene.links || []) for (const q of [L.a, L.b]) if (C.inPoly(q[0], q[1], pts) || hypot(q[0] - px, q[1] - py) < W.scene.ch * .5) return why('link'); // ประตูระหว่างห้อง
    }
    return true;
  }
  W._canPlace = (f, x, y) => canPlace(f, x, y);
  function placeClick(wx, wy) {
    W.placeMove(wx, wy);
    const pl = W.placing;
    if (!pl.ok) return G.toast('วางตรงนี้ไม่ได้ (ทับกำแพง ประตู ของชิ้นอื่น หรือตัวละคร)', 'bad');
    Object.assign(pl.f, { x: pl.x, y: pl.y, placed: true, flip: pl.flip }); S().home.edited = true;
    W.placing = null; rebuildGrid();
    // ห้ามขวางทางเดินที่จำเป็น: ทุกจุดใช้งานและประตูต้องยังเดินถึงจากตัวละคร
    const need = W.spots().filter(s => s.act === 'go' || s.act === 'furn');
    const blocked = need.find(s => !route(W.player.x, W.player.y, s.x, s.y));
    if (blocked) {
      if (pl.was) Object.assign(pl.f, pl.was, { placed: true }); else pl.f.placed = false;
      rebuildGrid(); G.emit('placing', null); return G.toast(`วางแล้วจะขวางทางไป "${blocked.label}" ลองวางที่อื่น`, 'bad');
    }
    G.emit('placing', null); G.emit('home'); G.save(true);
    G.toast('จัดวาง' + D.FURN_TYPES[pl.f.type].name + 'แล้ว (บันทึกอัตโนมัติ)', 'good');
  }
  // ตรวจบ้านที่ผู้เล่นจัดเองหลังเปลี่ยนเป็นภาพชุดใหม่: ชิ้นที่ทับกำแพง/ทับกัน/ขวางทาง จะถูกเก็บเข้าคลัง (ไม่ลบทิ้ง)
  function checkHome() {
    const st = S(); delete st.home.needsCheck;
    const moved = [];
    const placed = st.home.furn.filter(f => f.placed && D.FURN_TYPES[f.type]);
    placed.forEach(f => { f.placed = false; });
    for (const f of placed) {
      rebuildGrid(); W.placing = { f, flip: !!f.flip, check: true };
      if (canPlace(f, f.x, f.y)) f.placed = true; else moved.push(f);
      W.placing = null;
    }
    rebuildGrid();
    const sp = W.spots().filter(s => s.act === 'go'), door = W.scene.spawns.door || W.scene.spawns.start;
    for (const f of placed.filter(f => f.placed && !D.FURN_TYPES[f.type].passable)) {
      if (sp.every(s => route(door[0], door[1], s.x, s.y))) break;
      f.placed = false; moved.push(f); rebuildGrid();
    }
    if (moved.length) setTimeout(() => G.toast(`ภาพเฟอร์นิเจอร์ชุดใหม่ใหญ่ขึ้น · เก็บ ${moved.map(f => D.FURN_TYPES[f.type].name).join(', ')} เข้าคลังเพื่อไม่ให้ทับกัน กด "ตกแต่ง" เพื่อวางใหม่`, 'warn'), 900);
    G.save(true);
  }
  W.storeFurn = function (f) { f.placed = false; S().home.edited = true; rebuildGrid(); G.emit('home'); G.save(true); G.toast('เก็บ' + D.FURN_TYPES[f.type].name + 'เข้าคลังแล้ว', 'good'); };

  // ---------------- กิจกรรม ----------------
  // extra: {stand, seat, prop, sitFrame, face, bed, returnTo, onTick, onCancel, route, icon, hide, ride}
  function act(label, mins, rate, pose, onDone, extra) {
    const p = W.player; C.cam.follow = true; extra = extra || {};
    if (extra.face) extra.facing = typeof extra.face === 'string' ? { f: extra.face, flip: !!extra.flip } : extra.face;
    p.returnTo = extra.returnTo || [p.x, p.y];
    G.startActivity(Object.assign({ label, mins, rate: rate || {}, pose: pose || 'idle', onDone, icon: '⏳' }, extra));
  }
  W.act = act;
  const n = () => S().player.needs;
  const propById = id => W.scene.props.find(p => p.id === id);
  // จุดนั่งบนเฟอร์นิเจอร์ (พิกัดฉาก) + เดินกลับไปที่จุดยืนหลังลุก
  const seatOf = sp => ({ seat: sp.seat, prop: propById(sp.prop), sitFrame: sp.sitFrame || 'sitfloor', stand: null, returnTo: [sp.x, sp.y], face: sp.seatFace || 'front3q' });
  function bedPose() {
    const bb = W.scene.bgBed; // เตียงที่เป็นส่วนหนึ่งของภาพฉาก
    if (bb) return { head: bb.head, foot: bb.foot, wdir: bb.wdir, wk: 1, blanket: bb.blanket, bg: true };
    const p = arguments[0] || W.scene.props.find(q => q.bed); if (!p || !p.bed) return null;
    const b = p.bed, pt = (q) => C.propPt(p, q[0], q[1]);
    const head = pt(b.head), foot = pt(b.foot);
    const s = p.s || 1; const wv = [b.wdir[0] * (p.flip ? -1 : 1) * s, b.wdir[1] * s];
    return { head, foot, wdir: wv, wk: 1, blanket: b.blanket.map(pt), prop: p };
  }
  W.useSpot = function (sp) {
    const st = S();
    if (sp.face) W.player.facing = { f: sp.face, flip: false };
    switch (sp.act) {
      case 'go': {
        if (sp.shop && !G.shopOpen(sp.shop)) return G.toast(`${D.SHOPS[sp.shop].name} ปิดอยู่ · เปิด ${G.shopHours(sp.shop)}`, 'bad');
        if (sp.to === 'mall') { UI.fade(() => { W.enter('street', 'mall'); UI.placeMenu('mall'); }); return; }
        UI.fade(() => W.enter(sp.to, sp.at)); return;
      }
      case 'map': return UI.openMap();
      case 'place': return UI.placeMenu(sp.place);
      case 'shop': W.player.pose = 'buy'; setTimeout(() => { if (W.player.pose === 'buy') W.player.pose = 'idle'; }, 900); return UI.openShop(sp.shop);
      case 'bed': return bedMenu(sp);
      case 'sofa': return sofaMenu(sp);
      case 'dining': return UI.choices('โต๊ะอาหาร', 'นั่งกินอาหารที่ซื้อมาหรือทำเอง', eatOptions(seatOf(sp), 4));
      case 'desk': return UI.choices('โต๊ะทำงาน', 'นั่งทำงานฟรีแลนซ์ เรียนออนไลน์ หรือวางแผนการเงิน', deskOptions(seatOf(sp)));
      case 'decor': return decorMenu(sp.prop);
      case 'furn': return furnMenu(sp.prop, sp);
      case 'kitchen': return kitchenMenu(sp);
      case 'bathroom': return bathMenu(sp);
      case 'wardrobe': return UI.openWardrobe();
      case 'bench': return UI.choices(sp.label, 'นั่งพักสักครู่', [
        { icon: '🪑', label: 'นั่งพัก 20 นาที', sub: 'พลังงาน+ ความเครียด−', onClick: () => act('นั่งพัก', 20, { energy: 14, stress: -14, social: W.npcs.length ? 6 : 0 }, 'sit', null, { seat: [sp.x, sp.y - 4], sitFrame: 'sitfloor', returnTo: [sp.x, sp.y] }) },
        { icon: '📱', label: 'เช็กข่าวการเงินในมือถือ', sub: '20 นาที · ทักษะการเงิน+', onClick: () => act('อ่านข่าวการเงิน', 20, { stress: 2 }, 'sit', () => { G.addXP('finance', 8); UI.marketNews(); }, { seat: [sp.x, sp.y - 4], sitFrame: 'sitfloor', returnTo: [sp.x, sp.y] }) }
      ]);
      case 'clinic': return UI.clinicMenu();
      case 'hospital': return UI.hospitalMenu();
      case 'hotel': return UI.hotelMenu();
      case 'officeWork': return officeWork(sp);
    }
  };

  function sleepMins(q) {
    const h = G.hour() + G.minute() / 60;
    const untilMorning = (h >= 7 ? 24 + 7 - h : 7 - h) * 60;
    const need = (100 - n().energy) / (12 * q) * 60 + 30;
    return Math.round(Math.max(60, Math.min(untilMorning, need, 600)));
  }
  function bedMenu(sp, prop, extraOpts) {
    const f = prop ? prop.furn : G.bestFurn('bed'), tier = f ? f.tier : 0, q = D.TIERS[tier].q;
    const bed = bedPose(prop); const mins = sleepMins(q);
    const ex = { bed, prop: bed && bed.prop, returnTo: [sp.x, sp.y], face: 'front' };
    UI.choices('เตียงนอน · ระดับ' + D.TIERS[tier].name, `ฟื้นพลังงาน ${Math.round(12 * q)}/ชม. · อัปเกรดเตียงได้ที่ร้านเฟอร์นิเจอร์ในห้าง`, [
      { icon: '🛏️', label: `นอนหลับ (${Math.round(mins / 60 * 10) / 10} ชม.)`, sub: 'นอนจนพลังงานเต็มหรือถึงเช้า', onClick: () => act('นอนหลับ', mins, { energy: 12 * q, stress: -4 * q, health: 1.2 }, 'sleep', () => W.say(W.player, 'ตื่นแล้ว สดชื่นจัง!'), ex) },
      { icon: '😴', label: 'งีบ 1 ชั่วโมง', sub: `ฟื้นพลังงาน ~${Math.round(11 * q)}`, onClick: () => act('งีบหลับ', 60, { energy: 11 * q, stress: -4 }, 'sleep', null, ex) },
      { icon: '📖', label: 'นั่งอ่านหนังสือการเงินบนเตียง', sub: '45 นาที · ความเครียด− ทักษะการเงิน+', onClick: () => act('อ่านหนังสือ', 45, { stress: -10, happy: 4 }, 'sit', () => G.addXP('finance', 18), { seat: bed ? [(bed.head[0] * 2 + bed.foot[0]) / 3, (bed.head[1] * 2 + bed.foot[1]) / 3 + 10] : [sp.x, sp.y], prop: bed && bed.prop, sitFrame: 'sitfloor', returnTo: [sp.x, sp.y] }) },
      { icon: '💡', label: S().home.lampOn ? 'ปิดโคมไฟหัวเตียง' : 'เปิดโคมไฟหัวเตียง', sub: 'บ้านสว่างขึ้นตอนกลางคืน', onClick: () => { S().home.lampOn = !S().home.lampOn; G.toast(S().home.lampOn ? 'เปิดโคมไฟแล้ว' : 'ปิดโคมไฟแล้ว', 'good'); } }
    ].concat(extraOpts || []));
  }
  function sofaMenu(sp) {
    const q = G.furnQ('sofa') || 1, s = seatOf(sp); const tv = S().home.furn.find(f => f.type === 'tv' && f.placed);
    const opts = [
      { icon: '🛋️', label: 'นั่งพักบนโซฟา', sub: '30 นาที · ความเครียด−', onClick: () => act('นั่งพักบนโซฟา', 30, { stress: -16 * q, happy: 8, energy: 5 }, 'sit', null, s) },
      { icon: '📖', label: 'อ่านหนังสือการเงิน', sub: '60 นาที · ทักษะการเงิน+', onClick: () => act('อ่านหนังสือ', 60, { stress: -4, happy: 3 }, 'sit', () => G.addXP('finance', 25), s) },
      { icon: '😴', label: 'งีบบนโซฟา 1 ชั่วโมง', sub: 'ฟื้นพลังงานน้อยกว่านอนบนเตียง', onClick: () => act('งีบบนโซฟา', 60, { energy: 8, stress: -3 }, 'sit', null, s) }
    ];
    if (tv) opts.push({ icon: '📺', label: 'ดูทีวี 1 ชั่วโมง', sub: 'ความสุข+ ความเครียด−', onClick: () => act('ดูทีวี', 60, { happy: 14, stress: -12, energy: -1 }, 'sit', null, s) });
    UI.choices('โซฟา · ระดับ' + D.TIERS[(G.bestFurn('sofa') || { tier: 0 }).tier].name, '', opts);
  }
  function decorMenu(p) {
    const f = p.decor, Ty = D.FURN_TYPES[f.type], q = D.TIERS[f.tier].q;
    const front = [p.x, p.y + W.scene.ch * .12];
    const seat = { seat: [p.x - 4, p.y - p._g.h * .25], prop: p, sitFrame: 'sitfloor', returnTo: front, face: 'front3q' };
    const opts = [];
    if (Ty.action === 'relax') opts.push({ icon: '🪑', label: 'นั่งพัก', sub: '30 นาที · ความเครียด−', onClick: () => act('นั่งพัก', 30, { stress: -14 * q, happy: 6, energy: 4 }, 'sit', null, seat) });
    if (Ty.action === 'tv') opts.push({ icon: '📺', label: 'ดูทีวี 1 ชั่วโมง', sub: 'ความสุข+ ความเครียด−', onClick: () => act('ดูทีวี', 60, { happy: 14 * q, stress: -12 * q }, 'idle', null, { face: 'back', returnTo: front }) }, { icon: '🎮', label: 'เล่นเกม 2 ชั่วโมง', sub: 'สนุก แต่ใช้พลังงาน', onClick: () => act('เล่นเกม', 120, { happy: 18, stress: -14, energy: -5 }, 'idle', null, { face: 'back' }) });
    if (Ty.action === 'plant') opts.push({ icon: '💧', label: 'รดน้ำต้นไม้', sub: '10 นาที · ผ่อนคลาย', onClick: () => act('รดน้ำต้นไม้', 10, { happy: 10, stress: -10 }, 'work', null, { face: 'back' }) });
    opts.push({ icon: '📦', label: 'ย้าย/จัดวางใหม่', sub: 'เลือกตำแหน่งใหม่ในบ้าน', onClick: () => W.startPlace(f) }, { icon: '🗃️', label: 'เก็บเข้าคลัง', sub: 'เอาออกจากบ้านชั่วคราว', onClick: () => W.storeFurn(f) });
    UI.choices(Ty.name + ' · ระดับ' + D.TIERS[f.tier].name, '', opts);
  }
  // ---------------- ใช้งานเฟอร์นิเจอร์ในบ้าน ----------------
  const seatAt = (p, sp) => { const Ty = D.FURN_TYPES[p.furn.type]; if (!Ty.seat) return null; return { seat: C.propPt(p, Ty.seat[0], Ty.seat[1]), prop: p, sitFrame: 'sitfloor', returnTo: [sp.x, sp.y], face: 'front3q', sitFlip: !!p.flip }; };
  const nearProp = (p, types, maxD) => W.scene.props.filter(q => q !== p && types.includes(q.furn.type)).map(q => [q, hypot(q.x - p.x, q.y - p.y)]).filter(a => a[1] < (maxD || 260)).sort((a, b) => a[1] - b[1]).map(a => a[0])[0] || null;
  const standAt = (sp, face) => ({ stand: [sp.x, sp.y], face: face || 'back', returnTo: [sp.x, sp.y] });
  function furnMenu(p, sp) {
    const st = S(), f = p.furn, Ty = D.FURN_TYPES[f.type], q = D.TIERS[f.tier || 0].q;
    f.state = f.state || {};
    const manage = [{ icon: '📦', label: 'ย้าย / หมุน', sub: 'โหมดจัดวาง: ลากไปวางใหม่ กดหมุนให้ตรงมุมห้อง', onClick: () => W.startPlace(f) },
      { icon: '🗃️', label: 'เก็บเข้าคลัง', sub: 'เอาออกจากบ้านชั่วคราว นำกลับมาวางได้ที่ "ตกแต่ง"', onClick: () => W.storeFurn(f) }];
    const title = Ty.name + (f.tier ? ' · ระดับ' + D.TIERS[f.tier].name : '');
    const opts = [];
    const sit = seatAt(p, sp);
    switch (Ty.action) {
      case 'sleep': return bedMenu(sp, p, manage);
      case 'lamp': opts.push({ icon: '💡', label: st.home.lampOn ? 'ปิดโคมไฟ' : 'เปิดโคมไฟ', sub: 'บ้านสว่างขึ้นตอนกลางคืน', onClick: () => { st.home.lampOn = !st.home.lampOn; f.state.on = st.home.lampOn; G.save(true); G.toast(st.home.lampOn ? 'เปิดโคมไฟแล้ว' : 'ปิดโคมไฟแล้ว', 'good'); } }); break;
      case 'wardrobe': opts.push({ icon: '👔', label: 'เปลี่ยนชุด', sub: 'อยู่ระหว่างพัฒนา · ชุดใหม่จะซื้อได้ที่ร้านเสื้อผ้าในห้าง (อัปเดตในอนาคต)', disabled: 'อยู่ระหว่างพัฒนา' },
        { icon: '🛍️', label: 'ไปร้านเสื้อผ้าในห้าง', sub: 'เปิดแผนที่เมือง', onClick: () => UI.openMap() }); break;
      case 'sofa': {
        const tv = nearProp(p, ['tv'], 700);
        opts.push({ icon: '🛋️', label: 'นั่งพักบนโซฟา', sub: '30 นาที · ความเครียด−', onClick: () => act('นั่งพักบนโซฟา', 30, { stress: -16 * q, happy: 8, energy: 5 }, 'sit', null, sit) },
          { icon: '📖', label: 'อ่านหนังสือการเงิน', sub: '60 นาที · ทักษะการเงิน+', onClick: () => act('อ่านหนังสือ', 60, { stress: -4, happy: 3 }, 'sit', () => G.addXP('finance', 25), sit) },
          { icon: '📱', label: 'โทรคุยกับเพื่อนหรือครอบครัว', sub: '30 นาที · สังคม+', onClick: () => act('คุยโทรศัพท์บนโซฟา', 30, { social: 40, happy: 8, stress: -6 }, 'sit', () => G.addXP('comm', 5), sit) },
          { icon: '😴', label: 'งีบบนโซฟา 1 ชั่วโมง', sub: 'ฟื้นพลังงานน้อยกว่านอนบนเตียง', onClick: () => act('งีบบนโซฟา', 60, { energy: 8, stress: -3 }, 'sit', null, sit) });
        if (tv) opts.push({ icon: '📺', label: 'ดูทีวี 1 ชั่วโมง', sub: tv.furn.state && tv.furn.state.on ? 'ทีวีเปิดอยู่' : 'จะเปิดทีวีให้อัตโนมัติ', onClick: () => { tv.furn.state = Object.assign(tv.furn.state || {}, { on: true }); act('ดูทีวี', 60, { happy: 14, stress: -12, energy: -1 }, 'sit', null, sit); } });
        break;
      }
      case 'seat': {
        const desk = f.type === 'chair' ? nearProp(p, ['desk'], 260) : null;
        if (desk) opts.push(...deskOptions(sit));
        else if (f.type === 'stool') opts.push(...eatOptions(sit, 3));
        opts.push({ icon: '🪑', label: 'นั่งพัก', sub: '20 นาที · ความเครียด−', onClick: () => act('นั่งพัก', 20, { stress: -10 * q, energy: 4 }, 'sit', null, sit) });
        break;
      }
      case 'tv': {
        const on = !!f.state.on, sofa = nearProp(p, ['sofa', 'armchair'], 700);
        opts.push({ icon: on ? '⏻' : '📺', label: on ? 'ปิดทีวี' : 'เปิดทีวี', sub: on ? 'ประหยัดไฟ' : 'เปิดรายการโปรด', onClick: () => { f.state.on = !on; G.save(true); G.toast(on ? 'ปิดทีวีแล้ว' : 'เปิดทีวีแล้ว', 'good'); } });
        const where = sofa ? seatAt(sofa, { x: sofa._use ? sofa._use[0] : sp.x, y: sofa._use ? sofa._use[1] : sp.y }) : standAt(sp, 'back');
        for (const [lab, mins, eff] of [['ดูข่าวเศรษฐกิจ', 30, { stress: 2 }], ['ดูซีรีส์', 60, { happy: 14, stress: -12 }], ['เล่นเกมคอนโซล', 120, { happy: 18, stress: -14, energy: -5 }]])
          opts.push({ icon: '📺', label: lab + (sofa ? ' (นั่งโซฟา)' : ''), sub: UI.mins(mins), onClick: () => { f.state.on = true; act(lab, mins, eff, sofa ? 'sit' : 'idle', lab === 'ดูข่าวเศรษฐกิจ' ? () => { G.addXP('finance', 8); UI.marketNews(); } : null, where); } });
        break;
      }
      case 'desk': {
        const chair = nearProp(p, ['chair'], 260);
        const at = chair ? seatAt(chair, { x: chair._use ? chair._use[0] : sp.x, y: chair._use ? chair._use[1] : sp.y }) : standAt(sp, 'back');
        if (at.seat) at.sitFrame = 'sitfloor'; // เก้าอี้ทำงานมีภาพแยกแล้ว จึงใช้ท่านั่งที่ไม่มีเก้าอี้ในภาพตัวละคร
        if (!chair) opts.push({ icon: '🪑', label: 'ยังไม่มีเก้าอี้ทำงานใกล้โต๊ะ', sub: 'ซื้อเก้าอี้ทำงานแล้ววางหน้าโต๊ะเพื่อนั่งทำงาน', disabled: true });
        opts.push(...deskOptions(at));
        break;
      }
      case 'cook': return kitchenMenu(sp, manage);
      case 'fridge': {
        const seatP = nearProp(p, ['stool', 'dining', 'chair'], 900);
        const at = seatP && D.FURN_TYPES[seatP.furn.type].seat ? seatAt(seatP, { x: seatP._use ? seatP._use[0] : sp.x, y: seatP._use ? seatP._use[1] : sp.y }) : standAt(sp, 'back');
        opts.push({ icon: '🧊', label: `เปิดตู้เย็น · วัตถุดิบ ${st.inv.ingr} มื้อ`, sub: 'เลือกอาหารพร้อมทานด้านล่าง หรือทำอาหารที่เตา', disabled: true }, ...eatOptions(at, 2));
        opts.push({ icon: '🥛', label: 'ดื่มน้ำเย็น', sub: '5 นาที', onClick: () => act('ดื่มน้ำ', 5, { hunger: 24, health: 6 }, 'idle', null, standAt(sp, 'back')) });
        break;
      }
      case 'eat': { const ch = nearProp(p, ['dchair', 'chair', 'stool'], 160); const at = ch ? seatAt(ch, { x: (ch._use || usePoint(ch))[0], y: (ch._use || usePoint(ch))[1] }) : standAt(sp, 'back'); opts.push(...eatOptions(at, 4)); break; }
      case 'dishes': opts.push({ icon: '🧽', label: 'ล้างจาน', sub: '15 นาที · บ้านสะอาดขึ้น', onClick: () => act('ล้างจาน', 15, { stress: -2 }, 'work', () => { st.home.clean = Math.min(100, st.home.clean + 12); }, standAt(sp, 'back')) },
        { icon: '💧', label: 'ดื่มน้ำ', sub: '5 นาที', onClick: () => act('ดื่มน้ำ', 5, { hunger: 24, health: 6 }, 'idle', null, standAt(sp, 'back')) }); break;
      case 'laundry': opts.push({ icon: '🧺', label: 'ซักผ้าด้วยเครื่อง', sub: '30 นาที · สุขอนามัย+ ไม่เสียค่าร้านซักผ้า', onClick: () => act('ซักผ้า', 30, { hygiene: 30, happy: 3 }, 'work', null, standAt(sp, 'back')) }); break;
      case 'toilet': opts.push({ icon: '🚽', label: 'ใช้ห้องน้ำ', sub: '5 นาที', onClick: () => act('เข้าห้องน้ำ', 5, { hygiene: 30, happy: 10 }, 'idle', null, { hide: true, returnTo: [sp.x, sp.y] }) }); break;
      case 'wash': opts.push({ icon: '🧼', label: 'ล้างมือ', sub: '3 นาที · สุขอนามัย +8', onClick: () => act('ล้างมือ', 3, { hygiene: 160 }, 'work', null, standAt(sp, 'back')) },
        { icon: '🪥', label: 'แปรงฟันล้างหน้า', sub: '10 นาที · สุขอนามัย +15', onClick: () => act('แปรงฟันล้างหน้า', 10, { hygiene: 90 * q }, 'work', null, standAt(sp, 'back')) }); break;
      case 'shower': opts.push({ icon: '🚿', label: 'อาบน้ำ', sub: '20 นาที · สุขอนามัย +' + Math.round(65 * q), onClick: () => act('อาบน้ำ', 20, { hygiene: 195 * q, happy: 6 }, 'idle', null, { hide: true, returnTo: [sp.x, sp.y] }) }); break;
      case 'plant': opts.push({ icon: '💧', label: 'รดน้ำต้นไม้', sub: '10 นาที · ผ่อนคลาย', onClick: () => act('รดน้ำต้นไม้', 10, { happy: 10, stress: -10 }, 'work', null, standAt(sp, 'back')) }); break;
    }
    UI.choices(title, '', opts.concat(manage));
  }
  function eatOptions(at, bonus) {
    const st = S(), out = [];
    for (const [id, qn] of Object.entries(st.inv.food)) {
      if (!qn) continue; const it = D.ITEMS[id];
      out.push({ icon: it.icon, label: `กิน${it.name} (มี ${qn})`, sub: `${it.mins} นาที · ความอิ่ม +${it.eff.hunger || 0}`, onClick: () => { st.inv.food[id]--; if (!st.inv.food[id]) delete st.inv.food[id]; act('กิน' + it.name, it.mins, {}, at.seat ? 'sit' : 'idle', () => { G.applyEff(it.eff); G.applyEff({ happy: bonus || 0 }); }, at); } });
    }
    if (!out.length) out.push({ icon: '🛒', label: 'ไม่มีอาหารพร้อมทาน', sub: 'ซื้อได้ที่ซูเปอร์มาร์เก็ต หรือทำอาหารเองในครัว', disabled: true });
    return out;
  }
  function deskOptions(at) {
    const opts = [];
    opts.push({ icon: '🧑‍💻', label: 'รับงานฟรีแลนซ์', sub: 'ออกแบบ เขียนงาน งานออนไลน์', onClick: () => UI.openJobs('freelance') });
    for (const k of ['tech', 'finance', 'comm', 'sales']) opts.push({ icon: D.SKILLS[k].icon, label: `เรียนออนไลน์: ${D.SKILLS[k].name}`, sub: `60 นาที · ระดับตอนนี้ ${G.skillLv(k)}`, onClick: () => act('เรียน' + D.SKILLS[k].name, 60, { energy: -5, stress: 3 }, 'work', () => G.addXP(k, 24), at) });
    opts.push({ icon: '📊', label: 'วางแผนการเงินของตัวเอง', sub: '30 นาที · เปิดหน้าการเงิน', onClick: () => act('วางแผนการเงิน', 30, { stress: -6 }, 'work', () => { G.addXP('finance', 10); UI.openFinance(); }, at) });
    return opts;
  }
  // ที่นั่งในร้านอาหาร/คาเฟ่ (เก้าอี้ในภาพ): [x, y ที่นั่ง, y ขาเก้าอี้]
  W.seatFor = function () {
    const ss = W.scene && W.scene.seats; if (!ss || !ss.length) return {};
    const p = W.player; const s = ss.slice().sort((a, b) => Math.hypot(a[0] - p.x, a[1] - p.y) - Math.hypot(b[0] - p.x, b[1] - p.y))[0];
    return { seat: [s[0], s[1]], occY: s[2], sitFrame: 'sitfloor', face: 'front3q', returnTo: [p.x, p.y] };
  };
  W.deskAt = () => { if (!W.scene || !W.scene.furnHome) return null; const desk = W.scene.props.find(p => p.furn.type === 'desk'); if (!desk) return null; const chair = nearProp(desk, ['chair'], 260); if (!chair) return null; const a = seatAt(chair, { x: (chair._use || usePoint(chair))[0], y: (chair._use || usePoint(chair))[1] }); a.sitFrame = 'sitfloor'; return a; };
  function kitchenMenu(sp, manage) {
    const st = S(), stove = G.bestFurn('stove'), fr = G.bestFurn('fridge');
    const at = { face: 'back', stand: [sp.x, sp.y], returnTo: [sp.x, sp.y] };
    const lv = G.skillLv('cook'), mins = Math.max(25, 45 - lv * 3);
    const tq = stove ? D.TIERS[stove.tier].q ** .3 : 1;
    const dining = null;
    const opts = [];
    opts.push({ icon: '🍳', label: `ทำอาหาร (วัตถุดิบเหลือ ${st.inv.ingr} มื้อ)`, sub: `${mins} นาที · ความอิ่ม +${Math.round(55 * (1 + lv * .05) * tq)} · ทักษะทำอาหาร+`, disabled: st.inv.ingr < 1 ? 'ไม่มีวัตถุดิบ ซื้อได้ที่ซูเปอร์มาร์เก็ต' : null,
      onClick: () => { st.inv.ingr--; act('ทำอาหาร', mins, { hygiene: -4 }, 'work', () => { G.applyEff({ hunger: 55 * (1 + lv * .05) * tq, happy: 6 + lv, health: 3 }); G.addXP('cook', 14); W.say(W.player, G.pick(['หอมมาก!', 'อร่อยใช้ได้เลย', 'ฝีมือดีขึ้นนะเนี่ย'])); }, at); } });
    opts.push(...eatOptions(at, 0));
    opts.push({ icon: '🧹', label: 'งานบ้านและออกกำลังกาย…', sub: 'ทำความสะอาดบ้าน ออกกำลังกาย นั่งสมาธิ โทรหาครอบครัว', onClick: () => choresMenu() });
    opts.push({ icon: '🍽️', label: 'ล้างจานเก็บครัว', sub: '20 นาที · บ้านสะอาดขึ้น', onClick: () => act('ล้างจาน', 20, { energy: -3 }, 'work', () => { st.home.clean = G.clamp(st.home.clean + 12); }, at) });
    UI.choices('ครัว', `ตู้เย็นระดับ${fr ? D.TIERS[fr.tier].name : '-'} · ชุดครัวระดับ${stove ? D.TIERS[stove.tier].name : '-'}`, opts.concat(manage || []));
  }
  function bathMenu(sp) {
    const st = S(), soap = st.inv.items.soap ? 1.1 : 1;
    const at = { face: 'back', stand: [sp.x, sp.y], returnTo: [sp.x, sp.y] };
    UI.choices('ห้องน้ำ', 'ฝักบัวและอ่างล้างหน้า', [
      { icon: '🚿', label: 'อาบน้ำฝักบัว', sub: '20 นาที · สุขอนามัย +' + Math.round(65 * soap), onClick: () => act('อาบน้ำ', 20, { hygiene: 195 * soap, happy: 6 }, 'idle', null, Object.assign({ hide: true }, at)) },
      { icon: '🚽', label: 'เข้าห้องน้ำ', sub: '5 นาที', onClick: () => act('เข้าห้องน้ำ', 5, { hygiene: 30, happy: 10 }, 'idle', null, Object.assign({ hide: true }, at)) },
      { icon: '🪥', label: 'ล้างหน้าแปรงฟัน', sub: '10 นาที · สุขอนามัย +15', onClick: () => act('ล้างหน้าแปรงฟัน', 10, { hygiene: 90 * (G.furnQ('sink') || 1) }, 'work', null, at) },
      { icon: '🧺', label: 'ซักผ้าร้านหยอดเหรียญ (฿60)', sub: '40 นาที', onClick: () => { if (G.pay(60, 'ร้านซักผ้าหยอดเหรียญ', 'ของใช้')) act('ซักผ้า', 40, { hygiene: 18, happy: 3 }, 'work', null, at); } }
    ]);
  }
  function choresMenu() {
    const st = S(), cl = st.inv.items.cleaner;
    UI.choices('งานบ้านและออกกำลังกาย', `ความสะอาดบ้าน ${Math.round(st.home.clean)}/100`, [
      { icon: '🧹', label: 'ทำความสะอาดบ้าน', sub: `${cl ? 40 : 60} นาที · ความสะอาด +45`, onClick: () => act('ทำความสะอาดบ้าน', cl ? 40 : 60, { energy: -9, hygiene: -8 }, 'work', () => { st.home.clean = G.clamp(st.home.clean + 45); G.applyEff({ happy: 6 }); }) },
      { icon: '🏋️', label: 'ออกกำลังกายในบ้าน', sub: '45 นาที · สุขภาพ+ ความเครียด−', onClick: () => act('ออกกำลังกาย', 45, { health: 13, stress: -18, energy: -24, hygiene: -32, hunger: -8 }, 'exercise') },
      { icon: '🧘', label: 'นั่งสมาธิ', sub: '20 นาที · ความเครียด−', onClick: () => act('นั่งสมาธิ', 20, { stress: -30, happy: 6 }, 'sit', null, { seat: [W.player.x, W.player.y], sitFrame: 'sitfloor', face: 'front' }) },
      { icon: '📞', label: 'โทรคุยกับครอบครัว', sub: '30 นาที · สังคม+', onClick: () => act('โทรหาครอบครัว', 30, { social: 40, happy: 10, stress: -6 }, 'idle', () => G.addXP('comm', 5)) }
    ]);
  }
  function officeWork(sp) {
    const st = S(), o = st.jobs.office;
    if (!o) return UI.choices('โต๊ะทำงาน', 'คุณยังไม่ได้เป็นพนักงานของบริษัทนี้', [
      { icon: '📝', label: 'สมัครงานกับคุณวรรณา', sub: 'หรือเดินไปคุยกับผู้จัดการที่เคาน์เตอร์', onClick: () => G.applyOffice() },
      { icon: '🧑‍💻', label: 'นั่งทำงานฟรีแลนซ์ที่โต๊ะว่าง', sub: 'ต้องมีแล็ปท็อป', disabled: st.inv.items.laptop ? null : 'ยังไม่มีแล็ปท็อป', onClick: () => UI.openJobs('freelance') }
    ]);
    if (G.isWeekend()) return G.toast('วันนี้วันหยุด ออฟฟิศไม่มีงานประจำ', 'warn');
    const h = G.hour() + G.minute() / 60;
    if (h < 8 || h >= 18) return G.toast('นอกเวลางาน (เข้างาน 09:00–17:00)', 'warn');
    const end = Math.max(h + 1, 17), mins = Math.round((end - h) * 60), day = G.day();
    if (o.workedDay !== day && o.startDay !== day) { o.startDay = day; o.dayMin = 0; if (h > 9.5) { o.perf = Math.max(0, o.perf - 2); G.toast('มาสาย ผลงานลดลงเล็กน้อย', 'bad'); } }
    const L = D.JOBS.office.levels[o.level];
    act('ทำงาน: ' + L.title, mins, { energy: -2.2, stress: 2.6, social: 4, hunger: 1 }, 'work', () => W.say(W.player, 'เลิกงานแล้ว!'), {
      seat: sp.seat, sitFrame: sp.sitFrame || 'chair', returnTo: [sp.x, sp.y], face: 'back',
      onTick: step => {
        o.dayMin = (o.dayMin || 0) + step;
        o.perf += step / 60 * (1 + G.skillLv('comm') / 10) * (G.has('diligent') ? 1.15 : 1);
        G.addXP('comm', step / 60 * 9); G.addXP('tech', step / 60 * 6);
        if (o.dayMin >= 240 && o.workedDay !== day) { o.workedDay = day; o.days++; G.toast(`นับเป็นวันทำงาน (${o.days} วันในรอบเงินเดือนนี้)`, 'good'); }
      }
    });
  }

  window.W = W;
})();
