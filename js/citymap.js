/* แผนที่เมือง 2.5D: Road Graph (รถ) + Pedestrian Graph (คนเดิน) + รถวิ่งในเมือง + แอนิเมชันการเดินทาง
   พิกัดทั้งหมดเป็นพิกัดภาพเมือง (assets/scenes/citymap.webp 1672x941) */
'use strict';
window.CITYMAP = (function () {
  const MW = 1672, MH = 941;
  // ถนนหลัก (polyline) ลากตามถนนในภาพเมือง · จุดที่ใกล้กันน้อยกว่า 14px ถือเป็นทางแยกเดียวกัน
  const ROADS = {
    A: [[20, 395], [215, 440], [335, 492], [525, 572], [625, 645], [760, 730], [900, 800], [1000, 860]],
    B: [[690, 700], [850, 600], [960, 540], [1050, 500], [1190, 482], [1365, 470], [1450, 440]],
    C: [[450, 255], [550, 305], [775, 420], [800, 440]],
    G: [[525, 572], [600, 535], [765, 465], [800, 440]],
    K: [[800, 440], [825, 520], [850, 600]],
    H: [[960, 540], [1125, 622], [1250, 690]],
    D: [[150, 820], [330, 720], [480, 640], [525, 572]],
    F: [[1190, 482], [1180, 400], [1175, 320], [1300, 280], [1440, 260], [1500, 180]] // สะพานไปสนามบิน
  };

  // ---------- สร้างกราฟ ----------
  function build(lines, offset) {
    const nodes = [], adj = [];
    const nodeAt = (p) => { for (let i = 0; i < nodes.length; i++) if (Math.hypot(nodes[i][0] - p[0], nodes[i][1] - p[1]) < 14) return i; nodes.push([p[0], p[1]]); adj.push([]); return nodes.length - 1; };
    for (const pl of Object.values(lines)) {
      let prev = null;
      for (const p of pl) { const i = nodeAt(p); if (prev != null && prev !== i) { const d = Math.hypot(nodes[i][0] - nodes[prev][0], nodes[i][1] - nodes[prev][1]); adj[prev].push([i, d]); adj[i].push([prev, d]); } prev = i; }
    }
    return { nodes, adj, offset: offset || 0 };
  }
  const ROAD = build(ROADS, 0);
  // ทางเท้า: เส้นขนานกับถนนห่างออกไปด้านข้าง (คนเดินบนฟุตบาท ไม่เดินกลางถนน)
  const PED = build(ROADS, 9);
  function nearestNode(g, p) { let b = 0, bd = 1e9; g.nodes.forEach((n, i) => { const d = Math.hypot(n[0] - p[0], n[1] - p[1]); if (d < bd) { bd = d; b = i; } }); return b; }
  function dijkstra(g, a, b) {
    const N = g.nodes.length, dist = new Array(N).fill(1e12), prev = new Array(N).fill(-1), done = new Array(N).fill(false); dist[a] = 0;
    for (;;) { let u = -1, ud = 1e12; for (let i = 0; i < N; i++) if (!done[i] && dist[i] < ud) { ud = dist[i]; u = i; } if (u < 0 || u === b) break; done[u] = true;
      for (const [v, w] of g.adj[u]) if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; } }
    const path = []; for (let v = b; v >= 0; v = prev[v]) path.unshift(v); return path[0] === a ? path : [a, b];
  }
  // เส้นทางจากหมุดหนึ่งไปอีกหมุด: เดินจากหมุดไปถนนที่ใกล้สุด → ตามกราฟ → ออกจากถนนไปหมุดปลายทาง
  function route(from, to, ped) {
    const g = ped ? PED : ROAD, a = nearestNode(g, from), b = nearestNode(g, to);
    const pts = [from].concat(dijkstra(g, a, b).map(i => g.nodes[i]), [to]);
    return ped ? offsetLine(pts, g.offset) : pts;
  }
  function offsetLine(pts, off) {
    return pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; let dx = b[0] - a[0], dy = b[1] - a[1]; const L = Math.hypot(dx, dy) || 1; return i === 0 || i === pts.length - 1 ? p : [p[0] - dy / L * off, p[1] + dx / L * off]; });
  }
  const lenOf = pts => pts.reduce((s, p, i) => i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0, 0);
  function at(pts, d) {
    for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (d <= L || i === pts.length - 1) { const t = L ? Math.min(1, d / L) : 0; return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, dx: b[0] - a[0], dy: b[1] - a[1] }; } d -= L; }
    const p = pts[pts.length - 1]; return { x: p[0], y: p[1], dx: 1, dy: 0 };
  }
  // ---------- ภาพรถ: _a = หน้ารถหันลงซ้าย, _b = หน้ารถหันขึ้นซ้าย · หันขวาใช้การกลับภาพ ----------
  const CARS = ['red', 'blue', 'black', 'suvr', 'suvw', 'bus', 'gbus'];
  const SCALE = { bus: .26, gbus: .26 };
  function carImg(k, dy) { return CORE.imLazy('vehicles/' + k + (dy > 0 ? '_a' : '_b')); }
  function drawSprite(ctx, img, x, y, s, flip) {
    if (!img) return; const w = img.width * s, h = img.height * s;
    ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1); ctx.drawImage(img, -w / 2, -h * .8, w, h); ctx.restore();
  }
  // ---------- ตัววาดซ้อนบนภาพแผนที่ ----------
  function attach(mapEl) {
    const cv = document.createElement('canvas'); cv.className = 'trafficcv'; mapEl.append(cv);
    const ctx = cv.getContext('2d'); let raf = 0, last = performance.now(), alive = true;
    const keys = Object.keys(ROADS);
    const traffic = Array.from({ length: 14 }, (_, i) => newCar(i));
    function newCar(i) {
      const a = Math.floor(Math.random() * ROAD.nodes.length); let b = Math.floor(Math.random() * ROAD.nodes.length); if (b === a) b = (a + 3) % ROAD.nodes.length;
      const pts = offsetLine(dijkstra(ROAD, a, b).map(n => ROAD.nodes[n]), 4);
      return { k: CARS[i % CARS.length], pts, L: lenOf(pts), d: Math.random() * lenOf(pts) * .5, v: 40 + Math.random() * 30 };
    }
    let trip = null;
    function frame(now) {
      if (!alive || !cv.isConnected) return;
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      const r = mapEl.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
      if (cv.width !== Math.round(r.width * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
      const k = cv.width / MW; ctx.setTransform(k, 0, 0, k, 0, 0); ctx.clearRect(0, 0, MW, MH);
      if (window.W && W.debugMap) { // โหมดตรวจสอบ: แสดงกราฟถนน (ม่วง) และทางเท้า (เขียว)
        for (const [g, col] of [[ROAD, '#c040ff'], [PED, '#2fb86a']]) { ctx.strokeStyle = col; ctx.lineWidth = 3; g.adj.forEach((e, i) => e.forEach(([j]) => { if (j > i) { const p = offsetLine([g.nodes[i], g.nodes[i], g.nodes[j], g.nodes[j]], g.offset); ctx.beginPath(); ctx.moveTo(p[1][0], p[1][1]); ctx.lineTo(p[2][0], p[2][1]); ctx.stroke(); } })); }
      }
      const items = [];
      for (let i = 0; i < traffic.length; i++) { const c = traffic[i]; c.d += c.v * dt; if (c.d >= c.L) { traffic[i] = newCar(i); continue; } const p = at(c.pts, c.d); items.push({ y: p.y, draw: () => drawSprite(ctx, carImg(c.k, p.dy), p.x, p.y, SCALE[c.k] || .2, p.dx > 0) }); }
      if (trip) {
        const tr = trip, t = Math.min(1, (now - tr.t0) / tr.ms), p = at(tr.pts, tr.L * t);
        // เส้นทางของผู้เล่น
        ctx.strokeStyle = 'rgba(242,193,78,.95)'; ctx.lineWidth = 6; ctx.setLineDash([12, 8]); ctx.beginPath(); tr.pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke(); ctx.setLineDash([]);
        items.push({ y: p.y + .1, draw: () => tr.draw(ctx, p) });
        tr.onStep && tr.onStep(t);
        if (t >= 1) { trip = null; tr.done && tr.done(); }
      }
      items.sort((a, b) => a.y - b.y).forEach(it => it.draw());
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return {
      stop() { alive = false; cancelAnimationFrame(raf); },
      // เดินทาง: mode = walk | bus | car | ride
      travel(from, to, mode, ms, onStep, done) {
        const ped = mode === 'walk', pts = route(from, to, ped);
        const cid = G.S().player.cid;
        const draw = (c, p) => {
          if (mode === 'car') drawSprite(c, carImg(G.S().car && G.S().car.color === 'blue' ? 'blue' : 'red', p.dy), p.x, p.y, .21, p.dx > 0);
          else if (mode === 'bus') drawSprite(c, carImg('bus', p.dy), p.x, p.y, .26, p.dx > 0);
          else {
            const fr = mode === 'ride' ? 'scooter' : (p.dy > 0 ? 'front3q' : 'back3q') + '_walk' + (Math.floor(performance.now() / 160) % 4);
            const img = CORE.imLazy(CORE.charPath(cid, fr)) || CORE.imLazy(CORE.charPath(cid, mode === 'ride' ? 'front' : p.dy > 0 ? 'front3q' : 'back3q')) || CORE.imLazy(CORE.charPath(cid, 'front'));
            if (img) { const h = mode === 'ride' ? 46 : 40, s = h / img.height; c.save(); c.translate(p.x, p.y); if ((mode === 'ride') ? p.dx < 0 : p.dx < 0 && !/_l/.test(fr)) c.scale(-1, 1); c.drawImage(img, -img.width * s / 2, -h, img.width * s, h); c.restore(); }
          }
          c.fillStyle = '#4f8a5f'; c.beginPath(); c.arc(p.x, p.y + 4, 4, 0, 7); c.fill();
        };
        trip = { pts, L: lenOf(pts), t0: performance.now(), ms, draw, onStep, done };
        return pts;
      }
    };
  }
  return { MW, MH, ROADS, ROAD, PED, route, attach, lenOf };
})();
