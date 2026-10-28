/* ชุดไอคอน SVG สไตล์การ์ตูน 3D (ไล่สี + ขอบเข้ม + ไฮไลต์มันวาว) ใช้แทนอีโมจิทั้งเกม
   ICONS.svg(key, size) → สตริง SVG · ICONS.el(key) → <span class="ico"> · ICONS.img(key) → Image สำหรับวาดบน canvas
   ICONS.fromEmoji(e) → key ของไอคอนที่ตรงกับอีโมจิเดิม (ข้อมูลเกมเดิมยังใช้อีโมจิเป็นรหัสได้) */
'use strict';
window.ICONS = (function () {
  const hex = c => { c = c.replace('#', ''); return [0, 2, 4].map(i => parseInt(c.substr(i, 2), 16)); };
  const toHex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (c, t, k) => { const a = hex(c), b = hex(t); return toHex(a.map((v, i) => v + (b[i] - v) * k)); };
  const lt = (c, k) => mix(c, '#ffffff', k), dk = (c, k) => mix(c, '#2a1a10', k);
  let uid = 0;
  // ชิ้นส่วน: [รูปทรง, สี] · รูปทรง = path d | {c:[cx,cy,r]} | {e:[cx,cy,rx,ry]} | {r:[x,y,w,h,rad]}
  function shape(s) {
    if (typeof s === 'string') return `<path d="${s}"`;
    if (s.c) return `<circle cx="${s.c[0]}" cy="${s.c[1]}" r="${s.c[2]}"`;
    if (s.e) return `<ellipse cx="${s.e[0]}" cy="${s.e[1]}" rx="${s.e[2]}" ry="${s.e[3]}"`;
    if (s.r) return `<rect x="${s.r[0]}" y="${s.r[1]}" width="${s.r[2]}" height="${s.r[3]}" rx="${s.r[4] || 0}"`;
    return '<path d=""';
  }
  // สีหลักของธีม
  const P = { red: '#e8604c', coral: '#f08a6c', orange: '#f2a03d', gold: '#f2c14e', yellow: '#ffd75e', cream: '#fbf3e1', beige: '#e9d6b4', brown: '#a8714a', wood: '#c48a55', green: '#5fae6e', forest: '#3f7a52', mint: '#8fd3a4', teal: '#3fb3a6', sky: '#62b6e8', blue: '#4f86d9', navy: '#3a5a8c', purple: '#9b7ad8', pink: '#f27aa6', rose: '#f6a4bf', gray: '#9aa3a8', steel: '#c9d2d6', white: '#fdfbf6', dark: '#4a4440', skin: '#f6c9a0' };
  // นิยามไอคอน: แต่ละชิ้น [shape, color, opts] · opts.flat = ไม่ไล่สี · opts.noline = ไม่มีขอบ
  const DEF = {
    home: [['M8 31 L32 10 L56 31 L51 31 L51 54 L13 54 L13 31Z', P.cream], ['M5 32 L32 8 L59 32 L54 36 L32 17 L10 36Z', P.red], [{ r: [27, 37, 11, 17, 2] }, P.wood], [{ r: [16, 36, 8, 8, 1.5] }, P.sky], [{ r: [41, 36, 8, 8, 1.5] }, P.sky], [{ r: [41, 13, 6, 10, 1] }, P.brown]],
    sofa: [[{ r: [9, 20, 46, 20, 9] }, P.sky], [{ r: [5, 30, 12, 20, 5] }, P.blue], [{ r: [47, 30, 12, 20, 5] }, P.blue], [{ r: [14, 34, 36, 12, 4] }, lt(P.sky, .2)], [{ r: [10, 46, 44, 7, 3] }, P.navy], [{ r: [12, 52, 4, 5, 1] }, P.brown], [{ r: [48, 52, 4, 5, 1] }, P.brown]],
    cart: [['M6 12 L14 12 L20 40 L50 40', P.dark, { stroke: 4 }], ['M16 18 L56 18 L51 36 L20 36Z', P.sky], ['M24 22 L24 33 M32 22 L32 33 M40 22 L40 33 M48 22 L46 33', lt(P.sky, .5), { stroke: 2.5 }], [{ c: [24, 49, 5] }, P.red], [{ c: [46, 49, 5] }, P.red]],
    briefcase: [['M24 18 L24 12 Q24 9 27 9 L37 9 Q40 9 40 12 L40 18', P.brown, { stroke: 4 }], [{ r: [7, 17, 50, 36, 7] }, P.wood], [{ r: [7, 29, 50, 5, 0] }, dk(P.wood, .25)], [{ r: [28, 26, 8, 11, 2] }, P.gold]],
    moneybag: [['M22 14 Q32 20 42 14 L38 22 L26 22Z', P.gold], ['M26 21 L38 21 Q56 30 54 46 Q52 56 32 56 Q12 56 10 46 Q8 30 26 21Z', P.gold], [{ r: [24, 18, 16, 5, 2.5] }, P.brown], ['M36 30 Q30 28 28 32 Q27 36 32 37 Q37 38 36 42 Q34 46 27 44 M32 27 L32 48', P.forest, { stroke: 3.4, noline: true }]],
    chart: [[{ r: [7, 9, 50, 46, 7] }, P.white], [{ r: [14, 36, 7, 13, 1.5] }, P.sky], [{ r: [25, 28, 7, 21, 1.5] }, P.teal], [{ r: [36, 32, 7, 17, 1.5] }, P.sky], [{ r: [47, 22, 5, 27, 1.5] }, P.blue], ['M13 30 L25 20 L35 25 L50 13', P.red, { stroke: 3.5, noline: true }], ['M44 12 L52 11 L50 19Z', P.red]],
    friends: [[{ c: [22, 22, 9] }, P.skin], ['M8 52 Q8 34 22 34 Q36 34 36 52Z', P.blue], [{ c: [42, 24, 8.5] }, P.skin], ['M29 54 Q29 37 42 37 Q55 37 55 54Z', P.pink], ['M13 20 Q14 10 22 11 Q31 11 31 20 Q26 15 13 20Z', P.dark], ['M33 23 Q33 13 42 14 Q51 14 51 25 L51 31 Q48 20 33 23Z', P.brown]],
    heart: [['M32 54 C14 42 6 32 8 22 C10 12 24 9 32 19 C40 9 54 12 56 22 C58 32 50 42 32 54Z', P.pink]],
    love: [['M32 54 C14 42 6 32 8 22 C10 12 24 9 32 19 C40 9 54 12 56 22 C58 32 50 42 32 54Z', P.pink], ['M44 40 C38 36 36 33 37 30 C38 27 42 26 44 29 C46 26 50 27 51 30 C52 33 50 36 44 40Z', P.coral]],
    health: [['M32 54 C14 42 6 32 8 22 C10 12 24 9 32 19 C40 9 54 12 56 22 C58 32 50 42 32 54Z', P.red], ['M28 24 L36 24 L36 29 L41 29 L41 36 L36 36 L36 41 L28 41 L28 36 L23 36 L23 29 L28 29Z', P.white, { flat: true }]],
    target: [[{ c: [30, 34, 22] }, P.white], [{ c: [30, 34, 16] }, P.red], [{ c: [30, 34, 10] }, P.white], [{ c: [30, 34, 5] }, P.red], ['M30 34 L52 12', P.brown, { stroke: 3.5 }], ['M48 10 L56 8 L54 16 L50 14Z', P.gold]],
    more: [[{ r: [8, 8, 21, 21, 6] }, P.sky], [{ r: [35, 8, 21, 21, 6] }, P.gold], [{ r: [8, 35, 21, 21, 6] }, P.green], [{ r: [35, 35, 21, 21, 6] }, P.pink]],
    map: [['M6 16 L22 10 L42 16 L58 10 L58 50 L42 56 L22 50 L6 56Z', P.mint], ['M22 10 L22 50 L42 56 L42 16Z', lt(P.mint, .3)], ['M32 8 Q22 8 22 18 Q22 26 32 38 Q42 26 42 18 Q42 8 32 8Z', P.red], [{ c: [32, 18, 4.5] }, P.white]],
    bag: [['M22 18 Q22 7 32 7 Q42 7 42 18', P.brown, { stroke: 4 }], ['M12 22 Q12 16 18 16 L46 16 Q52 16 52 22 L54 50 Q54 56 48 56 L16 56 Q10 56 10 50Z', P.orange], [{ r: [19, 34, 26, 15, 5] }, dk(P.orange, .15)], [{ r: [29, 34, 6, 6, 2] }, P.gold]],
    quest: [[{ r: [11, 10, 42, 48, 7] }, P.wood], [{ r: [16, 15, 32, 40, 4] }, P.white], [{ r: [23, 6, 18, 9, 3] }, P.gray], ['M21 27 L25 31 L31 23 M21 41 L25 45 L31 37', P.green, { stroke: 3, noline: true }], ['M35 28 L43 28 M35 42 L43 42', P.gray, { stroke: 3, noline: true }]],
    phone: [[{ r: [16, 5, 32, 54, 8] }, P.dark], [{ r: [20, 11, 24, 38, 3] }, P.sky], [{ c: [32, 53, 2.5] }, P.gray], [{ r: [24, 16, 7, 7, 2] }, P.gold], [{ r: [33, 16, 7, 7, 2] }, P.mint], [{ r: [24, 26, 7, 7, 2] }, P.pink], [{ r: [33, 26, 7, 7, 2] }, P.white]],
    pin: [['M32 6 Q16 6 16 22 Q16 34 32 54 Q48 34 48 22 Q48 6 32 6Z', P.green], [{ c: [32, 22, 7] }, P.white], [{ e: [32, 56, 12, 3.5] }, 'rgba(0,0,0,.18)', { flat: true, noline: true }]],
    camera: [[{ r: [6, 18, 52, 36, 8] }, P.dark], [{ r: [20, 11, 18, 10, 3] }, P.dark], [{ c: [32, 36, 12] }, P.steel], [{ c: [32, 36, 7] }, P.navy], [{ c: [48, 25, 3] }, P.gold]],
    paw: [[{ e: [32, 42, 13, 11] }, P.wood], [{ e: [16, 28, 6, 7.5] }, P.wood], [{ e: [25, 17, 6, 7.5] }, P.wood], [{ e: [39, 17, 6, 7.5] }, P.wood], [{ e: [48, 28, 6, 7.5] }, P.wood]],
    hanger: [['M32 20 Q32 14 36 13 Q40 12 40 8 Q40 4 35 4 Q30 4 30 9', P.steel, { stroke: 3.5 }], ['M32 20 L6 44 Q4 48 9 48 L55 48 Q60 48 58 44Z', P.wood], [{ r: [10, 44, 44, 4, 2] }, dk(P.wood, .2)]],
    gear: [['M28 6 L36 6 L37 13 Q41 14 44 16 L50 12 L55 18 L50 23 Q52 27 52 31 L58 33 L58 41 L51 42 Q50 46 48 49 L52 55 L46 60 L41 55 Q37 57 33 57 L32 63 L24 63 L23 56 Q19 55 16 52 L10 56 L5 50 L10 45 Q8 41 8 37 L2 35 L2 27 L9 26 Q10 22 12 19 L8 13 L14 8 L19 13 Q23 11 27 10Z', P.gray], [{ c: [30, 35, 9] }, P.dark]],
    eye: [['M4 32 Q32 6 60 32 Q32 58 4 32Z', P.white], [{ c: [32, 32, 12] }, P.teal], [{ c: [32, 32, 6] }, P.dark], [{ c: [36, 28, 2.5] }, P.white, { flat: true, noline: true }]],
    eyeoff: [['M4 32 Q32 6 60 32 Q32 58 4 32Z', P.white], [{ c: [32, 32, 12] }, P.gray], ['M10 52 L54 12', P.red, { stroke: 5 }]],
    pause: [[{ r: [16, 12, 11, 40, 4] }, P.cream], [{ r: [37, 12, 11, 40, 4] }, P.cream]],
    play: [['M18 10 Q18 6 22 8 L52 29 Q55 32 52 35 L22 56 Q18 58 18 54Z', P.cream]],
    ff2: [['M6 14 L30 32 L6 50Z', P.cream], ['M30 14 L54 32 L30 50Z', P.cream]],
    ff3: [['M2 16 L20 32 L2 48Z', P.cream], ['M22 16 L40 32 L22 48Z', P.cream], ['M42 16 L60 32 L42 48Z', P.cream]],
    plus: [['M27 10 L37 10 L37 27 L54 27 L54 37 L37 37 L37 54 L27 54 L27 37 L10 37 L10 27 L27 27Z', P.cream]],
    minus: [[{ r: [10, 27, 44, 10, 4] }, P.cream]],
    recenter: [[{ c: [32, 32, 18] }, 'none', { stroke: 5, color: P.cream }], [{ c: [32, 32, 7] }, P.gold], ['M32 4 L32 14 M32 50 L32 60 M4 32 L14 32 M50 32 L60 32', P.cream, { stroke: 5 }]],
    close: [['M16 12 L32 28 L48 12 L52 16 L36 32 L52 48 L48 52 L32 36 L16 52 L12 48 L28 32 L12 16Z', P.dark]],
    back: [['M38 10 L16 32 L38 54', P.dark, { stroke: 7 }]],
    sound: [['M8 24 L20 24 L34 12 L34 52 L20 40 L8 40Z', P.cream], ['M42 22 Q50 32 42 42 M48 16 Q60 32 48 48', P.cream, { stroke: 4 }]],
    soundoff: [['M8 24 L20 24 L34 12 L34 52 L20 40 L8 40Z', P.cream], ['M42 24 L56 40 M56 24 L42 40', P.red, { stroke: 4.5 }]],
    bed: [[{ r: [6, 16, 10, 38, 3] }, P.wood], [{ r: [10, 32, 48, 14, 4] }, P.white], [{ r: [14, 26, 14, 9, 4] }, P.mint], [{ r: [28, 30, 30, 17, 4] }, P.sky], [{ r: [6, 44, 54, 6, 2] }, P.brown], [{ r: [54, 40, 6, 14, 2] }, P.wood]],
    tv: [[{ r: [4, 10, 56, 36, 6] }, P.dark], [{ r: [9, 15, 46, 26, 3] }, P.sky], ['M20 22 L30 30 L38 24 L48 34', P.white, { stroke: 3, noline: true }], [{ r: [18, 48, 28, 7, 3] }, P.wood]],
    laptop: [[{ r: [12, 12, 40, 28, 4] }, P.dark], [{ r: [16, 16, 32, 20, 2] }, P.sky], ['M4 44 L60 44 L56 52 L8 52Z', P.steel]],
    fridge: [[{ r: [14, 4, 36, 56, 7] }, P.steel], [{ r: [14, 24, 36, 3, 0] }, P.gray], [{ r: [41, 10, 3.5, 10, 1.5] }, P.dark], [{ r: [41, 32, 3.5, 14, 1.5] }, P.dark]],
    pan: [[{ e: [26, 36, 20, 13] }, P.dark], [{ e: [26, 33, 15, 8] }, P.gray], [{ e: [24, 32, 6, 4] }, P.yellow], [{ c: [24, 32, 2.5] }, P.orange, { flat: true, noline: true }], ['M44 31 L60 25', P.brown, { stroke: 6 }]],
    toilet: [[{ r: [14, 6, 22, 20, 4] }, P.white], ['M10 28 L50 28 Q50 40 38 44 L36 56 L20 56 L18 44 Q10 40 10 28Z', P.white], [{ e: [30, 29, 19, 5] }, P.steel]],
    brush: [['M10 50 L46 14', P.sky, { stroke: 7 }], [{ r: [40, 6, 18, 10, 3] }, P.white], ['M50 26 Q50 32 46 36 Q42 32 42 28 Q42 24 46 22Z', P.mint]],
    shower: [['M14 58 L14 14 Q14 6 22 6 L36 6 Q42 6 42 12', P.steel, { stroke: 5 }], ['M30 14 L54 14 L50 22 L34 22Z', P.steel], ['M36 28 L34 36 M42 28 L42 38 M48 28 L50 36', P.sky, { stroke: 3.5 }]],
    plant: [[{ r: [18, 38, 28, 20, 5] }, P.coral], ['M32 38 Q20 32 14 18 Q28 18 32 34 Q30 16 40 6 Q46 18 34 36 Q42 22 54 22 Q48 34 33 39Z', P.green]],
    bulb: [[{ c: [32, 26, 18] }, P.yellow], [{ r: [24, 42, 16, 12, 3] }, P.gray], [{ r: [26, 54, 12, 5, 2] }, P.dark], ['M28 30 L32 22 L36 30', P.orange, { stroke: 2.5, noline: true }]],
    wardrobe: [[{ r: [10, 4, 44, 54, 6] }, P.wood], ['M32 6 L32 56', dk(P.wood, .35), { stroke: 2.5, noline: true }], [{ r: [27, 26, 3, 9, 1.5] }, P.dark], [{ r: [34, 26, 3, 9, 1.5] }, P.dark], [{ r: [12, 56, 6, 5, 1] }, P.brown], [{ r: [46, 56, 6, 5, 1] }, P.brown]],
    chair: [[{ r: [18, 6, 28, 26, 6] }, P.coral], [{ r: [12, 32, 40, 10, 4] }, P.orange], ['M18 42 L16 58 M46 42 L48 58', P.brown, { stroke: 4.5 }]],
    food: [['M6 30 L58 30 Q56 52 32 54 Q8 52 6 30Z', P.white], [{ e: [32, 30, 26, 6] }, P.yellow], ['M14 28 Q24 16 32 26 Q40 14 50 28', P.orange, { stroke: 0 }], [{ c: [22, 26, 5] }, P.green], [{ c: [40, 25, 5] }, P.red], ['M44 8 L36 26 M52 10 L40 26', P.brown, { stroke: 3, noline: true }]],
    noodle: [['M6 30 L58 30 Q56 52 32 54 Q8 52 6 30Z', P.red], [{ e: [32, 30, 26, 6] }, P.yellow], ['M16 30 Q20 24 24 30 Q28 24 32 30 Q36 24 40 30 Q44 24 48 30', P.orange, { stroke: 2.5, noline: true }], ['M44 6 L34 28 M52 8 L40 28', P.brown, { stroke: 3, noline: true }]],
    coffee: [[{ r: [12, 22, 32, 32, 7] }, P.white], ['M44 28 Q56 28 56 37 Q56 46 44 46', P.white, { stroke: 5 }], [{ e: [28, 23, 15, 4] }, P.brown], ['M22 6 Q18 12 22 16 M32 4 Q28 10 32 16', P.gray, { stroke: 2.5, noline: true }]],
    car: [['M8 38 L12 24 Q14 18 20 18 L44 18 Q50 18 52 24 L56 38Z', P.red], [{ r: [4, 34, 56, 14, 6] }, P.red], [{ r: [16, 22, 14, 10, 2] }, P.sky], [{ r: [34, 22, 14, 10, 2] }, P.sky], [{ c: [17, 48, 7] }, P.dark], [{ c: [47, 48, 7] }, P.dark], [{ c: [17, 48, 3] }, P.steel], [{ c: [47, 48, 3] }, P.steel]],
    moto: [[{ c: [14, 44, 10] }, P.dark], [{ c: [50, 44, 10] }, P.dark], [{ c: [14, 44, 4] }, P.steel], [{ c: [50, 44, 4] }, P.steel], ['M14 44 L28 30 L44 30 L50 44', P.orange, { stroke: 5 }], [{ r: [24, 24, 22, 10, 5] }, P.orange], ['M44 26 L46 14 L52 14', P.dark, { stroke: 4 }]],
    bus: [[{ r: [6, 8, 52, 42, 8] }, P.yellow], [{ r: [11, 14, 42, 16, 3] }, P.sky], [{ r: [6, 36, 52, 5, 0] }, P.orange], [{ c: [17, 52, 6] }, P.dark], [{ c: [47, 52, 6] }, P.dark], [{ c: [12, 44, 2.5] }, P.white], [{ c: [52, 44, 2.5] }, P.white]],
    walk: [[{ c: [34, 10, 7] }, P.skin], ['M34 18 L30 36 L22 56 M30 36 L40 56 M33 22 L22 30 M33 22 L44 32', P.blue, { stroke: 6 }]],
    door: [[{ r: [14, 4, 36, 56, 5] }, P.wood], [{ r: [19, 10, 26, 18, 3] }, dk(P.wood, .15)], [{ r: [19, 33, 26, 20, 3] }, dk(P.wood, .15)], [{ c: [42, 33, 3] }, P.gold]],
    hospital: [[{ r: [6, 10, 52, 46, 7] }, P.white], [{ r: [6, 10, 52, 10, 5] }, P.red], ['M28 26 L36 26 L36 32 L42 32 L42 40 L36 40 L36 46 L28 46 L28 40 L22 40 L22 32 L28 32Z', P.red]],
    pill: [['M14 40 L34 20 Q42 12 50 20 Q58 28 50 36 L30 56 Q22 64 14 56 Q6 48 14 40Z', P.white], ['M24 30 L34 20 Q42 12 50 20 Q58 28 50 36 L40 46Z', P.red]],
    gift: [[{ r: [8, 26, 48, 30, 5] }, P.pink], [{ r: [5, 18, 54, 12, 4] }, P.rose], [{ r: [28, 18, 8, 38, 0] }, P.gold], ['M32 18 Q20 4 14 12 Q12 18 32 18 Q52 18 50 12 Q44 4 32 18Z', P.gold]],
    star: [['M32 5 L39 23 L58 24 L43 36 L48 55 L32 44 L16 55 L21 36 L6 24 L25 23Z', P.gold]],
    sparkle: [['M32 4 Q35 26 58 32 Q35 38 32 60 Q29 38 6 32 Q29 26 32 4Z', P.gold], ['M50 6 Q51 13 58 14 Q51 15 50 22 Q49 15 42 14 Q49 13 50 6Z', P.yellow]],
    energy: [['M36 4 L12 36 L28 36 L24 60 L52 24 L35 24Z', P.yellow]],
    hunger: [['M6 30 L58 30 Q56 52 32 54 Q8 52 6 30Z', P.sky], [{ e: [32, 30, 26, 7] }, P.white], [{ e: [32, 26, 20, 7] }, P.white]],
    hygiene: [[{ c: [24, 36, 16] }, lt(P.sky, .35)], [{ c: [44, 22, 11] }, lt(P.sky, .45)], [{ c: [46, 46, 8] }, lt(P.sky, .5)], [{ c: [20, 30, 4] }, P.white, { flat: true, noline: true }]],
    happy: [[{ c: [32, 32, 26] }, P.yellow], [{ e: [23, 27, 3.5, 5] }, P.dark], [{ e: [41, 27, 3.5, 5] }, P.dark], ['M19 37 Q32 52 45 37', P.dark, { stroke: 4, noline: true }], [{ e: [16, 38, 4, 2.5] }, P.rose, { flat: true, noline: true }], [{ e: [48, 38, 4, 2.5] }, P.rose, { flat: true, noline: true }]],
    sad: [[{ c: [32, 32, 26] }, P.yellow], [{ e: [23, 27, 3.5, 5] }, P.dark], [{ e: [41, 27, 3.5, 5] }, P.dark], ['M21 45 Q32 36 43 45', P.dark, { stroke: 4, noline: true }]],
    meh: [[{ c: [32, 32, 26] }, P.yellow], [{ e: [23, 27, 3.5, 5] }, P.dark], [{ e: [41, 27, 3.5, 5] }, P.dark], ['M22 42 L42 42', P.dark, { stroke: 4, noline: true }]],
    tired: [[{ c: [32, 32, 26] }, P.yellow], ['M18 28 Q23 32 28 28 M36 28 Q41 32 46 28', P.dark, { stroke: 3.5, noline: true }], [{ e: [32, 42, 6, 5] }, P.dark], ['M46 6 L56 6 L46 16 L56 16', P.navy, { stroke: 3, noline: true }]],
    social: [['M8 14 Q8 8 14 8 L50 8 Q56 8 56 14 L56 38 Q56 44 50 44 L26 44 L14 54 L16 44 L14 44 Q8 44 8 38Z', P.mint], [{ c: [22, 26, 3.5] }, P.white, { flat: true }], [{ c: [32, 26, 3.5] }, P.white, { flat: true }], [{ c: [42, 26, 3.5] }, P.white, { flat: true }]],
    stress: [['M14 36 Q6 36 6 28 Q6 20 16 20 Q18 10 30 10 Q42 10 44 20 Q58 20 58 28 Q58 36 48 36Z', P.gray], ['M30 34 L24 46 L32 46 L28 58', P.yellow, { stroke: 4 }]],
    clock: [[{ c: [32, 32, 26] }, P.white], [{ c: [32, 32, 22] }, P.cream], ['M32 16 L32 32 L44 38', P.dark, { stroke: 4, noline: true }], [{ c: [32, 32, 3] }, P.red]],
    hourglass: [['M16 6 L48 6 M16 58 L48 58', P.brown, { stroke: 5 }], ['M20 8 L44 8 Q44 22 34 32 Q44 42 44 56 L20 56 Q20 42 30 32 Q20 22 20 8Z', lt(P.sky, .4)], ['M24 50 Q32 40 40 50 L40 54 L24 54Z', P.gold], ['M26 16 L38 16 Q36 24 32 27 Q28 24 26 16Z', P.gold]],
    check: [[{ c: [32, 32, 26] }, P.green], ['M19 33 L28 42 L46 22', P.white, { stroke: 6, noline: true }]],
    warn: [['M32 6 L60 54 L4 54Z', P.gold], ['M32 22 L32 38', P.dark, { stroke: 5, noline: true }], [{ c: [32, 46, 3] }, P.dark]],
    info: [[{ c: [32, 32, 26] }, P.sky], [{ r: [28, 28, 8, 20, 3] }, P.white, { flat: true }], [{ c: [32, 19, 4.5] }, P.white, { flat: true }]],
    coin: [[{ c: [32, 32, 25] }, P.gold], [{ c: [32, 32, 18] }, lt(P.gold, .25)], ['M37 22 Q30 20 28 25 Q27 30 32 31 Q38 32 37 37 Q35 42 27 40 M32 18 L32 44', dk(P.gold, .45), { stroke: 3.4, noline: true }]],
    building: [[{ r: [10, 6, 30, 52, 4] }, P.sky], [{ r: [36, 22, 20, 36, 4] }, P.navy], [{ r: [16, 12, 7, 6, 1] }, P.white], [{ r: [27, 12, 7, 6, 1] }, P.white], [{ r: [16, 23, 7, 6, 1] }, P.white], [{ r: [27, 23, 7, 6, 1] }, P.white], [{ r: [16, 34, 7, 6, 1] }, P.white], [{ r: [27, 34, 7, 6, 1] }, P.white], [{ r: [20, 46, 10, 12, 1] }, P.wood], [{ r: [41, 28, 10, 5, 1] }, P.gold], [{ r: [41, 38, 10, 5, 1] }, P.gold]],
    shop: [[{ r: [8, 24, 48, 32, 4] }, P.cream], ['M4 24 L10 8 L54 8 L60 24Z', P.red], ['M4 24 Q10 32 16 24 Q22 32 28 24 Q34 32 40 24 Q46 32 52 24 Q58 32 60 24', P.white, { stroke: 0 }], [{ r: [14, 34, 14, 22, 2] }, P.wood], [{ r: [34, 32, 16, 12, 2] }, P.sky]],
    tree: [[{ r: [28, 38, 8, 20, 2] }, P.brown], [{ c: [32, 26, 18] }, P.green], [{ c: [20, 32, 11] }, P.green], [{ c: [44, 32, 11] }, P.green]],
    wave: [['M4 36 Q14 26 24 36 Q34 46 44 36 Q54 26 60 32 L60 58 L4 58Z', P.sky], ['M4 46 Q14 38 24 46 Q34 54 44 46 Q54 38 60 44 L60 58 L4 58Z', P.blue], [{ c: [46, 16, 9] }, P.yellow]],
    save: [[{ r: [8, 8, 48, 48, 7] }, P.navy], [{ r: [16, 8, 30, 16, 2] }, P.steel], [{ r: [16, 34, 32, 22, 3] }, P.white], [{ r: [36, 11, 6, 10, 1] }, P.navy]],
    folder: [['M6 16 Q6 10 12 10 L24 10 L30 16 L52 16 Q58 16 58 22 L58 50 Q58 56 52 56 L12 56 Q6 56 6 50Z', P.gold]],
    calendar: [[{ r: [8, 12, 48, 44, 7] }, P.white], [{ r: [8, 12, 48, 14, 6] }, P.red], [{ r: [18, 6, 5, 12, 2] }, P.dark], [{ r: [41, 6, 5, 12, 2] }, P.dark], [{ r: [16, 32, 8, 7, 1] }, P.gray], [{ r: [28, 32, 8, 7, 1] }, P.gray], [{ r: [40, 32, 8, 7, 1] }, P.red], [{ r: [16, 43, 8, 7, 1] }, P.gray], [{ r: [28, 43, 8, 7, 1] }, P.gray]],
    box: [['M8 22 L32 12 L56 22 L56 48 L32 58 L8 48Z', P.wood], ['M8 22 L32 32 L56 22 L32 12Z', lt(P.wood, .25)], ['M32 32 L32 58', dk(P.wood, .3), { stroke: 2.5, noline: true }], ['M20 17 L44 27 L44 34', P.cream, { stroke: 4, noline: true }]],
    sun: [[{ c: [32, 32, 14] }, P.yellow], ['M32 4 L32 12 M32 52 L32 60 M4 32 L12 32 M52 32 L60 32 M12 12 L18 18 M46 46 L52 52 M12 52 L18 46 M46 18 L52 12', P.orange, { stroke: 4.5, noline: true }]],
    moon: [['M40 6 Q20 10 18 32 Q20 54 44 58 Q28 50 28 32 Q28 14 40 6Z', P.yellow]],
    book: [['M6 12 Q20 8 32 14 L32 56 Q20 50 6 54Z', P.sky], ['M58 12 Q44 8 32 14 L32 56 Q44 50 58 54Z', P.blue], ['M12 22 Q20 20 26 23 M12 30 Q20 28 26 31 M38 23 Q44 20 52 22', P.white, { stroke: 2.5, noline: true }]],
    wrench: [['M14 50 L36 28', P.gray, { stroke: 9 }], ['M36 28 Q32 16 42 10 Q48 8 52 10 L44 18 L46 22 L50 24 L58 16 Q60 22 56 28 Q50 36 38 32Z', P.gray]],
    people: [[{ c: [32, 20, 10] }, P.skin], ['M14 56 Q14 34 32 34 Q50 34 50 56Z', P.green], ['M22 18 Q22 8 32 8 Q42 8 42 18 Q36 12 22 18Z', P.dark]],
    chef: [[{ c: [32, 34, 10] }, P.skin], ['M18 58 Q18 44 32 44 Q46 44 46 58Z', P.white], ['M20 26 Q12 22 16 14 Q20 8 26 12 Q30 4 38 10 Q46 8 48 16 Q52 24 44 26Z', P.white], [{ r: [21, 22, 22, 6, 2] }, P.white]],
    bell: [['M14 44 Q16 20 32 18 Q48 20 50 44Z', P.gold], [{ r: [8, 44, 48, 6, 3] }, P.gold], [{ c: [32, 14, 4] }, P.gold]],
    ticket: [['M6 18 L58 18 L58 28 Q52 28 52 32 Q52 36 58 36 L58 46 L6 46 L6 36 Q12 36 12 32 Q12 28 6 28Z', P.coral], ['M22 24 L22 40', P.white, { stroke: 2, noline: true }]],
    bank: [['M6 24 L32 8 L58 24Z', P.gold], [{ r: [8, 24, 48, 5, 1] }, P.beige], [{ r: [12, 30, 6, 18, 1] }, P.white], [{ r: [24, 30, 6, 18, 1] }, P.white], [{ r: [36, 30, 6, 18, 1] }, P.white], [{ r: [47, 30, 6, 18, 1] }, P.white], [{ r: [6, 48, 52, 8, 2] }, P.beige]],
    exercise: [[{ r: [4, 22, 8, 20, 3] }, P.dark], [{ r: [52, 22, 8, 20, 3] }, P.dark], [{ r: [12, 26, 6, 12, 2] }, P.gray], [{ r: [46, 26, 6, 12, 2] }, P.gray], [{ r: [18, 30, 28, 4, 2] }, P.steel]],
    broom: [['M44 6 L30 36', P.brown, { stroke: 5 }], ['M22 34 L40 40 L34 58 Q20 58 12 50Z', P.gold]],
    soap: [[{ r: [10, 24, 44, 26, 10] }, P.rose], [{ c: [44, 18, 7] }, lt(P.sky, .5)], [{ c: [52, 30, 4] }, lt(P.sky, .5)]],
    dog: [[{ e: [32, 38, 18, 16] }, P.wood], [{ e: [14, 30, 7, 13] }, P.brown], [{ e: [50, 30, 7, 13] }, P.brown], [{ c: [25, 34, 3] }, P.dark], [{ c: [39, 34, 3] }, P.dark], [{ e: [32, 43, 5, 3.5] }, P.dark], ['M28 48 Q32 52 36 48', P.dark, { stroke: 2.5, noline: true }]],
    hotel: [[{ r: [8, 10, 48, 46, 5] }, P.purple], [{ r: [14, 16, 9, 8, 1] }, P.yellow], [{ r: [27, 16, 9, 8, 1] }, P.yellow], [{ r: [40, 16, 9, 8, 1] }, P.yellow], [{ r: [14, 30, 9, 8, 1] }, P.yellow], [{ r: [40, 30, 9, 8, 1] }, P.yellow], [{ r: [26, 40, 12, 16, 2] }, P.wood]],
    road: [['M22 6 L42 6 L58 58 L6 58Z', P.dark], ['M32 10 L32 18 M32 26 L32 36 M32 44 L32 56', P.yellow, { stroke: 3.5, noline: true }]],
    sell: [[{ r: [6, 14, 52, 36, 6] }, P.green], [{ c: [32, 32, 10] }, lt(P.green, .5)], [{ c: [14, 22, 3] }, lt(P.green, .5)], [{ c: [50, 42, 3] }, lt(P.green, .5)]],
    news: [[{ r: [6, 10, 52, 44, 6] }, P.white], [{ r: [12, 16, 20, 14, 2] }, P.sky], ['M36 18 L52 18 M36 26 L52 26 M12 36 L52 36 M12 44 L44 44', P.gray, { stroke: 3, noline: true }]],
    key: [[{ c: [20, 24, 13] }, P.gold], [{ c: [20, 24, 5] }, P.cream], ['M30 32 L54 56 M44 46 L50 40 M50 52 L56 46', P.gold, { stroke: 6 }]],
    grad: [['M4 24 L32 12 L60 24 L32 36Z', P.dark], ['M16 30 L16 44 Q32 54 48 44 L48 30 L32 37Z', P.navy], ['M56 26 L56 42', P.gold, { stroke: 3 }]],
    leaf: [['M10 54 Q8 18 54 10 Q52 52 10 54Z', P.green], ['M12 52 Q28 36 44 20', lt(P.green, .5), { stroke: 3, noline: true }]],
    dice: [[{ r: [8, 8, 48, 48, 10] }, P.white], [{ c: [20, 20, 4.5] }, P.red, { flat: true }], [{ c: [32, 32, 4.5] }, P.red, { flat: true }], [{ c: [44, 44, 4.5] }, P.red, { flat: true }]],
    palette: [['M32 6 Q58 6 58 30 Q58 44 46 42 Q38 41 40 50 Q42 58 32 58 Q6 58 6 32 Q6 6 32 6Z', P.beige], [{ c: [20, 24, 5] }, P.red], [{ c: [32, 16, 5] }, P.gold], [{ c: [45, 22, 5] }, P.green], [{ c: [18, 40, 5] }, P.blue]],
    piggy: [[{ e: [32, 36, 22, 17] }, P.rose], [{ e: [52, 36, 6, 7] }, P.pink], [{ r: [16, 48, 7, 10, 2] }, P.pink], [{ r: [38, 48, 7, 10, 2] }, P.pink], ['M22 20 L26 12 L30 20Z', P.pink], [{ r: [26, 18, 12, 3, 1.5] }, P.dark], [{ c: [42, 30, 2.5] }, P.dark]],
    rocket: [['M32 4 Q46 16 44 40 L20 40 Q18 16 32 4Z', P.white], [{ c: [32, 22, 5.5] }, P.sky], ['M20 32 L10 46 L20 44Z M44 32 L54 46 L44 44Z', P.red], ['M24 42 L32 60 L40 42Z', P.orange]],
    search: [[{ c: [26, 26, 17] }, lt(P.sky, .5)], [{ c: [26, 26, 17] }, 'none', { stroke: 6, color: P.dark }], ['M38 38 L56 56', P.dark, { stroke: 8 }]],
    lock: [['M20 28 L20 20 Q20 8 32 8 Q44 8 44 20', P.gray, { stroke: 5 }], [{ r: [12, 28, 40, 28, 7] }, P.gold], [{ c: [32, 40, 4] }, P.dark]],
    up: [['M32 8 L54 32 L40 32 L40 56 L24 56 L24 32 L10 32Z', P.green]],
    down: [['M32 56 L54 32 L40 32 L40 8 L24 8 L24 32 L10 32Z', P.red]],
    bowl: [['M6 30 L58 30 Q56 52 32 54 Q8 52 6 30Z', P.white], [{ e: [32, 30, 26, 6] }, P.green], [{ c: [24, 28, 5] }, P.red], [{ c: [38, 27, 5] }, P.orange], [{ c: [32, 26, 4] }, P.yellow]],
    drink: [['M18 14 L46 14 L42 56 L22 56Z', lt(P.sky, .4)], ['M20 26 L44 26 L41 54 L23 54Z', P.orange], ['M36 4 L32 30', P.red, { stroke: 3.5 }]],
    cake: [[{ r: [10, 30, 44, 24, 5] }, P.rose], [{ r: [10, 30, 44, 7, 4] }, P.white], [{ r: [29, 16, 6, 14, 2] }, P.sky], ['M32 6 Q36 12 32 15 Q28 12 32 6Z', P.orange]],
    fruit: [[{ c: [32, 36, 20] }, P.red], ['M32 18 Q32 10 36 6', P.brown, { stroke: 3, noline: true }], ['M34 14 Q44 6 50 14 Q42 20 34 14Z', P.green]],
    shirt: [['M20 8 L26 8 Q32 14 38 8 L44 8 L58 20 L50 28 L46 24 L46 56 L18 56 L18 24 L14 28 L6 20Z', P.sky]],
    shoe: [['M6 26 L26 26 Q30 34 44 36 Q58 38 58 46 L58 50 L6 50Z', P.white], [{ r: [6, 46, 52, 6, 2] }, P.coral], ['M30 32 L36 30 M34 36 L40 34', P.sky, { stroke: 2.5, noline: true }]],
    handbag: [['M22 22 Q22 8 32 8 Q42 8 42 22', P.brown, { stroke: 4 }], ['M10 22 L54 22 L50 56 L14 56Z', P.coral], [{ r: [28, 30, 8, 6, 2] }, P.gold]],
    watch: [[{ r: [24, 2, 16, 60, 5] }, P.brown], [{ c: [32, 32, 14] }, P.gold], [{ c: [32, 32, 10] }, P.white], ['M32 25 L32 32 L37 35', P.dark, { stroke: 2.5, noline: true }]],
    headphones: [['M12 36 Q12 10 32 10 Q52 10 52 36', P.dark, { stroke: 5 }], [{ r: [6, 32, 14, 20, 5] }, P.pink], [{ r: [44, 32, 14, 20, 5] }, P.pink]],
    ambulance: [[{ r: [4, 18, 40, 28, 4] }, P.white], ['M44 26 L54 26 L60 36 L60 46 L44 46Z', P.white], [{ r: [48, 29, 7, 7, 1] }, P.sky], ['M20 24 L28 24 L28 28 L32 28 L32 36 L28 36 L28 40 L20 40 L20 36 L16 36 L16 28 L20 28Z', P.red], [{ c: [16, 48, 6] }, P.dark], [{ c: [48, 48, 6] }, P.dark]],
    brain: [['M32 10 Q20 6 14 14 Q6 18 8 28 Q4 36 10 42 Q12 52 24 52 Q30 56 32 52 Q34 56 40 52 Q52 52 54 42 Q60 36 56 28 Q58 18 50 14 Q44 6 32 10Z', P.rose], ['M32 12 L32 52 M18 24 Q24 26 24 32 M46 24 Q40 26 40 32 M18 40 Q24 38 28 42 M46 40 Q40 38 36 42', P.pink, { stroke: 2.5, noline: true }]],
    spa: [[{ c: [32, 18, 9] }, P.skin], ['M10 50 Q32 30 54 50Z', P.mint], ['M18 46 Q32 34 46 46', P.teal, { stroke: 3, noline: true }]],
    wave_hand: [['M18 30 L18 16 Q18 12 22 12 Q26 12 26 16 L26 28 L26 10 Q26 6 30 6 Q34 6 34 10 L34 28 L34 12 Q34 8 38 8 Q42 8 42 12 L42 32 L44 26 Q46 22 50 24 Q52 26 50 30 L44 46 Q40 58 28 58 Q18 58 18 46Z', P.skin]],
    thumbs: [['M10 30 L20 30 L20 56 L10 56Z', P.blue], ['M22 30 L32 12 Q36 8 38 14 L36 26 L50 26 Q56 26 54 32 L50 52 Q48 56 44 56 L22 56Z', P.skin]],
    sleep: [['M10 24 L24 24 L10 40 L24 40', P.navy, { stroke: 4, noline: true }], ['M30 14 L40 14 L30 26 L40 26', P.navy, { stroke: 3.5, noline: true }], ['M44 6 L52 6 L44 14 L52 14', P.navy, { stroke: 3, noline: true }], [{ e: [34, 52, 22, 6] }, P.sky]],
    mail: [[{ r: [6, 14, 52, 36, 6] }, P.white], ['M8 18 L32 36 L56 18', P.coral, { stroke: 4, noline: true }]],
    trash: [[{ r: [14, 18, 36, 40, 5] }, P.gray], [{ r: [8, 10, 48, 8, 3] }, P.steel], [{ r: [26, 4, 12, 7, 2] }, P.steel], ['M24 26 L24 50 M32 26 L32 50 M40 26 L40 50', P.steel, { stroke: 3, noline: true }]],
    store: [['M8 22 L32 8 L56 22 L56 52 L8 52Z', P.beige], [{ r: [16, 30, 12, 22, 2] }, P.wood], [{ r: [34, 30, 16, 12, 2] }, P.sky], ['M8 22 L32 8 L56 22', P.brown, { stroke: 4 }]],
    rotate: [['M50 32 Q50 14 32 14 Q16 14 14 28', P.cream, { stroke: 6 }], ['M6 24 L14 36 L24 26Z', P.cream], ['M14 32 Q14 50 32 50 Q48 50 50 36', P.cream, { stroke: 6 }], ['M58 40 L50 28 L40 38Z', P.cream]],
    hide: [[{ r: [6, 14, 52, 36, 8] }, P.cream], ['M14 50 L50 14', P.red, { stroke: 5 }]],
    police: [['M32 6 L54 14 Q54 40 32 58 Q10 40 10 14Z', P.navy], ['M32 18 L35 27 L44 27 L37 33 L40 42 L32 36 L24 42 L27 33 L20 27 L29 27Z', P.gold]],
    plane: [['M30 6 Q34 6 34 12 L34 26 L56 38 L56 44 L34 36 L34 50 L42 56 L42 60 L32 57 L22 60 L22 56 L30 50 L30 36 L8 44 L8 38 L30 26 L30 12 Q30 6 30 6Z', P.sky]],
    film: [[{ r: [6, 16, 52, 36, 6] }, P.dark], [{ r: [12, 22, 18, 24, 3] }, P.purple], [{ r: [34, 22, 18, 24, 3] }, P.pink], [{ c: [14, 12, 6] }, P.gray], [{ c: [32, 10, 7] }, P.gray]],
    firetruck: [[{ r: [4, 22, 40, 24, 4] }, P.red], ['M44 30 L54 30 L60 38 L60 46 L44 46Z', P.red], [{ r: [8, 14, 30, 6, 2] }, P.steel], [{ c: [16, 48, 6] }, P.dark], [{ c: [48, 48, 6] }, P.dark], [{ r: [47, 32, 7, 6, 1] }, P.sky]],
    anchor: [[{ c: [32, 12, 6] }, 'none', { stroke: 4, color: P.navy }], ['M32 18 L32 56 M20 28 L44 28 M10 40 Q12 56 32 56 Q52 56 54 40', P.navy, { stroke: 5 }]],
    hand: [['M22 30 L22 12 Q22 8 26 8 Q30 8 30 12 L30 28 M30 28 L30 8 Q30 4 34 4 Q38 4 38 8 L38 28 M38 28 L38 12 Q38 8 42 8 Q46 8 46 12 L46 36 Q46 58 30 58 Q16 58 14 44 L10 32 Q8 26 14 26 Q18 26 22 34Z', P.skin]]
  };
  // ไอคอนสำรองเมื่อไม่มีในชุด
  const ALIAS = { decorate: 'sofa', jobs: 'briefcase', finance: 'moneybag', invest: 'chart', goals: 'target', relationships: 'love', location: 'pin', dress: 'hanger', settings: 'gear', pet: 'paw' };
  // อีโมจิเดิม → ไอคอน
  const EMOJI = {
    '🚪': 'door', '🛵': 'moto', '🏍️': 'moto', '🏍': 'moto', '📺': 'tv', '🚗': 'car', '🚘': 'car', '🚙': 'car', '🛍️': 'handbag', '💊': 'pill', '🏥': 'hospital', '☕': 'coffee', '🧾': 'quest', '🛋️': 'sofa', '🪑': 'chair', '🍳': 'pan',
    '🛒': 'cart', '🎉': 'sparkle', '🏠': 'home', '🏡': 'home', '💻': 'laptop', '🧑‍💻': 'laptop', '🍽️': 'food', '🚿': 'shower', '💬': 'social', '💼': 'briefcase', '💞': 'love', '🚶': 'walk', '🧑‍🍳': 'chef', '🔧': 'wrench', '🛠️': 'wrench',
    '🌳': 'tree', '🌿': 'leaf', '🍃': 'leaf', '🥫': 'food', '🍝': 'noodle', '🍜': 'noodle', '🍲': 'food', '🍚': 'hunger', '🍱': 'food', '🥗': 'bowl', '🍗': 'food', '🛏️': 'bed', '💡': 'bulb', '📦': 'box', '🏨': 'hotel', '🏬': 'building', '🏢': 'building', '🏪': 'store',
    '🚏': 'bus', '🚌': 'bus', '🚽': 'toilet', '🪥': 'brush', '📱': 'phone', '📞': 'phone', '😴': 'sleep', '🥱': 'tired', '📖': 'book', '📚': 'book', '💧': 'drink', '🧺': 'box', '📝': 'quest', '📋': 'quest', '🏃': 'walk', '🩺': 'hospital', '✓': 'check', '✅': 'check', '🍎': 'fruit', '🍊': 'fruit',
    '👔': 'shirt', '👕': 'shirt', '🧥': 'shirt', '👟': 'shoe', '👜': 'handbag', '🧳': 'bag', '🎒': 'bag', '🧊': 'fridge', '⏳': 'hourglass', '🗃️': 'box', '📊': 'chart', '📈': 'chart', '🧹': 'broom', '⏸': 'pause', '💰': 'moneybag', '💵': 'sell', '↩️': 'back', '🧽': 'soap', '🧼': 'soap', '🫧': 'hygiene', '🧴': 'soap',
    '🥬': 'leaf', '🐩': 'dog', '🦴': 'dog', '🛎️': 'bell', '🧃': 'drink', '🥛': 'drink', '🧋': 'drink', '🍵': 'coffee', '🛣️': 'road', '🏖️': 'wave', '🌊': 'wave', '🌇': 'building', '🪴': 'plant', '✨': 'sparkle', '🎮': 'tv', '⏻': 'bulb', '🏋️': 'exercise', '💪': 'exercise', '🧘': 'spa', '💆': 'spa',
    '⚡': 'energy', '❤️': 'health', '😊': 'happy', '😄': 'happy', '🙂': 'happy', '😐': 'meh', '😔': 'sad', '😣': 'sad', '😖': 'sad', '🤒': 'pill', '🌩️': 'stress', '🗺️': 'map', '🎯': 'target', '⚙️': 'gear', '🚑': 'ambulance', '🧠': 'brain', '🧍': 'people', '📰': 'news', '👋': 'wave_hand', '👍': 'thumbs',
    '💾': 'save', '📂': 'folder', '📅': 'calendar', '🎁': 'gift', '🗣️': 'social', '🔍': 'search', '🎲': 'dice', '🎨': 'palette', '🐷': 'piggy', '🚀': 'rocket', '🥪': 'food', '🍪': 'cake', '🍰': 'cake', '🩹': 'pill', '🎧': 'headphones', '⛑️': 'hospital', '🦐': 'food', '🥐': 'cake', '🛟': 'info', '🕊️': 'leaf',
    '🔓': 'lock', '👮': 'police', '✈️': 'plane', '🛫': 'plane', '🎬': 'film', '🚒': 'firetruck', '⚓': 'anchor', '🧳': 'bag', '🎓': 'grad', '•': 'sparkle', '🏦': 'bank', '🐶': 'dog', '🐕': 'dog', '⭐': 'star', '🌙': 'moon', '☀️': 'sun', '🌧️': 'stress', '📷': 'camera', '🐾': 'paw', '⚠️': 'warn', 'ℹ️': 'info', '🔑': 'key', '💳': 'sell', '🪙': 'coin', '🧭': 'pin', '📍': 'pin', '🧾️': 'quest'
  };
  const strip = s => s.replace(/️/g, '');
  const EMOJI2 = {}; for (const k in EMOJI) EMOJI2[strip(k)] = EMOJI[k];
  function fromEmoji(e) { if (!e) return null; if (DEF[e]) return e; return EMOJI[e] || EMOJI2[strip(e)] || null; }
  const cache = {};
  function svg(key, size) {
    key = ALIAS[key] || key;
    const def = DEF[key] || DEF.sparkle;
    const ck = key + ':' + (size || 0); if (cache[ck]) return cache[ck];
    const id = 'i' + (++uid);
    let defs = '', body = '';
    def.forEach(([s, col, o], i) => {
      o = o || {};
      if (o.stroke != null && o.stroke > 0) {
        const c = o.color || col;
        if (!o.noline) body += `${shape(s)} fill="none" stroke="${dk(c, .45)}" stroke-width="${o.stroke + 2.6}" stroke-linecap="round" stroke-linejoin="round"/>`;
        body += `${shape(s)} fill="none" stroke="${c}" stroke-width="${o.stroke}" stroke-linecap="round" stroke-linejoin="round"/>`;
        return;
      }
      if (col === 'none') return;
      const flat = o.flat || col.startsWith('rgba');
      let fill = col;
      if (!flat) { const g = id + 'g' + i; defs += `<linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lt(col, .38)}"/><stop offset=".55" stop-color="${col}"/><stop offset="1" stop-color="${dk(col, .18)}"/></linearGradient>`; fill = `url(#${g})`; }
      body += `${shape(s)} fill="${fill}"${o.noline || flat ? '' : ` stroke="${dk(col, .42)}" stroke-width="2.2" stroke-linejoin="round"`}/>`;
    });
    // ไฮไลต์มันวาวด้านบนซ้าย + เงาตกกระทบ ให้ดูนูนแบบ 3D
    const out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 68 70"${size ? ` width="${size}" height="${size}"` : ''} aria-hidden="true"><defs>${defs}<radialGradient id="${id}h" cx=".3" cy=".22" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><ellipse cx="32" cy="63" rx="21" ry="3.6" fill="rgba(60,40,20,.18)"/>${body}<ellipse cx="24" cy="20" rx="16" ry="11" fill="url(#${id}h)"/></svg>`;
    cache[ck] = out; return out;
  }
  function el(key, cls) {
    const k = fromEmoji(key) || key;
    const s = document.createElement('span'); s.className = 'ico' + (cls ? ' ' + cls : ''); s.setAttribute('aria-hidden', 'true');
    s.innerHTML = svg(DEF[k] || ALIAS[k] ? k : 'sparkle'); return s;
  }
  const imgs = {};
  function img(key) {
    const k = fromEmoji(key) || (DEF[key] ? key : 'sparkle');
    if (!imgs[k]) { const i = new Image(); i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg(k, 96)); imgs[k] = i; }
    return imgs[k];
  }
  // แยกอีโมจิออกจากข้อความ → [ข้อความ, ไอคอน, ข้อความ ...]
  const RX = /(?:[☀-➿⬀-⯿⏠-⏿]|[\uD83C-\uD83E][\uDC00-\uDFFF])(?:️|‍(?:[☀-➿]|[\uD83C-\uD83E][\uDC00-\uDFFF])|[\uD83C][\uDFFB-\uDFFF])*/g;
  function splitText(t) {
    if (typeof t !== 'string' || !RX.test(t)) { RX.lastIndex = 0; return null; }
    RX.lastIndex = 0; const out = []; let last = 0, m;
    while ((m = RX.exec(t))) { if (m.index > last) out.push(t.slice(last, m.index)); const k = fromEmoji(m[0]); if (k) out.push(el(k, 'inl')); else if (/^[\u2190-\u27BF]/.test(m[0]) && m[0].length === 1) out.push(m[0]); else out.push(el('sparkle', 'inl')); last = m.index + m[0].length; }
    if (last < t.length) out.push(t.slice(last));
    return out;
  }
  const stripEmoji = t => typeof t === 'string' ? t.replace(RX, '').replace(/\s{2,}/g, ' ').trim() : t;
  return { svg, el, img, fromEmoji, splitText, stripEmoji, keys: Object.keys(DEF), DEF };
})();
