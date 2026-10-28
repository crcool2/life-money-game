/* เกมส์ชีวิตและการเงิน — เอนจินฉาก: โหลดภาพ, ตัวละครภาพหลายมุม, เฟอร์นิเจอร์แยกชิ้น, หาทางเดิน (A*), กล้อง, วาดฉากเรียงหน้า–หลัง */
'use strict';
(function () {
  const FM = window.FURN_META, CM = window.CHAR_META;
  const CELL = 8, BASE_H = 250; // ภาพตัวละครทุกตัวถูกปรับให้ท่ายืนหน้าตรงสูง 250 px

  // ---------------- โหลดภาพ ----------------
  const IMG = {}; const failed = [];
  // ภาพตัวละครเก็บเป็น atlas ไฟล์เดียวต่อตัว (characters/<cid>.webp) แล้วตัดเป็นเฟรมเมื่อโหลด
  const ATL = {};
  function loadAtlas(cid) {
    if (ATL[cid]) return ATL[cid];
    const img = new Image();
    ATL[cid] = new Promise(res => { img.onload = () => res(img); img.onerror = () => { failed.push('characters/' + cid); res(null); }; });
    img.src = 'assets/characters/' + cid + '.webp';
    return ATL[cid];
  }
  function loadImage(path) {
    if (IMG[path]) return IMG[path].p;
    const am = /^characters\/([^_]+)_(.+)$/.exec(path), A = am && CM[am[1]] && CM[am[1]]._atlas;
    if (A) {
      const r = A[am[2]]; const e = IMG[path] = { img: null, ok: false, p: null };
      e.p = loadAtlas(am[1]).then(at => {
        if (!at || !r) return null;
        const cv = document.createElement('canvas'); cv.width = r[2]; cv.height = r[3];
        cv.getContext('2d').drawImage(at, r[0], r[1], r[2], r[3], 0, 0, r[2], r[3]);
        e.img = cv; e.ok = true; return cv;
      });
      return e.p;
    }
    const img = new Image();
    const p = new Promise(res => {
      img.onload = () => { IMG[path].ok = true; res(img); };
      img.onerror = () => { IMG[path].ok = false; failed.push(path); res(null); };
    });
    IMG[path] = { img, p, ok: false };
    img.src = 'assets/' + path + (/\.(jpg|png|webp)$/.test(path) ? '' : '.webp');
    return p;
  }
  function im(path) { const e = IMG[path]; return e && e.ok ? e.img : null; }
  // โหลดภาพตัวละครเมื่อต้องใช้ (ตัวละครมีหลายสิบตัว ไม่โหลดทั้งหมดตอนเริ่มเกม)
  function imLazy(path) { const e = IMG[path]; if (e) return e.ok ? e.img : null; const m = /^characters\/([^_]+)_(.+)$/.exec(path); if (m && !(CM[m[1]] && CM[m[1]][m[2]])) return null; loadImage(path); return null; }
  const charPath = (cid, fr) => 'characters/' + cid + '_' + fr;
  function preload(list, onProgress) {
    const uniq = [...new Set(list)]; let done = 0;
    return Promise.all(uniq.map(n => loadImage(n).then(r => { done++; onProgress && onProgress(done / uniq.length); return r; })));
  }
  function charFiles(cid) { const m = CM[cid] || {}; return Object.keys(m).filter(f => f !== '_atlas' && typeof m[f] === 'object').map(f => charPath(cid, f)); }

  // ---------------- เรขาคณิต ----------------
  function inPoly(x, y, p) {
    let c = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const xi = p[i][0], yi = p[i][1], xj = p[j][0], yj = p[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c;
    }
    return c;
  }
  function distSeg(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay; const l = dx * dx + dy * dy || 1;
    let t = ((px - ax) * dx + (py - ay) * dy) / l; t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - ax - t * dx, py - ay - t * dy);
  }
  function nearPoly(x, y, p, r) {
    if (inPoly(x, y, p)) return true;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) if (distSeg(x, y, p[j][0], p[j][1], p[i][0], p[i][1]) < r) return true;
    return false;
  }
  // ขอบหน้า (y มากสุด) ของรูปหลายเหลี่ยมที่ตำแหน่ง x (-1 ถ้า x อยู่นอกช่วง)
  function frontY(p, x) {
    let best = -1;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const [x1, y1] = p[j], [x2, y2] = p[i];
      if (x >= Math.min(x1, x2) && x <= Math.max(x1, x2) && x1 !== x2) { const y = y1 + (y2 - y1) * (x - x1) / (x2 - x1); if (y > best) best = y; }
    }
    return best;
  }
  const xRange = p => [Math.min(...p.map(q => q[0])), Math.max(...p.map(q => q[0]))];

  // ---------------- เตรียมฉาก ----------------
  // prop: {id, img, x, y (จุดล่างสุดของฐานบนพื้น), s (สเกล), flip, feet?:[[...]], nofoot, seat, use...}
  function propGeom(p) {
    const m = FM[p.img] || { w: 80, h: 80, bx: .5, by: 78 };
    const s = p.s || 1, w = m.w * s, h = m.h * s, by = m.by * s;
    const bx = p.flip ? 1 - m.bx : m.bx;
    const x0 = p.x - bx * w, y0 = p.y - by;
    let feet = p.feet;
    if (!feet && !p.nofoot) {
      const L = bx * w * (p.fl || 1), R = (1 - bx) * w * (p.fr || 1), k = .5;
      const X = p.x, Y = p.y - (p.lift || 0);
      feet = [[[X, Y], [X - L, Y - L * k], [X - L + R, Y - L * k - R * k], [X + R, Y - R * k]]];
    }
    return { x0, y0, w, h, feet: feet || [], m };
  }
  // จุดในภาพเฟอร์นิเจอร์ (หน่วยพิกเซลของภาพต้นฉบับ) → พิกัดฉาก
  function propPt(p, sx, sy) {
    const g = p._g || propGeom(p), s = p.s || 1;
    const lx = p.flip ? g.m.w - sx : sx;
    return [g.x0 + lx * s, g.y0 + sy * s];
  }
  function prepScene(sc) {
    if (sc._prep) return sc;
    sc.props = sc.props || []; sc.occ = sc.occ || []; sc.spots = sc.spots || [];
    for (const p of sc.props) { p._g = propGeom(p); p._xr = p._g.feet.length ? xRange(p._g.feet.flat()) : [p._g.x0, p._g.x0 + p._g.w]; }
    for (const o of sc.occ) o._xr = xRange(o.p);
    sc.GW = Math.ceil(sc.W / CELL); sc.GH = Math.ceil(sc.H / CELL);
    sc._prep = true; return sc;
  }
  // ---------------- ฉากจากภาพตกแต่งสำเร็จ + มาสก์พื้น ----------------
  // floor[i]=1 พื้นที่เดินได้ (มองเห็นพื้น) · base[i] = y ของพื้นที่วัตถุพิกเซลนี้ตั้งอยู่ (สำหรับบังตัวละคร)
  function prepFloor(sc) {
    if (sc._floor || !sc.floorMask) return;
    const mi = im(sc.floorMask), bi = im(sc.bg); if (!mi || !bi) return;
    const W = sc.W, H = sc.H;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d', { willReadFrequently: true });
    x.drawImage(mi, 0, 0, W, H); const md = x.getImageData(0, 0, W, H).data;
    x.clearRect(0, 0, W, H); x.drawImage(bi, 0, 0, W, H); sc._bgData = x.getImageData(0, 0, W, H).data;
    const fl = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) fl[i] = md[i * 4] > 127 ? 1 : 0;
    // แนวขอบหลังเคาน์เตอร์ (พื้นที่มองไม่เห็นซึ่งพนักงานยืน): ทุกอย่างที่อยู่เหนือแนวนี้นับว่าอยู่ด้านหลังพนักงาน
    const hid = new Uint8Array(W * H);
    for (const id in (window.DATA || {}).NPCS || {}) { const N = window.DATA.NPCS[id]; if (N.home !== sc._key || N.back == null) continue;
      const hw = sc.ch * .4; for (let x = Math.max(0, (N.pos[0] - hw) | 0); x < Math.min(W, N.pos[0] + hw); x++) hid[N.back * W + x] = 1; }
    const base = new Int32Array(W * H);
    for (let cx = 0; cx < W; cx++) { let nb = H + 999; for (let y = H - 1; y >= 0; y--) { const i = y * W + cx; if (fl[i] || hid[i]) { nb = y; base[i] = -1; } else base[i] = nb; } }
    sc._floor = fl; sc._base = base;
  }
  // แปะพิกเซลของวัตถุที่อยู่หน้าตัวละครทับลงไป (ตามแนวพื้นที่วัตถุตั้งอยู่)
  const OCC = document.createElement('canvas'), OCX = OCC.getContext('2d');
  function drawOccPatch(ctx, sc, x0, y0, x1, y1, occY) {
    const W = sc.W, H = sc.H; x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(W, Math.ceil(x1)); y1 = Math.min(H, Math.ceil(y1));
    const w = x1 - x0, h = y1 - y0; if (w <= 0 || h <= 0) return;
    if (OCC.width < w || OCC.height < h) { OCC.width = Math.max(OCC.width, w); OCC.height = Math.max(OCC.height, h); }
    const id = OCX.createImageData(w, h), d = id.data, bg = sc._bgData, base = sc._base; let any = false;
    for (let yy = 0; yy < h; yy++) { const row = (y0 + yy) * W + x0; for (let xx = 0; xx < w; xx++) { const i = row + xx; if (base[i] > occY) { const o = (yy * w + xx) * 4, s = i * 4; d[o] = bg[s]; d[o + 1] = bg[s + 1]; d[o + 2] = bg[s + 2]; d[o + 3] = 255; any = true; } } }
    if (!any) return;
    OCX.clearRect(0, 0, w, h); OCX.putImageData(id, 0, 0); ctx.drawImage(OCC, 0, 0, w, h, x0, y0, w, h);
  }
  const walkPolys = sc => sc.walk;
  function inWalk(sc, x, y) { if (sc._floor) { const i = (y | 0) * sc.W + (x | 0); return x >= 0 && y >= 0 && x < sc.W && y < sc.H && sc._floor[i] === 1; } for (const p of sc.walk) if (inPoly(x, y, p)) return true; return false; }

  // ---------------- กริดทางเดิน ----------------
  function buildGrid(sc, extraBlocks) {
    prepScene(sc); prepFloor(sc);
    const GW = sc.GW, GH = sc.GH, g = new Uint8Array(GW * GH);
    if (sc._floor) { // เซลล์เดินได้เมื่อเป็นพื้นเกือบทั้งเซลล์ แล้วหดขอบ 1 เซลล์ไม่ให้ชิดของ
      const raw = new Uint8Array(GW * GH), fl = sc._floor, W = sc.W;
      for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) { let c = 0, n = 0; for (let yy = j * CELL; yy < Math.min(sc.H, j * CELL + CELL); yy++) for (let xx = i * CELL; xx < Math.min(W, i * CELL + CELL); xx++) { n++; c += fl[yy * W + xx]; } raw[j * GW + i] = c >= n * .6 ? 1 : 0; }
      // เฟอร์นิเจอร์ที่วางในฉาก (เช่น ในบ้าน) กันทางเดินตามฐานของแต่ละชิ้น
      for (const p of sc.props) { if (p.passable) continue; for (const f of p._g.feet) { const xs = f.map(q => q[0]), ys = f.map(q => q[1]);
        for (let j = Math.max(0, Math.floor((Math.min(...ys) - 6) / CELL)); j <= Math.min(GH - 1, Math.floor((Math.max(...ys) + 6) / CELL)); j++) for (let i = Math.max(0, Math.floor((Math.min(...xs) - 6) / CELL)); i <= Math.min(GW - 1, Math.floor((Math.max(...xs) + 6) / CELL)); i++)
          if (nearPoly(i * CELL + CELL / 2, j * CELL + CELL / 2, f, 4)) raw[j * GW + i] = 0; } }
      g.set(raw);
      // เก็บเฉพาะพื้นผืนใหญ่ที่สุด (กันตัวละครไปติดในซอกเล็ก ๆ ที่เดินออกไม่ได้)
      const comp = new Int32Array(GW * GH).fill(-1); let best = -1, bestN = 0, id = 0;
      for (let s = 0; s < g.length; s++) { if (!g[s] || comp[s] >= 0) continue; const q = [s]; comp[s] = id; let n = 0;
        while (q.length) { const k = q.pop(); n++; const x = k % GW, y = (k / GW) | 0; for (const m of [x > 0 ? k - 1 : -1, x < GW - 1 ? k + 1 : -1, y > 0 ? k - GW : -1, y < GH - 1 ? k + GW : -1]) if (m >= 0 && g[m] && comp[m] < 0) { comp[m] = id; q.push(m); } }
        if (n > bestN) { bestN = n; best = id; } id++; }
      // ห้องที่เชื่อมด้วยประตู (sc.links) เก็บไว้ด้วย แม้เป็นพื้นคนละผืน
      const keep = new Set([best]);
      for (const L of sc.links || []) for (const pt of [L.a, L.b]) { const ci = Math.max(0, Math.min(GW - 1, Math.floor(pt[0] / CELL))), cj = Math.max(0, Math.min(GH - 1, Math.floor(pt[1] / CELL)));
        let bc = -1, bd = 1e9; for (let j = Math.max(0, cj - 6); j <= Math.min(GH - 1, cj + 6); j++) for (let i = Math.max(0, ci - 6); i <= Math.min(GW - 1, ci + 6); i++) { const k = j * GW + i; if (comp[k] >= 0) { const d = (i - ci) ** 2 + (j - cj) ** 2; if (d < bd) { bd = d; bc = comp[k]; } } }
        if (bc >= 0) keep.add(bc); }
      for (let s = 0; s < g.length; s++) if (!keep.has(comp[s])) g[s] = 0;
      for (const s of sc.spots || []) { const c = cellOf({ GW, GH }, s.x, s.y); if (raw[c[1] * GW + c[0]]) g[c[1] * GW + c[0]] = 1; }
      return { g, GW, GH, W: sc.W, H: sc.H };
    }
    const blocks = [];
    for (const p of sc.props) if (!p.passable) for (const f of p._g.feet) blocks.push(f);
    for (const o of sc.obs || []) blocks.push(o.p || o);
    for (const b of extraBlocks || []) blocks.push(b);
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const x = i * CELL + CELL / 2, y = j * CELL + CELL / 2;
      let ok = inWalk(sc, x, y);
      if (ok) for (const b of blocks) if (nearPoly(x, y, b, 5)) { ok = false; break; }
      g[j * GW + i] = ok ? 1 : 0;
    }
    return { g, GW, GH, W: sc.W, H: sc.H };
  }
  const cellOf = (G, x, y) => [Math.max(0, Math.min(G.GW - 1, Math.floor(x / CELL))), Math.max(0, Math.min(G.GH - 1, Math.floor(y / CELL)))];
  function walkable(G, x, y) { if (x < 0 || y < 0 || x >= G.W || y >= G.H) return false; const [i, j] = cellOf(G, x, y); return G.g[j * G.GW + i] === 1; }
  function nearestWalkable(G, x, y, maxR) {
    const [ci, cj] = cellOf(G, x, y);
    if (G.g[cj * G.GW + ci]) return [ci, cj];
    for (let r = 1; r <= (maxR || 30); r++) {
      let best = null, bd = 1e9;
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= G.GW || j >= G.GH) continue;
        if (G.g[j * G.GW + i]) { const d = di * di + dj * dj; if (d < bd) { bd = d; best = [i, j]; } }
      }
      if (best) return best;
    }
    return null;
  }
  const cellPt = c => [c[0] * CELL + CELL / 2, c[1] * CELL + CELL / 2];
  function astar(G, sx, sy, tx, ty) {
    const s = nearestWalkable(G, sx, sy, 6), t = nearestWalkable(G, tx, ty, 30);
    if (!s || !t) return null;
    const GW = G.GW, N = GW * G.GH, start = s[1] * GW + s[0], goal = t[1] * GW + t[0];
    const gS = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const heap = []; const push = (n, f) => { heap.push([f, n]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    const h = n => { const dx = Math.abs((n % GW) - t[0]), dy = Math.abs(((n / GW) | 0) - t[1]); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
    gS[start] = 0; push(start, h(start));
    let iter = 0;
    while (heap.length && iter++ < 250000) {
      const [, n] = pop(); if (closed[n]) continue; closed[n] = 1;
      if (n === goal) break;
      const ni = n % GW, nj = (n / GW) | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const i = ni + di, j = nj + dj; if (i < 0 || j < 0 || i >= GW || j >= G.GH) continue;
        const m = j * GW + i; if (!G.g[m] || closed[m]) continue;
        if (di && dj && (!G.g[nj * GW + i] || !G.g[j * GW + ni])) continue;
        const cost = gS[n] + (di && dj ? 1.414 : 1);
        if (cost < gS[m]) { gS[m] = cost; from[m] = n; push(m, cost + h(m)); }
      }
    }
    if (from[goal] === -1 && goal !== start) return null;
    const cells = []; let n = goal; while (n !== -1) { cells.push(n); if (n === start) break; n = from[n]; }
    cells.reverse();
    const pts = cells.map(n => [(n % GW) * CELL + CELL / 2, ((n / GW) | 0) * CELL + CELL / 2]);
    const out = [pts[0]]; let k = 0;
    while (k < pts.length - 1) {
      let far = k + 1;
      for (let m = pts.length - 1; m > k + 1; m--) if (los(G, pts[k], pts[m])) { far = m; break; }
      out.push(pts[far]); k = far;
    }
    if (walkable(G, tx, ty) && los(G, out[out.length - 1], [tx, ty])) out[out.length - 1] = [tx, ty];
    return out;
  }
  function los(G, a, b) {
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]); const n = Math.ceil(d / (CELL / 2));
    for (let i = 1; i < n; i++) { const t = i / n; if (!walkable(G, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)) return false; }
    return true;
  }

  // ---------------- กล้อง ----------------
  const ZMIN = 1, ZMAX = 3.2;
  const cam = { x: 500, y: 300, zoom: 1.3, base: 1, follow: true, user: null, W: 1000, H: 600 };
  function setScene(sc) { cam.W = sc.W; cam.H = sc.H; }
  function setZoom(z, sx, sy, cw, ch) {
    z = Math.max(ZMIN, Math.min(ZMAX, z));
    if (sx != null) { const [wx, wy] = toWorld(sx, sy, cw, ch); cam.zoom = z; const [nx, ny] = toWorld(sx, sy, cw, ch); cam.x += wx - nx; cam.y += wy - ny; }
    else cam.zoom = z;
    cam.user = z; return z;
  }
  function fitCamera(cw, ch) { cam.base = Math.max(cw / cam.W, ch / cam.H); }
  function viewScale() { return cam.base * cam.zoom; }
  function clampCam(cw, ch) {
    const s = viewScale(), hw = cw / s / 2, hh = ch / s / 2;
    cam.x = hw * 2 >= cam.W ? cam.W / 2 : Math.max(hw, Math.min(cam.W - hw, cam.x));
    cam.y = hh * 2 >= cam.H ? cam.H / 2 : Math.max(hh, Math.min(cam.H - hh, cam.y));
  }
  function toWorld(sx, sy, cw, ch) { const s = viewScale(); return [(sx - cw / 2) / s + cam.x, (sy - ch / 2) / s + cam.y]; }
  function toScreen(wx, wy, cw, ch) { const s = viewScale(); return [(wx - cam.x) * s + cw / 2, (wy - cam.y) * s + ch / 2]; }

  // ---------------- ทิศของตัวละคร ----------------
  // ภาพต้นฉบับ: front=หน้าตรง, front3q=หันเฉียงไปทางขวา, side=หันขวา, back=หันหลัง · หันซ้ายใช้การกลับภาพ
  // 8 ทิศ: ใช้ภาพแต่ละทิศจากชุดตัวละคร (front, front3q, side, back3q, back, back3q_l, side_l, front3q_l)
  // ถ้าตัวละครไม่มีภาพฝั่งซ้าย จะกลับภาพฝั่งขวาแทน
  const DIR8 = ['side', 'front3q', 'front', 'front3q_l', 'side_l', 'back3q_l', 'back', 'back3q'];
  function faceFrom(dx, dy) {
    if (Math.abs(dx) < .01 && Math.abs(dy) < .01) return null;
    const ang = Math.atan2(dy * 1.6, dx); // ชดเชยมุมกล้องไอโซเมตริก
    const i = ((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8;
    return { f: DIR8[i], flip: false };
  }
  // แปลงทิศเป็นภาพที่มีจริงของตัวละคร
  function resolveDir(cid, f, flip) {
    if (frameInfo(cid, f)) return [f, flip];
    const base = f.replace(/_l$/, '');
    if (f.endsWith('_l') && frameInfo(cid, base)) return [base, !flip];
    if (base === 'back3q') return frameInfo(cid, 'back') ? ['back', flip] : ['front', flip];
    return ['front', flip];
  }

  // ---------------- วาดฉาก ----------------
  let LABELS = null, PINS = null;
  function drawScene(ctx, cw, ch, sc, ents, opts) {
    const s = viewScale();
    LABELS = []; PINS = [];
    ctx.save();
    ctx.fillStyle = '#1b2420'; ctx.fillRect(0, 0, cw, ch);
    ctx.translate(cw / 2, ch / 2); ctx.scale(s, s); ctx.translate(-cam.x, -cam.y);
    const bg = im(sc.bg);
    if (bg) ctx.drawImage(bg, 0, 0, sc.W, sc.H);
    else { ctx.fillStyle = '#e9e1d2'; ctx.fillRect(0, 0, sc.W, sc.H); }
    const chars = ents.filter(e => e.kind === 'char' && !e.hidden);
    // เรียงหน้า–หลัง: ของที่มีฐานใช้ขอบหน้าของฐาน ณ ตำแหน่งตัวละครที่อยู่ใกล้ที่สุด
    const list = [];
    const keyFor = (feet, xr, fallback) => {
      let best = null, bd = 1e9;
      for (const c of chars) { if (c.x < xr[0] - 2 || c.x > xr[1] + 2) continue; const d = Math.abs(c.x - (xr[0] + xr[1]) / 2); if (d < bd) { bd = d; best = c; } }
      if (!best) return fallback;
      let k = -1; for (const f of feet) k = Math.max(k, frontY(f, best.x));
      return k > 0 ? k : fallback;
    };
    for (const p of sc.props) {
      if (p.hidden) continue;
      const g = p._g; const key = p.sortY != null ? p.sortY : g.feet.length ? keyFor(g.feet, p._xr, p.y) : p.y;
      list.push({ kind: 'prop', p, key });
    }
    for (const o of sc.occ) list.push({ kind: 'occ', o, key: keyFor([o.p], o._xr, Math.max(...o.p.map(q => q[1]))) });
    for (const e of ents) {
      if (e.hidden) continue;
      let key = e.y;
      if (e.onProp) { const it = list.find(l => l.kind === 'prop' && l.p === e.onProp); key = (it ? it.key : e.y) + .5; }
      if (e.pose === 'sleep' && e.bed) { const it = e.bed.prop && list.find(l => l.kind === 'prop' && l.p === e.bed.prop); key = it ? it.key + .5 : Math.max(e.bed.head[1], e.bed.foot[1]) + 1; }
      list.push({ kind: e.kind, e, key });
    }
    list.sort((a, b) => a.key - b.key);
    if (opts.debug) { drawDebug(ctx, sc); const G = opts.debug.g ? opts.debug : null; if (G) { ctx.fillStyle = 'rgba(0,255,0,.35)'; for (let j = 0; j < G.GH; j++) for (let i = 0; i < G.GW; i++) if (G.g[j * G.GW + i]) ctx.fillRect(i * CELL, j * CELL, CELL - 1, CELL - 1); } }
    for (const it of list) {
      if (it.kind === 'prop') { drawProp(ctx, it.p); const g = it.p._g; if (sc._base && !it.p.floorItem) drawOccPatch(ctx, sc, g.x0, g.y0, g.x0 + g.w, g.y0 + g.h, it.p.y + 1); }
      else if (it.kind === 'occ') { if (bg) drawOccluder(ctx, bg, it.o, sc); }
      else if (it.kind === 'char') { const bb = drawChar(ctx, it.e, opts.t, sc); if (bb && sc._base) drawOccPatch(ctx, sc, bb[0], bb[1], bb[2], bb[3], bb[4]); }
    }
    if (opts.spots) for (const sp of opts.spots) drawSpot(ctx, sp, opts.t, opts.near === sp);
    if (opts.target) {
      const [x, y] = opts.target; const r = sc.ch * .08 + 3 * Math.sin(opts.t * 8);
      ctx.strokeStyle = 'rgba(255,240,180,.95)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, r, r * .5, 0, 0, 7); ctx.stroke();
    }
    if (opts.ghost) {
      const g = opts.ghost; ctx.save(); ctx.globalAlpha = .6; drawProp(ctx, g); ctx.globalAlpha = 1;
      ctx.strokeStyle = opts.ghostOk ? 'rgba(120,230,160,.95)' : 'rgba(255,110,110,.95)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
      for (const f of g._g.feet) { ctx.beginPath(); f.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.stroke(); }
      ctx.restore();
    }
    ctx.restore();
    if (opts.tint) { ctx.fillStyle = opts.tint; ctx.fillRect(0, 0, cw, ch); }
    drawLabels(ctx, cw, ch, LABELS, PINS, opts.safe || {});
    { const placed = []; for (const e of ents) if (e.bubble && e.bubble.until > opts.t && !e.hidden) drawBubble(ctx, e, sc, cw, ch, opts.safe || {}, placed); }
    LABELS = null; PINS = null;
  }
  function drawDebug(ctx, sc) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,255,0,.18)'; for (const w of sc.walk) { ctx.beginPath(); w.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,0,0,.25)';
    for (const p of sc.props) for (const f of p._g.feet) { ctx.beginPath(); f.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.fill(); }
    for (const o of sc.obs || []) { const f = o.p || o; ctx.beginPath(); f.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.fill(); }
    ctx.restore();
  }
  function drawProp(ctx, p) {
    const img = im('furniture/' + p.img), g = p._g;
    if (!img) return;
    ctx.save();
    if (p.flip) { ctx.translate(g.x0 + g.w / 2, 0); ctx.scale(-1, 1); ctx.translate(-(g.x0 + g.w / 2), 0); }
    ctx.drawImage(img, g.x0, g.y0, g.w, g.h);
    ctx.restore();
  }
  function convexHull(pts) {
    pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (const p of pts.reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    up.pop(); lo.pop(); return lo.concat(up);
  }
  // ส่วนของภาพฉากที่ยื่นขึ้นจากพื้น (ผนัง เสา เคาน์เตอร์ในภาพ) วาดทับตัวละครที่อยู่ด้านหลัง
  function drawOccluder(ctx, bg, o, sc) {
    ctx.save(); ctx.beginPath();
    const hull = o.clip || convexHull(o.p.concat(o.p.map(p => [p[0], p[1] - o.h])));
    hull.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    ctx.closePath(); ctx.clip(); ctx.drawImage(bg, 0, 0, sc.W, sc.H); ctx.restore();
  }
  function drawSpot(ctx, sp, t, active) {
    const r = sp.r || 12;
    const bob = Math.sin(t * 3 + sp.x) * 3;
    ctx.save(); ctx.globalAlpha = active ? 1 : .88;
    const y = sp.y - (sp.lift || 34) + bob;
    ctx.fillStyle = 'rgba(20,30,25,.3)'; ctx.beginPath(); ctx.ellipse(sp.x, sp.y, r, r * .45, 0, 0, 7); ctx.fill();
    ctx.fillStyle = active ? '#ffe7a3' : '#fff8ec'; ctx.strokeStyle = active ? '#d99a2b' : '#3d5a4c'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sp.x, y + r * 1.55); ctx.lineTo(sp.x - r * .5, y + r * .85); ctx.arc(sp.x, y, r, Math.PI * .75, Math.PI * .25); ctx.closePath(); ctx.fill(); ctx.stroke();
    const ic = window.ICONS && ICONS.img(sp.icon);
    if (ic && ic.complete && ic.naturalWidth) ctx.drawImage(ic, sp.x - r * .95, y - r * .95, r * 1.9, r * 1.9);
    else { ctx.font = (r * 1.1) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#4a3524'; ctx.fillText('•', sp.x, y + 1); }
    if (active && LABELS) LABELS.push({ x: sp.x, y: y - r * 1.6, text: sp.label, pri: 2, style: 'spot' });
    if (PINS) PINS.push([sp.x, y, r]);
    ctx.restore();
  }
  function drawLabels(ctx, cw, ch, list, pins, safe) {
    const placed = [];
    const s = viewScale();
    for (const [px, py, r] of pins) { const [sx, sy] = toScreen(px, py, cw, ch); placed.push({ x: sx - r * s, y: sy - r * s, w: r * 2 * s, h: r * 2.6 * s }); }
    list.sort((a, b) => b.pri - a.pri);
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const top = (safe.top || 0) + 4, bottom = ch - (safe.bottom || 0) - 4;
    for (const L of list) {
      ctx.font = (L.style === 'spot' ? '600 12px' : '600 11.5px') + ' Kanit, sans-serif';
      const w = ctx.measureText(L.text).width + 14, hgt = 20;
      let [x, y] = toScreen(L.x, L.y, cw, ch); y -= hgt / 2;
      if (L.pri < 2 && (x < -10 || x > cw + 10 || y < -10 || y > ch + 10)) continue;
      x = Math.max(w / 2 + 6, Math.min(cw - w / 2 - 6, x));
      const r = { x: x - w / 2, y: y - hgt / 2, w, h: hgt };
      const hit = q => placed.some(p => q.x < p.x + p.w && q.x + q.w > p.x && q.y < p.y + p.h && q.y + q.h > p.y);
      for (let i = 0; i < 6 && hit(r); i++) r.y -= hgt + 2;
      if (hit(r) && L.pri < 2) continue;
      r.y = Math.max(top, Math.min(bottom - hgt, r.y));
      placed.push(r);
      ctx.fillStyle = L.style === 'player' ? 'rgba(46,92,70,.92)' : L.style === 'spot' ? 'rgba(28,40,34,.9)' : 'rgba(28,36,32,.78)';
      roundRect(ctx, r.x, r.y, r.w, r.h, 10); ctx.fill();
      ctx.fillStyle = '#fff8ec'; ctx.fillText(L.text, r.x + r.w / 2, r.y + r.h / 2 + .5);
    }
    ctx.restore();
  }

  // ---------------- ตัวละคร ----------------
  const frameInfo = (cid, f) => (CM[cid] || {})[f];
  const hasFrame = (cid, f) => !!frameInfo(cid, f) && !!imLazy(charPath(cid, f));
  // ความสูงหัวถึงเท้าที่วาดในฉาก (พิกเซลฉาก)
  function charK(e, sc) { return sc.ch * (e.scaleMul || 1) / BASE_H; }
  function drawChar(ctx, e, t, sc) {
    if (e.fadeIn != null && t - e.fadeIn < .4) { ctx.save(); ctx.globalAlpha = Math.max(.05, (t - e.fadeIn) / .4); const r = drawChar0(ctx, e, t, sc); ctx.restore(); return r; }
    return drawChar0(ctx, e, t, sc);
  }
  function drawChar0(ctx, e, t, sc) {
    const k = charK(e, sc), H0 = sc.ch * (e.scaleMul || 1);
    const pose = e.pose || 'idle';
    let [fr, flip] = resolveDir(e.cid, e.facing ? e.facing.f : 'front', e.facing ? e.facing.flip : false);
    let ox = e.x, oy = e.y, bob = 0, rot = 0, sy = 1, sx = 1;
    let anchor = 'foot', shadow = true;
    if (pose === 'walk') {
      const ph = t * 9 + (e.seed || 0);
      bob = Math.abs(Math.sin(ph)) * H0 * .035; rot = Math.sin(ph) * .045; sy = 1 - Math.abs(Math.cos(ph)) * .015;
      // ถ้ามีชุดภาพเดินหลายเฟรม (เช่น front3q_walk0..n) จะใช้แทนการโยกตัว
      const seq = (CM[e.cid] || {})[fr + '_walk'];
      if (seq) { fr = fr + '_walk' + (Math.floor(ph / Math.PI * 2) % seq); bob = 0; rot = 0; sy = 1; }
    } else if (pose === 'sit' || pose === 'work' && e.seat) {
      const want = e.sitFrame && e.sitFrame !== 'sitfloor' ? e.sitFrame : e.sitPose || 'sitfloor';
      fr = hasFrame(e.cid, want) ? want : 'sitfloor';
      flip = !!e.sitFlip; anchor = 'seat'; shadow = false;
      if (pose === 'work') bob = Math.abs(Math.sin(t * 7)) * 1.2;
      if (e.seat) { ox = e.seat[0]; oy = e.seat[1]; }
    } else if (pose === 'work') { // ทำงานยืน (ทำอาหาร ซื้อของ) หันหลังเข้าหาเคาน์เตอร์
      rot = Math.sin(t * 6) * .02; bob = Math.abs(Math.sin(t * 8)) * 1.2;
    } else if (pose === 'exercise') { bob = Math.abs(Math.sin(t * 9)) * H0 * .08; sy = 1 - Math.abs(Math.sin(t * 9)) * .05; }
    else if (pose === 'wave' || pose === 'buy') { rot = Math.sin(t * 12) * .06; bob = Math.max(0, Math.sin(t * 9)) * H0 * .03; }
    else if (pose === 'ride') { fr = hasFrame(e.cid, 'scooter') ? 'scooter' : 'front'; flip = !flip; }
    else if (pose === 'wave' && hasFrame(e.cid, 'wave')) fr = 'wave';
    else if (pose === 'idle') { sy = 1 + Math.sin(t * 2 + (e.seed || 0)) * .006; }
    if (pose === 'sleep' && e.bed) return drawSleeping(ctx, e, t, sc, k);
    const blink = false; void blink;
    const fi = frameInfo(e.cid, fr) || frameInfo(e.cid, 'front');
    const img = imLazy(charPath(e.cid, fi === frameInfo(e.cid, fr) ? fr : 'front')) || imLazy(charPath(e.cid, 'front'));
    if (shadow) { ctx.fillStyle = 'rgba(25,30,28,.3)'; ctx.beginPath(); ctx.ellipse(ox, oy, H0 * .16, H0 * .05, 0, 0, 7); ctx.fill(); }
    if (e.isPlayer && e.ring && shadow) { ctx.strokeStyle = 'rgba(159,214,176,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(ox, oy, H0 * .19, H0 * .06, 0, 0, 7); ctx.stroke(); }
    if (!img || !fi) return;
    const w = fi.w * k, h = fi.h * k;
    ctx.save();
    ctx.translate(ox, oy - bob); ctx.rotate(rot); ctx.scale(flip ? -sx : sx, sy);
    ctx.drawImage(img, -fi.fx * k, -h + (anchor === 'seat' ? (e.seatDrop || 0) : 0), w, h);
    ctx.restore();
    const occY = e.occY != null && anchor === 'seat' ? e.occY : oy;
    if (e.label && LABELS) LABELS.push({ x: ox, y: oy - h - 6 - bob, text: e.label, pri: e.isPlayer ? 3 : 1, style: e.isPlayer ? 'player' : 'npc' });
    // สีหน้า/อารมณ์ชั่วคราวเหนือหัว (ใช้ภาพสีหน้าของตัวละครเอง)
    if (e.emo && e.emo.until > t) { const fimg = imLazy(charPath(e.cid, 'face_' + e.emo.k)) || imLazy(charPath(e.cid, 'face_normal'));
      if (fimg) { const s = H0 * .42, yy = oy - h - bob - s - 4; ctx.save(); ctx.globalAlpha = Math.min(1, (e.emo.until - t) * 2); ctx.fillStyle = '#fffaf1'; ctx.strokeStyle = '#c9a77a'; ctx.lineWidth = Math.max(1, s * .05); ctx.beginPath(); ctx.arc(ox, yy + s / 2, s * .6, 0, 7); ctx.fill(); ctx.stroke(); ctx.drawImage(fimg, ox - s / 2, yy + s * .02, s, s * fimg.height / fimg.width); ctx.restore(); } }
    return [ox - w - 4, oy - h - bob - 6, ox + w + 4, oy + H0 * .08, occY + 1];
  }
  // นอนราบบนที่นอน: แผ่ภาพยืนหน้าตรงลงบนระนาบเตียงตามแนวหัวเตียง→ปลายเตียง แล้ววาดผ้าห่มทับช่วงล่าง
  function drawSleeping(ctx, e, t, sc, k) {
    const b = e.bed, fi = frameInfo(e.cid, 'front'), img = imLazy(charPath(e.cid, 'front'));
    if (!img || !fi) return;
    const [hx, hy] = b.head, [fx, fy] = b.foot;
    const len = Math.hypot(fx - hx, fy - hy);
    const wv = b.wdir, wl = Math.hypot(wv[0], wv[1]);
    const S = len / fi.h; // ความยาวลำตัวพอดีความยาวที่นอน
    const ws = S * (b.wk || 1);
    ctx.save();
    ctx.transform(wv[0] / wl * ws, wv[1] / wl * ws, (fx - hx) / fi.h, (fy - hy) / fi.h, hx, hy);
    ctx.drawImage(img, -fi.fx, 0, fi.w, fi.h);
    ctx.restore();
    // ผ้าห่ม: วาดส่วนผ้าห่มของภาพเตียงทับลำตัวช่วงล่าง
    if (b.blanket && b.bg) {
      const bgi = im(sc.bg);
      if (bgi) { ctx.save(); ctx.beginPath(); b.blanket.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.clip(); ctx.drawImage(bgi, 0, 0, sc.W, sc.H); ctx.restore(); }
    } else if (b.blanket && b.prop) {
      const bedImg = im('furniture/' + b.prop.img), g = b.prop._g;
      if (bedImg) {
        ctx.save(); ctx.beginPath(); b.blanket.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.clip();
        if (b.prop.flip) { ctx.translate(g.x0 + g.w / 2, 0); ctx.scale(-1, 1); ctx.translate(-(g.x0 + g.w / 2), 0); }
        ctx.drawImage(bedImg, g.x0, g.y0, g.w, g.h); ctx.restore();
      }
    }
    // z z z
    ctx.save(); ctx.textAlign = 'left'; ctx.fillStyle = '#f3f8ff'; ctx.shadowColor = 'rgba(20,35,50,.6)'; ctx.shadowBlur = 3;
    for (let i = 0; i < 3; i++) { const ph = (t * .7 + i / 3) % 1; ctx.globalAlpha = Math.sin(ph * Math.PI); ctx.font = `700 ${8 + ph * 7}px Mali, sans-serif`; ctx.fillText('z', hx + 6 + ph * 14, hy - 10 - ph * 24); }
    ctx.restore();
    void k;
  }
  function drawBubble(ctx, e, sc, cw, ch, safe, placed) {
    const H0 = sc.ch * (e.scaleMul || 1);
    const [ax, ay0] = toScreen(e.x, e.y - H0 * 1.05, cw, ch);
    ctx.save();
    const fs = 13;
    ctx.font = `500 ${fs}px Mali, Kanit, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lines = wrap(ctx, e.bubble.text, Math.min(210, cw * .55));
    const lh = fs * 1.4, w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 20, h = lines.length * lh + 12;
    const top = (safe.top || 0) + 6, bottom = ch - (safe.bottom || 0) - 6;
    const x = Math.max(w / 2 + 8, Math.min(cw - w / 2 - 8, ax));
    if (ay0 < -60 || ay0 > ch + 60 || ax < -60 || ax > cw + 60) { ctx.restore(); return; }
    let y = ay0 - h - 22;
    for (let i = 0; i < 4 && placed.some(p => x - w / 2 < p.x + p.w && x + w / 2 > p.x && y < p.y + p.h && y + h > p.y); i++) y -= h + 6;
    y = Math.max(top, Math.min(bottom - h, y));
    placed.push({ x: x - w / 2, y, w, h });
    ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = '#3d5a4c'; ctx.lineWidth = 1.5;
    roundRect(ctx, x - w / 2, y, w, h, 11); ctx.fill(); ctx.stroke();
    const tx = Math.max(x - w / 2 + 14, Math.min(x + w / 2 - 14, ax));
    if (ay0 > y + h) { ctx.beginPath(); ctx.moveTo(tx - 7, y + h - 1); ctx.lineTo(tx + (ax - tx) * .6, Math.min(ay0, y + h + 12)); ctx.lineTo(tx + 7, y + h - 1); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillRect(tx - 6, y + h - 3, 12, 3); }
    ctx.fillStyle = '#2a3a32'; lines.forEach((l, i) => ctx.fillText(l, x, y + 6 + lh / 2 + i * lh));
    ctx.restore();
  }
  function wrap(ctx, text, maxW) {
    let words;
    try { words = [...new Intl.Segmenter('th', { granularity: 'word' }).segment(text)].map(s => s.segment); } catch (e) { words = text.split(''); }
    const lines = []; let cur = '';
    for (const w of words) { if (ctx.measureText(cur + w).width > maxW && cur) { lines.push(cur); cur = w.trimStart(); } else cur += w; }
    if (cur) lines.push(cur); return lines.slice(0, 4);
  }
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  // ภาพหน้า (ครอปส่วนหัวจากภาพหน้าตรง) สำหรับกล่องสนทนาและรายการ
  function portrait(cid, size, emo) {
    const c = document.createElement('canvas'); c.width = size; c.height = size;
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
    const ff = frameInfo(cid, 'face_' + (emo || 'normal')) ? 'face_' + (emo || 'normal') : frameInfo(cid, 'face_normal') ? 'face_normal' : null;
    if (ff && imLazy(charPath(cid, ff))) { const fimg = imLazy(charPath(cid, ff)), s = Math.max(fimg.width, fimg.height); x.drawImage(fimg, (s - fimg.width) / 2 * size / s, (s - fimg.height) * size / s, fimg.width * size / s, fimg.height * size / s); return c; }
    const fi = frameInfo(cid, 'front'), img = im(charPath(cid, 'front'));
    if (!img || !fi) return c;
    const side = fi.h * .46, cx = fi.fx;
    x.drawImage(img, cx - side / 2, 0, side, side, 0, 0, size, size);
    return c;
  }
  // ภาพเต็มตัวสำหรับเมนู
  function bodyCanvas(cid, frame, hgt, dpr) {
    const fi = frameInfo(cid, frame) || frameInfo(cid, 'front'); const img = imLazy(charPath(cid, fi === frameInfo(cid, frame) ? frame : 'front'));
    const c = document.createElement('canvas'); dpr = dpr || 2;
    if (!fi || !img) { c.width = 10; c.height = 10; return c; }
    const k = hgt * dpr / fi.h; c.width = Math.round(fi.w * k); c.height = Math.round(fi.h * k);
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, c.width, c.height);
    c.style.height = hgt + 'px'; c.style.width = 'auto'; return c;
  }

  window.CORE = { CELL, BASE_H, IMG, im, imLazy, failed, loadImage, preload, charPath, charFiles, inPoly, inWalk, walkPolys, frontY, propGeom, propPt, prepScene,
    buildGrid, walkable, nearestWalkable, cellPt, astar, los, cam, setScene, setZoom, ZMIN, ZMAX, fitCamera, viewScale, clampCam, toWorld, toScreen,
    faceFrom, drawScene, drawChar, prepFloor, portrait, bodyCanvas, hasFrame, frameInfo };
})();
