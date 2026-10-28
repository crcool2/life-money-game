/* เกมส์ชีวิตและการเงิน — ลูปหลัก, การวาด, การรับอินพุต */
'use strict';
(function () {
  const D = window.DATA, C = window.CORE;
  const cv = document.getElementById('game'), ctx = cv.getContext('2d');
  let cw = 0, ch = 0, dpr = 1, running = false, last = 0, hudT = 0;
  const keys = new Set();
  const SPEEDS = [0, 2, 6, 15], ACT_SPEED = 45;

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cw = cv.clientWidth; ch = cv.clientHeight;
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    C.fitCamera(cw, ch);
  }
  window.addEventListener('resize', resize);

  // ---------------- เริ่มเกม ----------------
  function start() {
    document.getElementById('title').hidden = true;
    if (window.CHAR_META[G.S().player.cid]) W.preloadChar(G.S().player.cid);
    UI.buildHUD();
    const st = G.S();
    const sc = D.SCENES[st.player.scene] ? st.player.scene : 'home_in';
    G.syncClock();
    W.enter(sc, null);
    document.documentElement.style.fontSize = (16 * (st.settings.text || 1)) + 'px';
    resize();
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
    if (!window.CHAR_META[st.player.cid]) UI.repick(() => { W.enter(W.key, null); UI.buildHUD(); });
    if (!st.flags.intro) {
      st.flags.intro = true;
      G.emit('event', { title: `ยินดีต้อนรับ ${st.player.name}!`, text: 'นี่คือบ้านเช่าหลังแรกของคุณ ค่าเช่าเดือนละ ฿6,500 · แตะพื้นเพื่อเดิน แตะหมุดเพื่อใช้เตียง โซฟา โต๊ะ ครัว · ออกประตูหน้าบ้านไปที่ถนน มีซูเปอร์มาร์เก็ต คลินิก โชว์รูม ร้านอาหาร สวน โรงแรม ห้าง และโรงพยาบาล · ลากเพื่อเลื่อนกล้อง หยิกสองนิ้วเพื่อซูม', choices: [{ t: 'เริ่มกันเลย!' }] });
    }
  }
  G.on('hour', () => { if (W.key && D.SCENES[W.key]) W.syncNPCs(false); });
  G.on('home', () => { if (W.key === 'home_in') W.rebuildGrid(); });

  // ---------------- ลูป ----------------
  function loop(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    const st = G.S();
    if (st) {
      if (!W.modal) {
        const a = G.activity;
        if (a) { const step = Math.min(dt * (a.ride ? Math.max(4, a.mins / 2.6) : ACT_SPEED), a.mins - a.done); G.advance(step); G.tickActivity(step); }
        else G.advance(dt * SPEEDS[st.settings.speed]);
      }
      const input = { dx: (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0), dy: (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0) };
      W.update(dt, input);
      // หมดแรง: หลับไปเองตรงนั้น
      if (!G.activity && !W.modal && st.player.needs.energy <= 0.5 && D.SCENES[W.key]) {
        G.toast('หมดแรง! หลับไปตรงนั้นเลย สุขภาพลดลง', 'bad'); G.applyEff({ health: -6, happy: -8 });
        W.act('หมดแรงหลับไป', 240, { energy: 9, stress: 2 }, 'sleep');
      }
      const p = W.player;
      if (p && C.cam.follow && W.scene && D.SCENES[W.key] && !p.hidden) {
        const k = Math.min(1, dt * 4);
        C.cam.x += (p.x - C.cam.x) * k; C.cam.y += (p.y - W.scene.ch * .4 - C.cam.y) * k;
      }
      C.fitCamera(cw, ch); C.clampCam(cw, ch);
      render();
      hudT += dt; if (hudT > .2) { hudT = 0; UI.refreshHUD(); }
    }
    requestAnimationFrame(loop);
  }
  function lightTint() {
    const st = G.S(); const h = G.hour() + G.minute() / 60;
    const out = W.scene && W.scene.outdoor;
    let a = 0, col = '18,26,64';
    if (h >= 20 || h < 5) a = out ? .42 : .22;
    else if (h >= 18) { a = (h - 18) / 2 * (out ? .42 : .22); col = '60,40,80'; }
    else if (h < 7) { a = (7 - h) / 2 * (out ? .35 : .18); col = '50,40,90'; }
    else if (h >= 16.5) { a = (h - 16.5) / 1.5 * .1; col = '255,150,60'; }
    if (W.key === 'home_in' && st.home.lampOn) a *= .3;
    return a > .01 ? `rgba(${col},${a.toFixed(3)})` : null;
  }
  // พื้นที่ที่ HUD บังด้านบน/ล่าง เพื่อไม่ให้ป้ายชื่อไปซ่อนใต้แถบเมนู
  function hudSafe() {
    if (document.body.classList.contains('immersive')) return { top: 0, bottom: 0 };
    const tb = document.getElementById('clockbar') || document.getElementById('topbar'), dk = document.getElementById('dock');
    return { top: tb ? tb.getBoundingClientRect().bottom : 0, bottom: dk ? ch - dk.getBoundingClientRect().top : 0 };
  }
  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!W.scene) return;
    const st = G.S();
    void st;
    const ents = [];
    if (W.player) ents.push(W.player);
    for (const n of W.npcs) ents.push(n);
    const spots = !G.activity ? W.spots() : [];
    const near = W.near && W.near.type === 'spot' ? W.near.sp : null;
    C.drawScene(ctx, cw, ch, W.scene, ents, { safe: hudSafe(), t: W.t, spots, near: near && spots.includes(near) ? near : null, target: W.target, tint: lightTint(), debug: W.debug ? W.grid : false, ghost: W.ghostProp(), ghostOk: W.placing && W.placing.ok });
  }

  // ---------------- อินพุต ----------------
  const ptrs = new Map(); let drag = null, pinch = null, lastPinch = 0;
  cv.addEventListener('pointerdown', e => {
    cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (W.placing && ptrs.size === 1) { const r = cv.getBoundingClientRect(); const [wx, wy] = C.toWorld(e.clientX - r.left, e.clientY - r.top, cw, ch); W.placeMove(wx, wy); }
    if (ptrs.size >= 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.max(20, Math.hypot(a[0] - b[0], a[1] - b[1])), z: C.cam.zoom, t0: performance.now(), moved: 0, d0: Math.hypot(a[0] - b[0], a[1] - b[1]), c0: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] }; drag = null; lastPinch = performance.now(); }
    else if (performance.now() - lastPinch > 250) drag = { x: e.clientX, y: e.clientY, moved: false, cx: C.cam.x, cy: C.cam.y };
  });
  cv.addEventListener('pointermove', e => {
    const r = cv.getBoundingClientRect();
    if (W.placing && ptrs.size < 2 && (e.pointerType === 'mouse' || ptrs.has(e.pointerId))) { const [wx, wy] = C.toWorld(e.clientX - r.left, e.clientY - r.top, cw, ch); W.placeMove(wx, wy); }
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinch && ptrs.size >= 2) {
      const [a, b] = [...ptrs.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      pinch.moved = Math.max(pinch.moved, Math.abs(d - pinch.d0), Math.hypot((a[0] + b[0]) / 2 - pinch.c0[0], (a[1] + b[1]) / 2 - pinch.c0[1]));
      if (pinch.moved < 12) return; // ยังไม่ขยับพอ อาจเป็นการแตะสองนิ้ว
      const r2 = cv.getBoundingClientRect();
      C.setZoom(pinch.z * d / pinch.d, (a[0] + b[0]) / 2 - r2.left, (a[1] + b[1]) / 2 - r2.top, cw, ch);
      C.cam.follow = false; lastPinch = performance.now(); return;
    }
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) > 8 && !W.placing) drag.moved = true;
      if (drag.moved) { const s = C.viewScale(); C.cam.x = drag.cx - dx / s; C.cam.y = drag.cy - dy / s; C.cam.follow = false; }
    }
  });
  const up = e => {
    const r = cv.getBoundingClientRect();
    ptrs.delete(e.pointerId);
    if (pinch) {
      // แตะสองนิ้วแล้วยกเร็ว ๆ โดยไม่บีบ/ไม่เลื่อน = สลับซ่อน/แสดง UI (ต่างจากการบีบซูม)
      if (ptrs.size < 2) { if (pinch.moved < 12 && performance.now() - pinch.t0 < 350 && !pinch.done && !W.modal) { pinch.done = true; UI.toggleImmersive(); } if (!ptrs.size) pinch = null; }
      drag = null; lastPinch = performance.now(); return;
    }
    if (performance.now() - lastPinch < 300) { drag = null; return; } // นิ้วที่ยกทีหลังหลังบีบ ไม่นับเป็นการแตะเดิน
    if (W.placing && e.pointerType !== 'mouse') { drag = null; return; } // จอสัมผัส: ยกนิ้ว = แค่เลื่อน ต้องกด "วางตรงนี้" เพื่อยืนยัน
    if (drag && !drag.moved && !W.modal && W.scene && D.SCENES[W.key]) { const [wx, wy] = C.toWorld(e.clientX - r.left, e.clientY - r.top, cw, ch); W.click(wx, wy); }
    drag = null;
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); drag = null; pinch = null; });
  cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); C.setZoom(C.cam.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12), e.clientX - r.left, e.clientY - r.top, cw, ch); }, { passive: false });
  // กันเบราว์เซอร์ซูมทั้งหน้าเมื่อบีบนิ้วบน iOS
  ['gesturestart', 'gesturechange'].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));
  window.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { keys.add(k); if (k.startsWith('arrow')) e.preventDefault(); }
    if ((k === 'e' || k === ' ') && G.S() && !W.modal && !G.activity && document.getElementById('title').hidden) { e.preventDefault(); W.interactNearest(); }
    if (k === 'h' && G.S() && document.getElementById('title').hidden && !e.ctrlKey && !e.metaKey) UI.toggleImmersive();
    if (W.placing && k === 'r') W.flipPlace();
    if (W.placing && k === 'enter') W.confirmPlace();
    if (k === 'escape') { if (!document.getElementById('talk').hidden) { document.getElementById('talk').hidden = true; W.modal = false; } else if (W.placing) W.cancelPlace(); else if (W.modal && !document.querySelector('#modal .scrim[data-lock]')) UI.close(); }
    if (['0', '1', '2', '3'].includes(k) && G.S() && !W.modal) { G.S().settings.speed = +k; UI.refreshHUD(); }
  });
  window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());
  window.addEventListener('beforeunload', () => G.save(true));
  document.addEventListener('visibilitychange', () => { if (document.hidden) G.save(true); });

  // ---------------- บูต ----------------
  async function boot() {
    resize();
    const bar = document.querySelector('#loadbar i'), lt = document.querySelector('#loadtxt');
    const list = Object.values(D.SCENES).map(s => s.bg).concat(['scenes/citymap']);
    for (const s of Object.values(D.SCENES)) for (const p of s.props || []) list.push('furniture/' + p.img);
    for (const s of Object.values(D.SCENES)) if (s.floorMask) list.push(s.floorMask);
    for (const k in D.FURN_TYPES) list.push('furniture/' + D.FURN_TYPES[k].sprite);
    await C.preload(list.concat(W.allCharFiles()), p => { bar.style.width = (p * 100).toFixed(0) + '%'; });
    try { await document.fonts.ready; } catch (e) { /* ใช้ฟอนต์สำรอง */ }
    document.getElementById('loading').hidden = true;
    try {
      document.getElementById('tcharA').append(C.bodyCanvas(D.PLAYABLE[0].cid, 'front3q', 380, 2));
      const b2 = C.bodyCanvas(D.PLAYABLE[1].cid, 'front3q', 380, 2); b2.style.transform = 'scaleX(-1)'; document.getElementById('tcharB').append(b2);
    } catch (e) { /* ภาพตัวละครโหลดไม่ได้ ข้ามไป */ }
    if (C.failed.length) lt.textContent = `โหลดภาพไม่ได้ ${C.failed.length} ไฟล์`;
    UI.title(() => { document.getElementById('title').hidden = true; UI.creator(p => { G.newGame(p); start(); }); },
      () => { if (G.load()) start(); else G.toast('โหลดเกมไม่สำเร็จ', 'bad'); });
  }
  boot();
})();
