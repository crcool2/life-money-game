/* เกมส์ชีวิตและการเงิน — ข้อมูลเกมทั้งหมด (แก้ไข/เพิ่มได้ที่ไฟล์นี้ไฟล์เดียว)
   พิกัดฉากทุกฉากใช้หน่วย 1100 x 619 (ภาพพื้นหลังถูกย่อให้พอดีหน่วยนี้) */
'use strict';
window.DATA = (function () {

  // ---------- บุคลิก ----------
  const TRAITS = {
    diligent:  { name: 'ขยัน',          icon: '💪', desc: 'ทำงานได้ผลดีขึ้น รายได้จากงาน +10%' },
    social:    { name: 'เข้าสังคมเก่ง',  icon: '🗣️', desc: 'คุยแล้วความสัมพันธ์และค่าสังคมขึ้นเร็ว' },
    careful:   { name: 'รอบคอบ',        icon: '🔍', desc: 'เหตุการณ์ร้ายเกิดน้อยลง ค่าซ่อมถูกลง' },
    risky:     { name: 'กล้าเสี่ยง',      icon: '🎲', desc: 'ค่าธรรมเนียมหุ้นถูกลง ธุรกิจโตเร็วขึ้น' },
    creative:  { name: 'สร้างสรรค์',     icon: '🎨', desc: 'งานฟรีแลนซ์ได้เงินมากขึ้น 15%' },
    calm:      { name: 'ใจเย็น',         icon: '🍃', desc: 'ความเครียดเพิ่มช้าลง 25%' },
    frugal:    { name: 'ประหยัด',        icon: '🐷', desc: 'ซื้อของถูกลง 5%' },
    ambitious: { name: 'ทะเยอทะยาน',     icon: '🚀', desc: 'ทักษะเพิ่มเร็วขึ้น 20% เลื่อนตำแหน่งไวขึ้น' }
  };

  const OUTFITS = {};

  // ---------- เฟอร์นิเจอร์ (sprite = ชิ้นจากภาพเฟอร์นิเจอร์ที่แนบ) ----------
  // w = ความกว้างเมื่อวางในบ้าน (หน่วยฉาก), fw/fd = ฐานกว้าง/ลึกที่กันทางเดิน
  // ---------- เฟอร์นิเจอร์ในบ้าน (ภาพแยกชิ้นโปร่งใส assets/furniture/*.webp) ----------
  // s = สเกลในฉากบ้าน · seat = จุดนั่งในพิกัดภาพ · use = จุดยืนใช้งานห่างจากฐาน (หน่วยฉาก) · bed = แนวที่นอนในพิกัดภาพ
  // passable = เดินทับได้ (พรม) · wall = ต้องชิดผนัง (ไม่บังคับ แค่คำแนะนำ)
  // ชุดเฟอร์นิเจอร์ Modern Minimalist (ภาพแยกชิ้นโปร่งใสจากภาพชุดเฟอร์นิเจอร์ล่าสุด: assets/furniture/m_*.webp)
  // wall = ของติดผนัง (กรอบรูป ชั้นลอย) วางบนผนังด้านหลัง ไม่กันทางเดิน · floor = ของบนพื้นที่เดินทับได้ (พรม)
  const FURN_TYPES = {
    bed:      { name: 'เตียงคู่', sprite: 'm_bed', s: .72, action: 'sleep', cat: 'ห้องนอน',
                bed: { head: [240, 108], foot: [100, 186], wdir: [80, 40], blanket: [[111, 96], [275, 178], [200, 250], [165, 272], [12, 205], [20, 150]] } },
    night:    { name: 'โต๊ะข้างเตียงพร้อมโคมไฟ', sprite: 'm_night', s: .5, action: 'lamp', cat: 'ห้องนอน' },
    wardrobe: { name: 'ตู้เสื้อผ้า 2 บาน', sprite: 'm_wardrobe', s: .66, action: 'wardrobe', cat: 'ห้องนอน' },
    sideboard:{ name: 'ตู้ลิ้นชักเตี้ย', sprite: 'm_dresser', s: .6, action: null, cat: 'ห้องนอน' },
    sofa:     { name: 'โซฟา 3 ที่นั่ง', sprite: 'm_sofa', s: 0.7, action: 'sofa', cat: 'ห้องนั่งเล่น', seat: [200, 122] },
    armchair: { name: 'โซฟาเดี่ยว', sprite: 'm_armchair', s: .62, action: 'seat', cat: 'ห้องนั่งเล่น', seat: [95, 102] },
    coffee:   { name: 'โต๊ะกลางทรงกลม', sprite: 'm_coffee', s: 0.78, action: null, cat: 'ห้องนั่งเล่น' },
    rug:      { name: 'พรมผืนใหญ่', sprite: 'm_rug', s: 1.5, action: null, cat: 'ห้องนั่งเล่น', passable: true, floor: true },
    rug2:     { name: 'พรมทางเดิน', sprite: 'm_rug2', s: 1, action: null, cat: 'ของตกแต่ง', passable: true, floor: true },
    tv:       { name: 'ชั้นวางทีวีและโทรทัศน์', sprite: 'm_tv', s: 0.7, action: 'tv', cat: 'ห้องนั่งเล่น' },
    shelf:    { name: 'ชั้นหนังสือไม้', sprite: 'm_bookshelf', s: .6, action: null, cat: 'ห้องนั่งเล่น' },
    shelfplant:{ name: 'ชั้นวางของพร้อมต้นไม้', sprite: 'm_shelfplant', s: .6, action: null, cat: 'ห้องนั่งเล่น' },
    desk:     { name: 'โต๊ะทำงานพร้อมโน้ตบุ๊กและโคมไฟ', sprite: 'm_desk', s: .95, action: 'desk', cat: 'มุมทำงาน' },
    desk2:    { name: 'โต๊ะทำงานมีลิ้นชัก', sprite: 'm_desk2', s: .95, action: 'desk', cat: 'มุมทำงาน' },
    chair:    { name: 'เก้าอี้ทำงาน', sprite: 'm_ochair', s: .62, action: 'seat', cat: 'มุมทำงาน', seat: [86, 118] },
    stove:    { name: 'เคาน์เตอร์ครัวตัว L พร้อมเตาและเตาอบ', sprite: 'm_counter', s: 1.2, action: 'cook', cat: 'ห้องครัว',
                feetPx: [[[45, 170], [140, 130], [100, 110], [5, 150]], [[100, 110], [140, 130], [165, 118], [125, 98]], [[140, 130], [262, 172], [287, 160], [165, 118]]], use: [150, 172] },
    fridge:   { name: 'ตู้เย็น 2 ประตู', sprite: 'h_fridge', s: .75, action: 'fridge', cat: 'ห้องครัว' },
    cabinet:  { name: 'ตู้เก็บของในครัว', sprite: 'm_cabinet', s: .6, action: null, cat: 'ห้องครัว' },
    upper:    { name: 'ตู้แขวนและชั้นลอยในครัว', sprite: 'm_upper', s: 0.75, action: null, cat: 'ห้องครัว', wall: true },
    stool:    { name: 'เก้าอี้บาร์', sprite: 'm_stool', s: .6, action: 'seat', cat: 'ห้องครัว', seat: [42, 34] },
    dchair:   { name: 'เก้าอี้ทานอาหาร', sprite: 'm_dchair', s: .6, action: 'seat', cat: 'ห้องครัว', seat: [50, 56] },
    dining:   { name: 'ชุดโต๊ะอาหาร (รุ่นเก่า)', sprite: 'dining_set', s: .6, action: 'eat', cat: 'ห้องครัว', legacy: true },
    toilet:   { name: 'สุขภัณฑ์ (ชักโครก)', sprite: 'm_toilet', s: .55, action: 'toilet', cat: 'ห้องน้ำ' },
    sink:     { name: 'อ่างล้างหน้าพร้อมตู้', sprite: 'm_vanity', s: .52, action: 'wash', cat: 'ห้องน้ำ' },
    shower:   { name: 'ห้องอาบน้ำกระจก', sprite: 'm_shower', s: .55, action: 'shower', cat: 'ห้องน้ำ' },
    frame:    { name: 'ภาพใบไม้ติดผนัง', sprite: 'm_frame', s: 0.62, action: null, cat: 'ของตกแต่ง', wall: true },
    wallshelf:{ name: 'ชั้นติดผนังพร้อมต้นไม้', sprite: 'm_wallshelf', s: .5, action: null, cat: 'ของตกแต่ง', wall: true },
    plant:    { name: 'ต้นไม้ใบใหญ่กระถางขาว', sprite: 'm_plantbig', s: 0.75, foot: .45, action: 'plant', cat: 'ของตกแต่ง' },
    plants:   { name: 'เฟิร์นกระถาง', sprite: 'm_p_fern', s: .5, foot: .45, action: 'plant', cat: 'ของตกแต่ง' },
    p_monstera:{ name: 'มอนสเตอร่ากระถาง', sprite: 'm_p_monstera', s: .5, foot: .45, action: 'plant', cat: 'ของตกแต่ง' },
    p_snake:  { name: 'ลิ้นมังกรกระถาง', sprite: 'm_p_snake', s: .5, foot: .45, action: 'plant', cat: 'ของตกแต่ง' },
    p_palm:   { name: 'ต้นปาล์มกระถาง', sprite: 'm_p_palm', s: .55, foot: .45, action: 'plant', cat: 'ของตกแต่ง' },
    p_stand:  { name: 'ต้นไม้บนขาตั้งไม้', sprite: 'm_p_stand', s: 0.7, foot: .45, action: 'plant', cat: 'ของตกแต่ง' },
    p_trail:  { name: 'พลูด่างกระถาง', sprite: 'm_p_trail', s: .5, foot: .45, action: 'plant', cat: 'ของตกแต่ง' },
    p_leafy:  { name: 'ต้นไม้ใบเขียว', sprite: 'm_p_leafy', s: .5, foot: .45, action: 'plant', cat: 'ของตกแต่ง' },
    p_small:  { name: 'ต้นไม้กระถางเล็ก', sprite: 'm_p_small', s: .5, foot: .45, action: 'plant', cat: 'ของตกแต่ง' },
    p_grass:  { name: 'หญ้าประดับกระถาง', sprite: 'm_p_grass', s: .5, foot: .45, action: 'plant', cat: 'ของตกแต่ง' },
    v_tall:   { name: 'แจกันเซรามิกทรงสูง', sprite: 'm_v_tall', s: .45, action: null, cat: 'ของตกแต่ง' },
    v_wood:   { name: 'แจกันไม้', sprite: 'm_v_wood', s: .45, action: null, cat: 'ของตกแต่ง' },
    v_clay:   { name: 'แจกันดินเผา', sprite: 'm_v_clay', s: .45, action: null, cat: 'ของตกแต่ง' },
    v_diffuser:{ name: 'ก้านไม้หอม', sprite: 'm_v_diffuser', s: .45, action: null, cat: 'ของตกแต่ง' },
    pouf:     { name: 'สตูลนุ่ม (รุ่นเก่า)', sprite: 'pouf', s: .6, action: 'seat', cat: 'ของตกแต่ง', seat: [38, 40], legacy: true }
  };
  // แปลนเริ่มต้นของบ้าน (ตามภาพตัวอย่างบ้านที่ตกแต่งแล้ว) [ชนิด, x, y, กลับด้าน] x,y = จุดฐานด้านหน้าสุดบนพื้น ในพิกัดฉากบ้าน 1672x941
  // ของติดผนัง (wall) x,y = กึ่งกลางขอบล่างของชิ้นบนผนัง
  // ---- บ้านหลังใหม่ (ภาพบ้านขั้นที่ 1–3) + เฟอร์นิเจอร์จากภาพขั้นที่ 4 (k_*) ----
  // สเกลในบ้านหลังใหม่เล็กลง (ตัวละครสูง ~46 หน่วยฉาก) จึงกำหนดสเกล/จุดยึดของแต่ละชนิดใหม่ทั้งหมด
  const K = (o) => o;
  Object.assign(FURN_TYPES, {
    bed:      K({ name: 'เตียงคู่', sprite: 'k_bed', s: .31, action: 'sleep', cat: 'ห้องนอน',
                bed: { head: [190, 95], foot: [400, 322], wdir: [80, -15], blanket: [[20, 240], [110, 150], [470, 95], [640, 235], [600, 300], [220, 410], [90, 380]] } }),
    bed1:     K({ name: 'เตียงเดี่ยว', sprite: 'k_bed1', s: .27, action: 'sleep', cat: 'ห้องนอน',
                bed: { head: [300, 60], foot: [120, 230], wdir: [70, 30], blanket: [[0, 150], [250, 80], [400, 130], [300, 300], [60, 290]] } }),
    night:    K({ name: 'โต๊ะข้างเตียง', sprite: 'k_night', s: .28, action: 'lamp', cat: 'ห้องนอน' }),
    wardrobe: K({ name: 'ตู้เสื้อผ้าไม้', sprite: 'k_wardrobe', s: .3, action: 'wardrobe', cat: 'ห้องนอน' }),
    sideboard:K({ name: 'ตู้ลิ้นชักพร้อมโคมไฟ', sprite: 'k_dresser', s: .27, action: null, cat: 'ห้องนอน' }),
    shelf:    K({ name: 'ชั้นหนังสือไม้', sprite: 'k_bookshelf', s: .3, action: null, cat: 'ห้องนอน' }),
    shelf2:   K({ name: 'ชั้นหนังสือไม้แคบ', sprite: 'k_bookshelf2', s: .3, action: null, cat: 'ห้องนอน' }),
    sofa:     K({ name: 'โซฟาตัว L', sprite: 'k_sofa', s: .25, action: 'sofa', cat: 'ห้องนั่งเล่น', seat: [330, 190] }),
    armchair: K({ name: 'โซฟาเดี่ยว', sprite: 'k_armchair', s: .25, action: 'seat', cat: 'ห้องนั่งเล่น', seat: [100, 130] }),
    armchair2:K({ name: 'เก้าอี้เท้าแขน', sprite: 'k_armchair2', s: .25, action: 'seat', cat: 'ห้องนั่งเล่น', seat: [95, 140] }),
    coffee:   K({ name: 'โต๊ะกลางทรงกลม', sprite: 'k_coffee', s: .2, action: null, cat: 'ห้องนั่งเล่น' }),
    sidetbl:  K({ name: 'โต๊ะข้างทรงกลม', sprite: 'k_sidetbl', s: .22, action: null, cat: 'ห้องนั่งเล่น' }),
    pouf:     K({ name: 'สตูลนุ่ม', sprite: 'k_pouf', s: .2, action: 'seat', cat: 'ห้องนั่งเล่น', seat: [110, 90] }),
    rug:      K({ name: 'พรมทอลาย', sprite: 'k_rug', s: .34, action: null, cat: 'ห้องนั่งเล่น', passable: true, floor: true }),
    tv:       K({ name: 'ชั้นวางทีวีและโทรทัศน์', sprite: 'k_tv', s: .19, action: 'tv', cat: 'ห้องนั่งเล่น' }),
    console:  K({ name: 'ตู้โชว์พร้อมกรอบรูป', sprite: 'k_console', s: .22, action: null, cat: 'ห้องนั่งเล่น' }),
    lamp:     K({ name: 'โคมไฟตั้งพื้น', sprite: 'k_lamp', s: .17, action: 'lamp', cat: 'ห้องนั่งเล่น', foot: .5 }),
    rshelf:   K({ name: 'ชั้นวางของประดับ', sprite: 'k_shelf', s: .25, action: null, cat: 'ห้องนั่งเล่น' }),
    desk:     K({ name: 'โต๊ะทำงานพร้อมคอมพิวเตอร์', sprite: 'k_desk', s: .3, action: 'desk', cat: 'มุมทำงาน' }),
    chair:    K({ name: 'เก้าอี้ทำงาน', sprite: 'm_ochair', s: .22, action: 'seat', cat: 'มุมทำงาน', seat: [86, 118] }),
    stove:    K({ name: 'เตาแก๊สพร้อมเตาอบ', sprite: 'k_stove', s: .27, action: 'cook', cat: 'ห้องครัว' }),
    lowcab:   K({ name: 'ตู้ครัวล่าง', sprite: 'k_lowcab', s: .27, action: null, cat: 'ห้องครัว' }),
    kshelf:   K({ name: 'ชั้นวางของในครัว', sprite: 'k_kshelf', s: .25, action: null, cat: 'ห้องครัว' }),
    island:   K({ name: 'เคาน์เตอร์ซิงก์ล้างจาน', sprite: 'k_counter', s: .2, action: 'dishes', cat: 'ห้องครัว' }),
    fridge:   K({ name: 'ตู้เย็น 2 ประตู', sprite: 'k_fridge', s: .24, action: 'fridge', cat: 'ห้องครัว' }),
    stool:    K({ name: 'เก้าอี้บาร์', sprite: 'm_stool', s: .21, action: 'seat', cat: 'ห้องครัว', seat: [42, 34] }),
    dining:   K({ name: 'โต๊ะอาหารไม้', sprite: 'k_table', s: .2, action: 'eat', cat: 'ห้องครัว' }),
    dchair:   K({ name: 'เก้าอี้ทานอาหาร', sprite: 'k_dchair', s: .2, action: 'seat', cat: 'ห้องครัว', seat: [65, 120] }),
    toilet:   K({ name: 'สุขภัณฑ์ (ชักโครก)', sprite: 'm_toilet', s: .2, action: 'toilet', cat: 'ห้องน้ำ' }),
    sink:     K({ name: 'อ่างล้างหน้าพร้อมตู้', sprite: 'k_basin', s: .25, action: 'wash', cat: 'ห้องน้ำ' }),
    shower:   K({ name: 'ห้องอาบน้ำกระจก', sprite: 'k_shower', s: .2, action: 'shower', cat: 'ห้องน้ำ' }),
    tub:      K({ name: 'อ่างอาบน้ำ', sprite: 'k_tub', s: .24, action: 'shower', cat: 'ห้องน้ำ' }),
    washer:   K({ name: 'เครื่องซักผ้า', sprite: 'k_washer', s: .25, action: 'laundry', cat: 'ห้องน้ำ' }),
    plant:    K({ name: 'ต้นไม้ใบใหญ่', sprite: 'k_plant', s: .17, action: 'plant', cat: 'ของตกแต่ง', foot: .45 }),
    plants:   K({ name: 'ต้นไม้กระถางทรงสูง', sprite: 'k_plant2', s: .2, action: 'plant', cat: 'ของตกแต่ง', foot: .45 }),
    p_small:  K({ name: 'ต้นไม้กระถางเล็ก', sprite: 'k_plantpot', s: .2, action: 'plant', cat: 'ของตกแต่ง', foot: .45 })
  });
  // ชิ้นชุดเดิม (m_*) ยังซื้อ/วางได้ ปรับสเกลให้เข้ากับบ้านหลังใหม่
  for (const k of ['desk2', 'cabinet', 'rug2', 'shelfplant', 'p_monstera', 'p_snake', 'p_palm', 'p_stand', 'p_trail', 'p_leafy', 'p_grass', 'v_tall', 'v_wood', 'v_clay', 'v_diffuser'])
    if (FURN_TYPES[k] && !FURN_TYPES[k]._k) { FURN_TYPES[k].s = +(FURN_TYPES[k].s * .35).toFixed(3); FURN_TYPES[k]._k = 1; }
  for (const k of ['frame', 'wallshelf', 'upper']) delete FURN_TYPES[k]; // ของติดผนังชุดเดิมไม่เข้ากับผนังบ้านหลังใหม่
  // แปลนเริ่มต้นตามภาพบ้านขั้นที่ 3 [ชนิด, x, y, กลับด้าน] (x,y = จุดฐานหน้าสุด ในพิกัดภาพบ้าน 1536x1024)
  const HOME_LAYOUT = [
    // ห้องนอนใหญ่
    ['bed', 357, 310], ['night', 461, 221], ['shelf', 493, 236], ['p_small', 520, 228],
    // ห้องนอนเล็ก
    ['bed1', 400, 460], ['desk', 470, 400], ['chair', 455, 413, 1], ['shelf2', 372, 410],
    // ห้องน้ำ
    ['toilet', 620, 172],
    // ห้องครัว
    ['stove', 866, 175], ['island', 903, 188, 1], ['fridge', 965, 196], ['stool', 904, 205], ['stool', 930, 200],
    // ห้องนั่งเล่น + โต๊ะอาหาร
    ['rug', 780, 432], ['sofa', 760, 410], ['coffee', 793, 427], ['tv', 710, 364], ['plant', 612, 357], ['lamp', 870, 318],
    ['dining', 975, 349], ['dchair', 951, 330], ['dchair', 998, 308, 1], ['dchair', 960, 362], ['dchair', 1020, 352, 1], ['plants', 1060, 340]
  ];

  // แปลนรุ่นก่อน (ใช้ตรวจว่าเซฟเดิมยังไม่เคยจัดบ้านเอง)
  const HOME_LAYOUT_V3 = [
    ['bed', 720, 290], ['night', 815, 215], ['wardrobe', 1100, 520], ['fridge', 150, 420], ['stove', 430, 520], ['stool', 560, 560],
    ['rug', 770, 735], ['armchair', 560, 690], ['coffee', 700, 712], ['sofa', 905, 770], ['tv', 1030, 520], ['plant', 1150, 590],
    ['desk', 1380, 560, 1], ['chair', 1290, 560], ['toilet', 1220, 330], ['sink', 1320, 300]
  ];
  // ระดับคุณภาพ: q ส่งผลต่ออัตราฟื้นฟู
  const TIERS = [
    { key: 'basic', name: 'พื้นฐาน', q: 1.0, mult: 1 },
    { key: 'good', name: 'ดี', q: 1.35, mult: 2.4 },
    { key: 'premium', name: 'พรีเมียม', q: 1.8, mult: 5 }
  ];
  const FURN_BASE_PRICE = { bed: 3900, night: 890, wardrobe: 2900, sofa: 4500, armchair: 2900, coffee: 1500, rug: 990, rug2: 590, tv: 8900, desk: 2600, desk2: 2900, chair: 1290, stove: 5200, fridge: 6500, cabinet: 1590, upper: 2400, stool: 690, dchair: 790, dining: 3200, toilet: 3500, sink: 2400, shower: 6900, sideboard: 1990, shelf: 1290, shelfplant: 1490, frame: 490, wallshelf: 690, plant: 690, plants: 390, p_monstera: 590, p_snake: 390, p_palm: 490, p_stand: 590, p_trail: 390, p_leafy: 390, p_small: 290, p_grass: 290, v_tall: 390, v_wood: 350, v_clay: 250, v_diffuser: 290, pouf: 790, bed1: 2900, shelf2: 990, armchair2: 2400, sidetbl: 690, console: 2200, lamp: 1290, rshelf: 1190, lowcab: 2400, kshelf: 990, island: 7900, tub: 9900, washer: 8900 };

  // ---------- สินค้า ----------
  // kind: food (เข้ากระเป๋า กินได้), ingredient, med, item, furn, outfit, car, service
  const ITEMS = {
    // ซูเปอร์มาร์เก็ต
    bento:     { name: 'ข้าวกล่องพร้อมทาน', price: 55,  kind: 'food', eff: { hunger: 40, happy: 2 }, mins: 20, icon: '🍱' },
    sandwich:  { name: 'แซนด์วิช',        price: 39,  kind: 'food', eff: { hunger: 25 }, mins: 10, icon: '🥪' },
    fruit:     { name: 'ผลไม้รวม',         price: 45,  kind: 'food', eff: { hunger: 15, health: 3 }, mins: 10, icon: '🍎' },
    water:     { name: 'น้ำดื่มแพ็ค',       price: 30,  kind: 'food', eff: { hunger: 4, health: 2 }, mins: 2, icon: '💧' },
    instant:   { name: 'บะหมี่กึ่งสำเร็จรูป', price: 12,  kind: 'food', eff: { hunger: 22, health: -2 }, mins: 10, icon: '🍜' },
    ingr:      { name: 'วัตถุดิบทำอาหาร (1 มื้อ)', price: 70, kind: 'ingredient', icon: '🥬' },
    ingr5:     { name: 'วัตถุดิบทำอาหาร (5 มื้อ)', price: 320, kind: 'ingredient', qty: 5, icon: '🧺' },
    snack:     { name: 'ขนมขบเคี้ยว',       price: 25,  kind: 'food', eff: { hunger: 10, happy: 4, health: -1 }, mins: 5, icon: '🍪' },
    // ร้านของใช้
    soap:      { name: 'สบู่และแชมพู',       price: 120, kind: 'item', icon: '🧴', desc: 'อาบน้ำแล้วสะอาดขึ้นอีก 10%' },
    cleaner:   { name: 'น้ำยาทำความสะอาด',   price: 89,  kind: 'item', icon: '🧽', desc: 'ทำความสะอาดบ้านเร็วขึ้น' },
    petfood:   { name: 'อาหารสัตว์เลี้ยง (7 วัน)', price: 350, kind: 'item', icon: '🦴' },
    pet:       { name: 'รับเลี้ยงน้องหมาพุดเดิ้ล', price: 4500, kind: 'pet', icon: '🐩', desc: 'เพื่อนในบ้าน เล่นด้วยแล้วมีความสุข ค่าอาหารวันละ 50' },
    // ร้านขายยา
    paracetamol: { name: 'ยาแก้ปวดลดไข้', price: 35, kind: 'med', eff: { health: 12 }, icon: '💊' },
    vitamin:   { name: 'วิตามินรวม 30 วัน', price: 390, kind: 'med', eff: { health: 6 }, icon: '🍊', desc: 'ลดโอกาสเจ็บป่วย 30 วัน', buff: 'vitamin' },
    firstaid:  { name: 'ชุดปฐมพยาบาล',     price: 250, kind: 'med', eff: { health: 20 }, icon: '🩹' },
    stressbal: { name: 'ชาสมุนไพรผ่อนคลาย', price: 120, kind: 'med', eff: { stress: -15 }, icon: '🍵' },
    // อิเล็กทรอนิกส์ (นอกจากเครื่องใช้ไฟฟ้าแบบเฟอร์นิเจอร์)
    laptop:    { name: 'แล็ปท็อปทำงาน',      price: 18900, kind: 'item', icon: '💻', desc: 'รับงานฟรีแลนซ์ออกแบบ/เขียนงานได้มากขึ้น' },
    phone:     { name: 'สมาร์ตโฟนรุ่นใหม่',   price: 12900, kind: 'item', icon: '📱', desc: 'รับงานส่งของ/ขับรถได้เร็วขึ้น' },
    headphone: { name: 'หูฟังตัดเสียง',       price: 3490, kind: 'item', icon: '🎧', desc: 'พักผ่อนแล้วความเครียดลดมากขึ้น' },
    bike:      { name: 'สกู๊ตเตอร์ไฟฟ้า',      price: 32900, kind: 'item', icon: '🛵', desc: 'ใช้ส่งอาหาร/พัสดุ เดินทางเร็วกว่าเดิน (ตัวละครขี่จริงในฉาก)' },
    bigbike:   { name: 'บิ๊กไบค์ 650 ซีซี',     price: 289000, kind: 'item', icon: '🏍️', desc: 'เดินทางเร็วที่สุด ใช้ส่งของได้ ค่าน้ำมันสูงกว่าสกู๊ตเตอร์' },
    helmet:    { name: 'หมวกกันน็อกเต็มใบ',    price: 1890, kind: 'item', icon: '⛑️', desc: 'ลดโอกาสบาดเจ็บเมื่อเกิดอุบัติเหตุ' },
    // คาเฟ่
    coffee:    { name: 'ลาเต้เย็น',          price: 65,  kind: 'cafe', eff: { energy: 12, happy: 4, hunger: 3 }, mins: 20, icon: '☕' },
    cake:      { name: 'เค้กกล้วยหอม',       price: 85,  kind: 'cafe', eff: { hunger: 18, happy: 8 }, mins: 20, icon: '🍰' },
    brunch:    { name: 'บรันช์จานใหญ่',      price: 189, kind: 'cafe', eff: { hunger: 55, happy: 10 }, mins: 45, icon: '🍳' },
    tea:       { name: 'ชาเย็นปั่น',          price: 55,  kind: 'cafe', eff: { energy: 6, happy: 6 }, mins: 15, icon: '🧋' },
    seafood:   { name: 'ข้าวผัดทะเลจานใหญ่', price: 189, kind: 'cafe', eff: { hunger: 60, happy: 9 }, mins: 40, icon: '🦐' },
    croissant: { name: 'ครัวซองต์เนยสด', price: 75, kind: 'cafe', eff: { hunger: 22, happy: 6 }, mins: 15, icon: '🥐' },
    coffee2:   { name: 'กาแฟกระป๋องเย็น', price: 25, kind: 'food', eff: { energy: 8, hunger: 2 }, mins: 2, icon: '🥫' },
    jacket:    { name: 'แจ็กเก็ตตัวใหม่', price: 1290, kind: 'item', icon: '🧥', desc: 'ใส่แล้วมั่นใจ ความสุข +12', eff: { happy: 12 } },
    sneakers:  { name: 'รองเท้าผ้าใบ', price: 1590, kind: 'item', icon: '👟', desc: 'เดินสบาย ความสุข +10', eff: { happy: 10 } },
    handbag:   { name: 'กระเป๋าถือหนัง', price: 2490, kind: 'item', icon: '👜', desc: 'ความสุข +14', eff: { happy: 14 } },
    watch:     { name: 'นาฬิกาข้อมือ', price: 3990, kind: 'item', icon: '⌚', desc: 'ตรงต่อเวลาขึ้น ความสุข +10', eff: { happy: 10 } },
    pasta:     { name: 'พาสต้าซอสครีม',       price: 159, kind: 'cafe', eff: { hunger: 50, happy: 8 }, mins: 40, icon: '🍝' },
    steak:     { name: 'สเต๊กไก่จานใหญ่',      price: 229, kind: 'cafe', eff: { hunger: 65, happy: 10, health: 2 }, mins: 50, icon: '🍗' },
    salad:     { name: 'สลัดผักอกไก่',        price: 129, kind: 'cafe', eff: { hunger: 35, health: 6 }, mins: 25, icon: '🥗' }
  };

  // ร้านค้า: inventory = รายการ id สินค้า/เฟอร์นิเจอร์/ชุด
  // ร้านค้า: inventory = รายการ id สินค้า (f: = เฟอร์นิเจอร์, c: = รถยนต์)
  const SHOPS = {
    conv:    { name: 'ร้านสะดวกซื้อใบเตย', open: 0, close: 24, items: ['bento', 'sandwich', 'fruit', 'water', 'instant', 'snack', 'coffee2', 'soap'], staff: 'mali', job: 'shift_super' },
    super:   { name: 'ซูเปอร์มาร์เก็ตต้นไม้ (ในห้าง)', open: 10, close: 22, items: ['bento', 'fruit', 'water', 'ingr', 'ingr5', 'snack', 'soap', 'cleaner', 'petfood'], staff: 'pim' },
    general: { name: 'ร้านเฟอร์นิเจอร์และของแต่งบ้าน', open: 10, close: 21, items: ['f:bed', 'f:night', 'f:wardrobe', 'f:sideboard', 'f:sofa', 'f:armchair', 'f:coffee', 'f:rug', 'f:rug2', 'f:shelf', 'f:shelfplant', 'f:desk', 'f:desk2', 'f:chair', 'f:stool', 'f:dchair', 'f:cabinet', 'f:bed1', 'f:shelf2', 'f:armchair2', 'f:sidetbl', 'f:pouf', 'f:console', 'f:lamp', 'f:rshelf', 'f:lowcab', 'f:kshelf', 'f:plant', 'f:plants', 'f:p_monstera', 'f:p_snake', 'f:p_palm', 'f:p_stand', 'f:p_trail', 'f:p_leafy', 'f:p_small', 'f:p_grass', 'f:v_tall', 'f:v_wood', 'f:v_clay', 'f:v_diffuser', 'cleaner'], staff: 'somchai' },
    elec:    { name: 'ร้านเครื่องใช้ไฟฟ้า', open: 10, close: 21, items: ['f:tv', 'f:fridge', 'f:stove', 'f:island', 'f:sink', 'f:toilet', 'f:shower', 'f:tub', 'f:washer', 'laptop', 'phone', 'headphone'], staff: 'krit' },
    clothes: { name: 'ร้านเสื้อผ้าและกระเป๋า', open: 10, close: 21, items: ['jacket', 'sneakers', 'handbag', 'watch'], staff: 'ploy' },
    pharm:   { name: 'คลินิกและร้านยาใบเตย', open: 8, close: 21, items: ['paracetamol', 'vitamin', 'firstaid', 'stressbal'], staff: 'nida' },
    cafe:    { name: 'ร้านอาหารทะเลสีคราม', open: 10, close: 22, items: ['seafood', 'salad', 'pasta', 'steak', 'brunch'], staff: 'nok' },
    coffee:  { name: 'คาเฟ่ใบเขียว', open: 7, close: 20, items: ['coffee', 'tea', 'cake', 'croissant'], staff: 'fah' },
    cars:    { name: 'โชว์รูมรถยนต์ล้อทอง', open: 9, close: 19, items: ['c:eco', 'c:sedan', 'c:suv'], staff: 'tan' },
    moto:    { name: 'Moto Hub ร้านมอเตอร์ไซค์', open: 9, close: 20, items: ['bike', 'bigbike', 'helmet'], staff: 'mek' }
  };

  const CARS = {
    eco:   { name: 'อีโค่คาร์ 1.2', price: 429000, fuel: 1.6, upkeep: 600,  value: 0.85, comfort: 1.0 },
    sedan: { name: 'ซีดาน 1.8',    price: 789000, fuel: 2.2, upkeep: 900,  value: 0.85, comfort: 1.2 },
    suv:   { name: 'เอสยูวี ไฮบริด', price: 1290000, fuel: 1.9, upkeep: 1300, value: 0.88, comfort: 1.4 }
  };

  // ---------- งาน ----------
  // type: office (ประจำ), freelance, ride, delivery, shift
  // ---------- งานอาชีพใหม่ (ทำงานตามกะที่สถานที่จริงบนแผนที่ เงินเดือนทุก 30 วัน คิดตามวันทำงาน) ----------
  // req = ทักษะขั้นต่ำ · fee = ค่าอบรม/ค่าเรียนก่อนเริ่มงาน (ผ่อนเป็นหนี้การศึกษาได้) · fullDays = วันทำงานเต็มรอบ
  const CAREERS = {
    police:   { name: 'ตำรวจ', place: 'police', npc: 'pol1', icon: '👮', shift: 8, start: [8, 20], fullDays: 22, skill: 'drive', skill2: 'comm',
      req: { drive: 2, comm: 1 }, fee: 0, desc: 'เข้ากะเช้า 08:00 หรือกะดึก 20:00 (กะดึกได้เพิ่ม 15%) ที่สถานีตำรวจ',
      levels: [{ title: 'ผู้ช่วยสายตรวจ', salary: 15000 }, { title: 'สายตรวจ', salary: 21000 }, { title: 'สารวัตร', salary: 29000 }, { title: 'ผู้กำกับการ', salary: 38000 }] },
    bank:     { name: 'พนักงานธนาคาร', place: 'bank', npc: 'bank1', icon: '🏦', shift: 8, start: [8.5], weekdays: true, fullDays: 22, skill: 'finance', skill2: 'comm',
      req: { finance: 2, comm: 1 }, fee: 0, desc: 'จันทร์–ศุกร์ 08:30–16:30 ที่ธนาคาร',
      levels: [{ title: 'พนักงานบริการลูกค้า', salary: 18000 }, { title: 'เจ้าหน้าที่สินเชื่อ', salary: 25000 }, { title: 'ผู้จัดการสาขา', salary: 34000 }, { title: 'ผู้จัดการเขต', salary: 45000 }] },
    mechanic: { name: 'ช่างซ่อมรถ', place: 'moto', npc: 'chang', icon: '🔧', shift: 8, start: [9], noSunday: true, fullDays: 26, skill: 'tech', skill2: 'drive',
      req: { tech: 1, drive: 1 }, fee: 0, tipRange: [50, 260], desc: 'จันทร์–เสาร์ 09:00–17:00 ที่อู่ Moto Hub · ได้ค่าคอมมิชชันต่อกะ',
      levels: [{ title: 'ช่างฝึกหัด', salary: 13000 }, { title: 'ช่างเทคนิค', salary: 22000 }, { title: 'หัวหน้าช่าง', salary: 32000 }] },
    crew:     { name: 'พนักงานต้อนรับบนเครื่องบิน', place: 'airport', npc: 'crew', icon: '✈️', flight: [6, 10], start: [6, 14], fullDays: 14, skill: 'comm', skill2: 'sales',
      req: { comm: 3 }, fee: 15000, desc: 'ทำงานเป็นเที่ยวบิน เที่ยวละ 6–10 ชั่วโมง (เดินทางไปกลับในวันเดียว) เริ่มบิน 06:00 หรือ 14:00 ที่สนามบิน',
      levels: [{ title: 'ลูกเรือฝึกหัด', salary: 28000 }, { title: 'ลูกเรือ', salary: 42000 }, { title: 'หัวหน้าลูกเรือ', salary: 70000 }] },
    pilot:    { name: 'นักบิน', place: 'airport', npc: 'pilot', icon: '🛫', flight: [6, 10], start: [6, 14], fullDays: 14, skill: 'tech', skill2: 'drive',
      req: { tech: 4, drive: 4 }, fee: 350000, feeLoan: true, desc: 'ต้องเรียนการบินก่อน (฿350,000 ผ่อนเป็นหนี้การศึกษาได้) · บินเป็นเที่ยว เริ่ม 06:00 หรือ 14:00',
      levels: [{ title: 'นักบินผู้ช่วย', salary: 60000 }, { title: 'นักบินที่หนึ่ง', salary: 95000 }, { title: 'กัปตัน', salary: 140000 }, { title: 'กัปตันอาวุโส', salary: 200000 }] }
  };
  const JOBS = {
    office: {
      name: 'พนักงานบริษัท (งานประจำ)', type: 'office', place: 'office',
      levels: [
        { title: 'ผู้ช่วยฝ่ายปฏิบัติการ', salary: 16500 },
        { title: 'เจ้าหน้าที่ปฏิบัติการ', salary: 21000 },
        { title: 'หัวหน้าทีม', salary: 28500 },
        { title: 'ผู้จัดการฝ่าย', salary: 39000 },
        { title: 'ผู้อำนวยการ', salary: 58000 }
      ],
      hours: [9, 17], days: [1, 2, 3, 4, 5], skill: 'comm', skill2: 'tech',
      desc: 'จันทร์–ศุกร์ 09:00–17:00 ที่ออฟฟิศ เงินเดือนจ่ายทุก 30 วันตามวันที่มาทำงาน เลื่อนขั้นได้'
    },
    freelance: {
      name: 'ฟรีแลนซ์ (ออกแบบ/เขียนงาน/งานออนไลน์)', type: 'freelance', place: 'anywhere',
      desc: 'รับงานจากโต๊ะทำงานหรือมือถือ ทำเสร็จได้เงินทันที ต้องมีทักษะเทคโนโลยี/สร้างสรรค์'
    },
    ride: {
      name: 'ขับรถรับส่งผู้โดยสาร', type: 'ride', place: 'anywhere',
      desc: 'ต้องมีรถยนต์ เลือกเที่ยวรับส่ง มีค่าน้ำมันและรถสึกหรอ'
    },
    delivery: {
      name: 'ส่งอาหาร/พัสดุ', type: 'delivery', place: 'anywhere',
      desc: 'ใช้เดิน มอเตอร์ไซค์ไฟฟ้า หรือรถยนต์ ยิ่งเร็วยิ่งได้หลายรอบ'
    },
    shift_super: {
      name: 'พนักงานร้านซูเปอร์มาร์เก็ต (รายกะ)', type: 'shift', place: 'super', wage: 62, shiftHours: 4,
      desc: 'ทำกะละ 4 ชั่วโมง ชั่วโมงละ 62 บาท ไปที่ร้านแล้วคุยกับพนักงานหรือกดที่เคาน์เตอร์'
    }
  };

  const FREELANCE_GIGS = [
    { name: 'ออกแบบโลโก้ร้านกาแฟ', skill: 'tech', need: 1, hours: 4, pay: 1800, laptop: false, creative: true },
    { name: 'เขียนบทความรีวิวสินค้า', skill: 'comm', need: 0, hours: 2, pay: 650, laptop: false, creative: true },
    { name: 'ตัดต่อวิดีโอสั้น 3 คลิป', skill: 'tech', need: 2, hours: 5, pay: 2600, laptop: true, creative: true },
    { name: 'กรอกข้อมูลสต็อกออนไลน์', skill: 'tech', need: 0, hours: 3, pay: 540, laptop: false },
    { name: 'ทำเว็บไซต์หน้าเดียว', skill: 'tech', need: 4, hours: 8, pay: 7500, laptop: true, creative: true },
    { name: 'แปลเอกสารสัญญา', skill: 'comm', need: 3, hours: 4, pay: 2400, laptop: false },
    { name: 'วางแผนงบการเงินร้านเล็ก', skill: 'finance', need: 3, hours: 5, pay: 3800, laptop: true },
    { name: 'ถ่ายภาพสินค้าออนไลน์', skill: 'sales', need: 1, hours: 3, pay: 1200, laptop: false, creative: true },
    { name: 'ตอบแชตลูกค้าร้านค้าออนไลน์', skill: 'sales', need: 0, hours: 3, pay: 600, laptop: false }
  ];

  const SKILLS = {
    comm: { name: 'การสื่อสาร', icon: '💬' },
    drive: { name: 'การขับรถ', icon: '🚗' },
    finance: { name: 'การเงิน', icon: '📊' },
    cook: { name: 'การทำอาหาร', icon: '🍳' },
    tech: { name: 'เทคโนโลยี', icon: '💻' },
    sales: { name: 'การขาย', icon: '🛍️' }
  };

  // ---------- หุ้นจำลอง (ข้อมูลในเกมเท่านั้น) ----------
  const STOCKS = [
    { id: 'TMRK', name: 'ต้นไม้รีเทล', price: 24.5, vol: 0.018, drift: 0.05, divYield: 0.05, divFreq: 'month', sector: 'ค้าปลีก' },
    { id: 'NRGY', name: 'แสงเหนือพลังงาน', price: 41.0, vol: 0.022, drift: 0.04, divYield: 0.08, divFreq: 'month', sector: 'พลังงาน' },
    { id: 'RENT', name: 'บ้านดีกองทุนอสังหา', price: 9.8, vol: 0.012, drift: 0.02, divYield: 0.12, divFreq: 'month', sector: 'อสังหาฯ' },
    { id: 'BYTE', name: 'ไบต์ฟิวเจอร์เทค', price: 68.0, vol: 0.04, drift: 0.12, divYield: 0, divFreq: null, sector: 'เทคโนโลยี' },
    { id: 'BANK', name: 'ธนาคารเมืองใบไม้', price: 132.0, vol: 0.015, drift: 0.04, divYield: 0.08, divFreq: 'half', sector: 'การเงิน' },
    { id: 'FOOD', name: 'อาหารมุมสวน', price: 15.2, vol: 0.025, drift: 0.07, divYield: 0.05, divFreq: 'half', sector: 'อาหาร' }
  ];

  const PROPERTIES = [
    { id: 'room', name: 'ห้องเช่าคอนโดใกล้รถไฟ', price: 520000, rent: 4200, upkeep: 650, vacancy: 0.12, desc: 'ผู้เช่าอาจว่างบางเดือน มีค่าส่วนกลางทุกเดือน' },
    { id: 'shop', name: 'อาคารพาณิชย์ 1 คูหา', price: 1650000, rent: 14500, upkeep: 2200, vacancy: 0.18, desc: 'ค่าเช่าสูง แต่ถ้าว่างจะขาดรายได้ทั้งเดือน' },
    { id: 'house2', name: 'บ้านให้เช่าชานเมือง', price: 980000, rent: 7600, upkeep: 1300, vacancy: 0.1, desc: 'ผู้เช่าระยะยาว ค่าซ่อมบำรุงเป็นครั้งคราว' }
  ];

  const BUSINESSES = {
    cafe: { name: 'คาเฟ่ขนาดเล็ก', cost: 380000, rent: 24000, baseCust: 55, ticket: 75, cogs: 0.42, staffNeed: 2 },
    shop: { name: 'ร้านค้าออนไลน์', cost: 120000, rent: 3500, baseCust: 14, ticket: 220, cogs: 0.62, staffNeed: 1 },
    delivery: { name: 'บริการส่งของในเมือง', cost: 150000, rent: 6000, baseCust: 34, ticket: 70, cogs: 0.32, staffNeed: 2 }
  };
  const BIZ_UPGRADES = [
    { id: 'pos', name: 'ระบบขายหน้าร้าน POS', cost: 12000, eff: { speed: 0.1 } },
    { id: 'ads', name: 'โฆษณาออนไลน์ 3 เดือน', cost: 18000, eff: { cust: 0.18 } },
    { id: 'equip', name: 'อุปกรณ์ชุดใหม่', cost: 45000, eff: { sat: 0.12, speed: 0.08 } },
    { id: 'decor', name: 'ตกแต่งร้านใหม่', cost: 60000, eff: { sat: 0.15, cust: 0.08 } },
    { id: 'training', name: 'อบรมพนักงาน', cost: 15000, eff: { sat: 0.08 } }
  ];
  const STAFF_POOL = [
    { name: 'แพรวา', skill: 0.9, wage: 420 }, { name: 'ต้นกล้า', skill: 1.0, wage: 480 },
    { name: 'มะปราง', skill: 1.15, wage: 560 }, { name: 'ภูผา', skill: 0.8, wage: 380 },
    { name: 'ใบบัว', skill: 1.25, wage: 640 }, { name: 'ชาญ', skill: 1.05, wage: 500 }
  ];

  // ---------- NPC ----------
  // cid = รหัสตัวละครจากชุดภาพใหม่ (ดู assets/characters) · pos = จุดยืนประจำในฉาก (พนักงานยืนนิ่งหลังเคาน์เตอร์)
  const NPCS = {
    mali:    { name: 'มะลิ', role: 'แคชเชียร์ร้านสะดวกซื้อ', cid: 'n35', staff: 'conv', home: 'conv_in', pos: [360, 460], back: 380, face: 'front3q', polite: 'ค่ะ' },
    pim:     { name: 'พิม', role: 'แคชเชียร์ซูเปอร์มาร์เก็ต', cid: 'n36', staff: 'super', home: 'super_in', pos: [596, 470], face: 'front3q', polite: 'ค่ะ' },
    ploy:    { name: 'พลอย', role: 'พนักงานร้านเสื้อผ้า', cid: 'n47', staff: 'clothes', home: 'clothes_in', pos: [1000, 352], back: 300, face: 'front', polite: 'ค่ะ' },
    nok:     { name: 'นก', role: 'พนักงานร้านอาหาร', cid: 'n25', staff: 'cafe', home: 'rest_in', pos: [408, 605], face: 'front3q', polite: 'ครับ' },
    nida:    { name: 'ภญ.นิดา', role: 'เภสัชกร', cid: 'n06', staff: 'pharm', home: 'clinic_in', pos: [700, 300], face: 'front3q', polite: 'ค่ะ' },
    thana:   { name: 'หมอธนา', role: 'แพทย์ประจำคลินิก', cid: 'n07', staff: 'clinic', home: 'clinic_in', pos: [1085, 300], face: 'front', polite: 'ครับ' },
    tan:     { name: 'ธันวา', role: 'ที่ปรึกษาการขายรถ', cid: 'n27', staff: 'cars', home: 'cars_in', pos: [985, 268], face: 'front', polite: 'ครับ' },
    boss:    { name: 'คุณวรรณา', role: 'ผู้จัดการฝ่าย', cid: 'n34', staff: 'office', home: 'office', pos: [1250, 560], face: 'front', polite: 'ค่ะ' },
    prae:    { name: 'พยาบาลแพร', role: 'พยาบาลโรงพยาบาล', cid: 'n05', staff: 'hosp', home: 'hosp_in', pos: [700, 345], face: 'front', polite: 'ค่ะ' },
    ice:     { name: 'ไอซ์', role: 'พนักงานต้อนรับโรงแรม', cid: 'n24', staff: 'hotel', home: 'hotel_in', pos: [590, 165], face: 'front', polite: 'ครับ' },
    mek:     { name: 'เมฆ', role: 'ช่างและพนักงาน Moto Hub', cid: 'n30', staff: 'moto', home: 'moto_in', pos: [470, 360], back: 295, face: 'front', polite: 'ครับ' },
    fah:     { name: 'ฟ้า', role: 'บาริสต้าคาเฟ่ใบเขียว', cid: 'n04', staff: 'coffee', home: 'cafe_in', pos: [783, 395], back: 330, face: 'front', polite: 'ครับ' },
    somchai: { name: 'สมชาย', role: 'พนักงานร้านเฟอร์นิเจอร์', cid: 'n32', staff: 'general', home: 'hg_in', pos: [880, 400], back: 300, face: 'front', polite: 'ครับ' },
    krit:    { name: 'กฤต', role: 'พนักงานขายเครื่องใช้ไฟฟ้า', cid: 'n45', staff: 'elec', home: 'elec_in', pos: [1300, 392], back: 330, face: 'front', polite: 'ครับ' },
    // คนในเมืองที่เดินตามตารางเวลา
    nong:    { name: 'น้อง', role: 'เพื่อนร่วมงาน', cid: 'n10', polite: 'ค่ะ',
      schedule: [[0, 'home'], [8, 'street'], [9, 'office'], [12, 'rest_in'], [13, 'office'], [17, 'street'], [19, 'park'], [21, 'home']] },
    beam:    { name: 'บีม', role: 'เพื่อนบ้าน', cid: 'n02', polite: 'ครับ',
      schedule: [[0, 'home'], [7, 'street'], [9, 'conv_in'], [11, 'street'], [13, 'hg_in'], [16, 'park'], [18, 'street'], [21, 'home']] },
    jane:    { name: 'เจน', role: 'นักออกแบบอิสระ', cid: 'n13', polite: 'ค่ะ',
      schedule: [[0, 'home'], [9, 'street'], [11, 'rest_in'], [13, 'conv_in'], [15, 'street'], [17, 'clothes_in'], [19, 'street'], [22, 'home']] },
    art:     { name: 'อาร์ต', role: 'โปรแกรมเมอร์', cid: 'n50', polite: 'ครับ',
      schedule: [[0, 'home'], [8, 'street'], [9, 'office'], [18, 'street'], [19, 'rest_in'], [21, 'home']] },
    may:     { name: 'เมย์', role: 'นักศึกษาฝึกงาน', cid: 'n12', polite: 'ค่ะ',
      schedule: [[0, 'home'], [8, 'office'], [12, 'street'], [13, 'office'], [17, 'clinic_in'], [18, 'street'], [20, 'home']] },
    lung:    { name: 'ลุงชัย', role: 'คุณลุงเกษียณ', cid: 'n41', polite: 'ครับ',
      schedule: [[0, 'home'], [6, 'park'], [8, 'street'], [10, 'hosp_in'], [11, 'street'], [15, 'cafe_in'], [17, 'street'], [20, 'home']] }
,
    // ---- ตัวละครชุดใหม่ (ไม่มีระบบงานใหม่: ใช้ฉากและตารางเวลาเดิม) ----
    ton:     { name: 'ต้น', role: 'พยาบาลชาย', cid: 'n20', polite: 'ครับ',
      schedule: [[0, 'home'], [7, 'street'], [8, 'hosp_in'], [17, 'street'], [19, 'rest_in'], [21, 'home']] },
    pond:    { name: 'ปอนด์', role: 'พนักงานโรงแรม', cid: 'n23', polite: 'ครับ',
      schedule: [[0, 'home'], [7, 'hotel_in'], [16, 'street'], [18, 'cafe_in'], [20, 'home']] },
    mint:    { name: 'มิ้นท์', role: 'พนักงานขายรถยนต์', cid: 'n28', polite: 'ค่ะ',
      schedule: [[0, 'home'], [9, 'cars_in'], [18, 'street'], [20, 'home']] },
    bow:     { name: 'โบว์', role: 'พนักงานขายมอเตอร์ไซค์', cid: 'n29', polite: 'ค่ะ',
      schedule: [[0, 'home'], [9, 'moto_in'], [18, 'street'], [20, 'home']] },
    chang:   { name: 'ช่างเอก', role: 'ช่างซ่อมรถ (อู่)', cid: 'n31', polite: 'ครับ',
      schedule: [[0, 'home'], [8, 'moto_in'], [12, 'street'], [13, 'moto_in'], [18, 'street'], [20, 'home']] },
    pol1:    { name: 'ร.ต.ท.ภูมิ', role: 'ตำรวจ', cid: 'n16', polite: 'ครับ',
      schedule: [[0, 'home'], [8, 'street'], [12, 'rest_in'], [13, 'street'], [18, 'home']] },
    pol2:    { name: 'ส.ต.ต.หญิงฝน', role: 'ตำรวจ', cid: 'n15', polite: 'ค่ะ',
      schedule: [[0, 'home'], [8, 'street'], [11, 'conv_in'], [12, 'street'], [18, 'home']] },
    bank1:   { name: 'เบนซ์', role: 'พนักงานธนาคาร', cid: 'n21', polite: 'ครับ',
      schedule: [[0, 'home'], [8, 'street'], [12, 'cafe_in'], [13, 'street'], [17, 'super_in'], [18, 'home']] },
    bank2:   { name: 'แนน', role: 'พนักงานธนาคาร', cid: 'n22', polite: 'ค่ะ',
      schedule: [[0, 'home'], [8, 'street'], [12, 'rest_in'], [13, 'street'], [17, 'clothes_in'], [18, 'home']] },
    pilot:   { name: 'กัปตันเจ', role: 'นักบิน', cid: 'n51', polite: 'ครับ',
      schedule: [[0, 'home'], [10, 'hotel_in'], [13, 'street'], [15, 'cafe_in'], [17, 'home']] },
    crew:    { name: 'เจนนี่', role: 'พนักงานต้อนรับบนเครื่องบิน', cid: 'n52', polite: 'ค่ะ',
      schedule: [[0, 'home'], [10, 'hotel_in'], [12, 'clothes_in'], [14, 'street'], [16, 'cafe_in'], [18, 'home']] },
    yai:     { name: 'ยายบุญ', role: 'คุณยายใจดี', cid: 'n40', polite: 'จ้ะ',
      schedule: [[0, 'home'], [6, 'park'], [9, 'super_in'], [11, 'street'], [16, 'park'], [18, 'home']] },
    kid1:    { name: 'น้องมายด์', role: 'เด็กนักเรียน', cid: 'n43', polite: 'ค่ะ',
      schedule: [[0, 'home'], [16, 'street'], [17, 'park'], [18, 'home']] },
    kid2:    { name: 'น้องภูมิ', role: 'เด็กนักเรียน', cid: 'n44', polite: 'ครับ',
      schedule: [[0, 'home'], [16, 'conv_in'], [17, 'street'], [18, 'home']] },
    rich:    { name: 'คุณกรณ์', role: 'นักธุรกิจ', cid: 'n33', polite: 'ครับ',
      schedule: [[0, 'home'], [10, 'cars_in'], [12, 'rest_in'], [14, 'street'], [16, 'hotel_in'], [19, 'home']] }
  };
  // ตัวละครสำรอง: ถ้าผู้เล่นเลือกตัวเดียวกับ NPC ระบบจะเปลี่ยน NPC คนนั้นไปใช้ตัวสำรอง
  const SPARE_CIDS = ['n37', 'n38', 'n39', 'n42', 'n49'];
  // ตัวละครที่ผู้เล่นเลือกได้ (ทุกตัวมีภาพหน้า เฉียง ข้าง หลัง และท่านั่ง)
  // ตัวละครชุดใหม่ทั้งหมด (รหัส nXX = ภาพชุดที่ XX ที่แนบมา) · ทุกตัวมียืน/เดิน 8 ทิศ ท่านั่ง ท่านอน และสีหน้า
  const PLAYABLE = [
    { cid: 'n01', name: 'ฮู้ดดำ ยีนส์ขาด' },
    { cid: 'n02', name: 'ผมหยิก เสื้อยืดขาว' },
    { cid: 'n03', name: 'เสื้อยืดขาว กางเกงดำ' },
    { cid: 'n04', name: 'ผมยาว เสื้อชมพู' },
    { cid: 'n05', name: 'แพทย์หญิง ผมยาว' },
    { cid: 'n06', name: 'แพทย์หญิง ผมสั้น' },
    { cid: 'n07', name: 'แพทย์ชาย' },
    { cid: 'n08', name: 'พนักงานออฟฟิศชาย' },
    { cid: 'n09', name: 'ออฟฟิศชาย ใส่แว่น' },
    { cid: 'n10', name: 'พนักงานออฟฟิศหญิง' },
    { cid: 'n11', name: 'เดรสทำงานสีเบจ' },
    { cid: 'n12', name: 'เดรสลายดอก' },
    { cid: 'n13', name: 'สไตล์มินิมอล' },
    { cid: 'n14', name: 'สายแฟชั่น ผมยาว' },
    { cid: 'n15', name: 'ตำรวจหญิง ผมสั้น' },
    { cid: 'n16', name: 'ตำรวจชาย' },
    { cid: 'n17', name: 'ตำรวจหญิง หางม้า' },
    { cid: 'n18', name: 'ตำรวจชาย ผมเกรียน' },
    { cid: 'n20', name: 'พยาบาลชาย' },
    { cid: 'n21', name: 'พนักงานธนาคารชาย' },
    { cid: 'n22', name: 'พนักงานธนาคารหญิง' },
    { cid: 'n23', name: 'พนักงานโรงแรมชาย' },
    { cid: 'n24', name: 'พนักงานโรงแรมหญิง' },
    { cid: 'n25', name: 'พนักงานร้านอาหารหญิง' },
    { cid: 'n26', name: 'พนักงานร้านอาหารชาย' },
    { cid: 'n27', name: 'เซลส์รถยนต์ชาย' },
    { cid: 'n28', name: 'เซลส์รถยนต์หญิง' },
    { cid: 'n29', name: 'เซลส์มอเตอร์ไซค์หญิง' },
    { cid: 'n30', name: 'ช่างมอเตอร์ไซค์' },
    { cid: 'n31', name: 'ช่างอู่ซ่อมรถ' },
    { cid: 'n32', name: 'พนักงานร้านค้าชาย' },
    { cid: 'n33', name: 'นักธุรกิจชาย' },
    { cid: 'n34', name: 'นักธุรกิจหญิง' },
    { cid: 'n35', name: 'พนักงานร้านค้าหญิง' },
    { cid: 'n36', name: 'มินิมอล มวยผม' },
    { cid: 'n37', name: 'มินิมอลชาย' },
    { cid: 'n38', name: 'คุณลุงมีหนวด' },
    { cid: 'n39', name: 'คุณป้าผมลอน' },
    { cid: 'n40', name: 'คุณยาย' },
    { cid: 'n41', name: 'คุณตา แจ็กเก็ตน้ำตาล' },
    { cid: 'n42', name: 'คุณตา แจ็กเก็ตเบจ' },
    { cid: 'n43', name: 'เด็กหญิง ชุดชมพู' },
    { cid: 'n44', name: 'เด็กชาย สะพายเป้' },
    { cid: 'n45', name: 'วัยรุ่น แจ็กเก็ตดำ' },
    { cid: 'n46', name: 'สายสตรีท หางม้า' },
    { cid: 'n47', name: 'แฟชั่นโทนชมพู' },
    { cid: 'n48', name: 'เด็กหญิง มวยผม' },
    { cid: 'n49', name: 'เด็กชาย เสื้อยืดขาว' },
    { cid: 'n50', name: 'สายเทคโนโลยี' },
    { cid: 'n51', name: 'นักบิน' },
    { cid: 'n52', name: 'พนักงานต้อนรับบนเครื่องบิน' }
  ];


  // ---------- บทสนทนา ----------
  // {n} ชื่อผู้เล่น, {p} คำลงท้าย NPC
  const LINES = {
    greet: {
      morning: ['อรุณสวัสดิ์{p} {n}', 'เช้านี้อากาศดีนะ{p}', 'ตื่นเช้าเหมือนกันเลย{p}'],
      noon: ['สวัสดี{p} กินข้าวเที่ยงหรือยัง', 'บ่ายนี้แดดแรงนะ{p}', 'หวัดดี{p} {n}'],
      evening: ['เย็นแล้ว เลิกงานหรือยัง{p}', 'สวัสดีตอนเย็น{p}', 'วันนี้เหนื่อยไหม{p}'],
      night: ['ดึกแล้วนะ{p} ยังไม่นอนอีกเหรอ', 'ราตรีสวัสดิ์ล่วงหน้า{p}']
    },
    shopWelcome: ['สวัสดี{p} ยินดีต้อนรับ มีอะไรให้ช่วยไหม{p}', 'ยินดีต้อนรับ{p} วันนี้มีของใหม่เข้ามาด้วย{p}', 'สวัสดี{p} เชิญเลือกดูได้ตามสบายเลย{p}'],
    smalltalk: [
      { q: 'ช่วงนี้ของแพงขึ้นเยอะเลยนะ{p}', a: [['ใช่ ต้องวางแผนใช้เงินดี ๆ', 1, 'careful'], ['ไม่เป็นไรหรอก เดี๋ยวก็หาใหม่ได้', 0, 'risky'], ['ลองทำบัญชีรายรับรายจ่ายดูสิ', 2, 'frugal']] },
      { q: 'ว่าง ๆ ชอบทำอะไร{p}', a: [['ออกไปเดินสวนสาธารณะ', 2, 'calm'], ['ทำงานเสริมหารายได้', 1, 'diligent'], ['ทำอะไรใหม่ ๆ สร้างสรรค์', 2, 'creative']] },
      { q: 'เห็นข่าวหุ้นวันนี้ไหม{p}', a: [['ลงทุนระยะยาวไม่ต้องตกใจ', 2, 'careful'], ['ขาลงคือโอกาสซื้อ!', 1, 'risky'], ['ไม่ค่อยได้ตามเลย', 0, null]] },
      { q: 'อยากเปิดร้านเล็ก ๆ สักร้านจัง{p}', a: [['เริ่มเลย! ฉันช่วยคิดให้', 2, 'ambitious'], ['ต้องดูต้นทุนให้ดีก่อนนะ', 1, 'careful'], ['เหนื่อยแน่ ๆ', -1, null]] },
      { q: 'เมื่อวานนอนดึก เพลียมากเลย{p}', a: [['พักบ้างนะ สุขภาพสำคัญ', 2, 'calm'], ['ดื่มกาแฟสักแก้วไหม', 1, 'social'], ['ทำงานหนักก็ต้องแบบนี้แหละ', 0, 'diligent']] },
      { q: 'ร้านแถวนี้ร้านไหนอร่อยบ้าง{p}', a: [['ร้านอาหารสวนหลังคาพาสต้าอร่อยมาก', 2, 'social'], ['ทำกินเองประหยัดกว่า', 1, 'frugal'], ['ไม่รู้เหมือนกัน', 0, null]] }
    ],
    jobTalk: [
      'ตอนนี้ที่ออฟฟิศกำลังรับคนอยู่ ลองไปคุยกับคุณวรรณาดูสิ{p}',
      'ฟรีแลนซ์ก็ดีนะ{p} มีแล็ปท็อปจะรับงานได้มากขึ้น',
      'ถ้ามีรถ ลองขับรับส่งผู้โดยสารช่วงเย็นดู{p} คนเยอะ',
      'ซูเปอร์ฯ ต้นไม้รับพนักงานรายกะ{p} ได้ชั่วโมงละ 62 บาท',
      'ส่งอาหารช่วงเที่ยงกับเย็นได้เยอะสุด{p}'
    ],
    npcChat: [
      ['วันนี้ไปไหนมา', 'ไปซื้อของมานิดหน่อย'], ['ร้อนจังเลย', 'ไปหาอะไรเย็น ๆ กินกัน'],
      ['งานเยอะไหม', 'พอไหว ๆ'], ['เห็นร้านใหม่ยัง', 'ยังเลย พรุ่งนี้ไปดูกัน'],
      ['เดือนนี้เก็บเงินได้เท่าไหร่', 'ความลับ 555'], ['สวนตอนเย็นสวยมาก', 'จริง ลมเย็นดี'],
      ['เมื่อกี้รถติดมาก', 'ขึ้นรถเมล์ดีกว่า']
    ],
    invite: [
      { id: 'coffee', name: 'ไปดื่มกาแฟด้วยกัน', cost: 130, mins: 60, eff: { social: 25, happy: 10, stress: -8 }, rel: 8, need: 0 },
      { id: 'walk', name: 'เดินเล่นในสวน', cost: 0, mins: 60, eff: { social: 18, happy: 8, stress: -12, energy: -6 }, rel: 6, need: 0 },
      { id: 'workout', name: 'ออกกำลังกายด้วยกัน', cost: 0, mins: 60, eff: { social: 15, health: 6, stress: -10, energy: -15, hygiene: -15 }, rel: 7, need: 10 },
      { id: 'dinner', name: 'ไปกินข้าวเย็น', cost: 320, mins: 90, eff: { social: 30, hunger: 50, happy: 14 }, rel: 12, need: 20 }
    ]
  };

  // ---------- เหตุการณ์สุ่ม ----------
  // when: 'any' | 'car' | 'job' ; choices: [{t, money, eff, note}]
  const EVENTS = [
    { id: 'car_break', need: 'car', title: 'รถเสียกลางทาง', text: 'ไฟเตือนเครื่องยนต์ขึ้น ช่างประเมินค่าซ่อม 6,800 บาท',
      choices: [{ t: 'ซ่อมเต็มระบบ (6,800)', money: -6800, car: 40, eff: { stress: 5 } }, { t: 'ซ่อมพอใช้ได้ (2,500)', money: -2500, car: 12, eff: { stress: 10 }, note: 'อาจเสียซ้ำเร็วขึ้น' }, { t: 'ยังไม่ซ่อม', money: 0, car: -10, eff: { stress: 15 }, note: 'สภาพรถลดลง' }] },
    { id: 'sick', title: 'เป็นไข้หวัด', text: 'ตัวร้อน มีน้ำมูก ไปหาหมอหรือพักที่บ้าน?',
      choices: [{ t: 'ไปคลินิก (850)', money: -850, eff: { health: 25, stress: -5 }, mins: 120 }, { t: 'ซื้อยากินเองแล้วนอนพัก (120)', money: -120, eff: { health: 12, energy: 10 }, mins: 240 }, { t: 'ฝืนไปต่อ', money: 0, eff: { health: -15, stress: 10 } }] },
    { id: 'job_offer', need: 'job', title: 'ข้อเสนองานพิเศษ', text: 'ลูกค้าเก่าชวนทำโปรเจกต์ด่วนสุดสัปดาห์ ได้ 4,500 บาท แต่ต้องใช้เวลา 8 ชั่วโมง',
      choices: [{ t: 'รับงาน (+4,500)', money: 4500, eff: { energy: -30, stress: 15 }, mins: 480, skill: ['tech', 2] }, { t: 'ปฏิเสธอย่างสุภาพ', money: 0, eff: { stress: -5 } }] },
    { id: 'biz_chance', title: 'โอกาสทางธุรกิจ', text: 'เพื่อนชวนร่วมลงทุนร้านขายของออนไลน์ 20,000 บาท อาจได้คืน 0–45,000 บาทภายในเดือนหน้า',
      choices: [{ t: 'ร่วมลงทุน (20,000)', money: -20000, gamble: { p: 0.55, win: 45000, lose: 0, delayDays: 20 }, note: 'มีโอกาสขาดทุนทั้งหมด' }, { t: 'ไม่ร่วม', money: 0 }] },
    { id: 'appliance', title: 'ของใช้ในบ้านเสีย', text: 'ท่อน้ำใต้อ่างล้างจานรั่ว ต้องเรียกช่าง',
      choices: [{ t: 'เรียกช่าง (1,400)', money: -1400, eff: { stress: -2 } }, { t: 'ซ่อมเอง (ซื้ออุปกรณ์ 350)', money: -350, eff: { energy: -15, stress: 6 }, mins: 120 }] },
    { id: 'lottery', title: 'ลอตเตอรี่ในเกม', text: 'มีคนมาเสนอขายลอตเตอรี่ในเกมใบละ 80 บาท (ใช้เงินในเกมเท่านั้น) โอกาสถูกรางวัลเล็ก 1 ใน 20 ได้ 2,000 บาท รางวัลใหญ่ 1 ใน 2,000 ได้ 300,000 บาท',
      choices: [{ t: 'ซื้อ 1 ใบ (80)', money: -80, lottery: 1 }, { t: 'ซื้อ 5 ใบ (400)', money: -400, lottery: 5 }, { t: 'ไม่ซื้อ', money: 0 }] },
    { id: 'bonus', need: 'office', title: 'โบนัสผลงาน', text: 'หัวหน้าชมว่าผลงานดี มอบโบนัสพิเศษ 3,000 บาท',
      choices: [{ t: 'ขอบคุณครับ/ค่ะ', money: 3000, eff: { happy: 15 } }] },
    { id: 'friend_wedding', title: 'งานแต่งเพื่อน', text: 'เพื่อนสนิทส่งการ์ดงานแต่งงานมา',
      choices: [{ t: 'ไปร่วมงาน ใส่ซอง 1,000', money: -1000, eff: { social: 30, happy: 12 }, mins: 240 }, { t: 'ฝากซอง 500', money: -500, eff: { social: 5 } }, { t: 'ไม่ไป', money: 0, eff: { social: -10 } }] },
    { id: 'phone_crack', title: 'มือถือตกจอแตก', text: 'จอร้าว ใช้งานลำบาก',
      choices: [{ t: 'เปลี่ยนจอ (2,200)', money: -2200 }, { t: 'ใช้ต่อไปก่อน', money: 0, eff: { stress: 8, happy: -5 } }] },
    { id: 'found_money', title: 'เจอเงินในกระเป๋าเสื้อเก่า', text: 'ล้วงกระเป๋าเสื้อเจอแบงก์ห้าร้อย!', choices: [{ t: 'เย้!', money: 500, eff: { happy: 8 } }] }
  ];

  // ---------- เป้าหมาย ----------
  const GOALS = [
    { id: 'emergency', name: 'เงินสำรองฉุกเฉิน 3 เดือน', icon: '🛟', desc: 'มีเงินออมเท่ากับค่าใช้จ่ายประจำ 3 เดือน' },
    { id: 'freedom', name: 'อิสรภาพทางการเงิน', icon: '🕊️', desc: 'รายได้จากสินทรัพย์ต่อเดือน ≥ ค่าใช้จ่ายประจำต่อเดือน' },
    { id: 'nodebt', name: 'ปลดหนี้', icon: '🔓', desc: 'ไม่มีหนี้คงค้าง' },
    { id: 'house', name: 'ซื้อบ้านของตัวเอง', icon: '🏡', desc: 'สะสมเงินดาวน์ 450,000 บาท แล้วซื้อบ้าน (เลิกจ่ายค่าเช่า)' },
    { id: 'skill', name: 'เรียนทักษะใหม่ให้เก่ง', icon: '🎓', desc: 'มีทักษะใดก็ได้ถึงระดับ 6' },
    { id: 'business', name: 'เปิดธุรกิจของตัวเอง', icon: '🏪', desc: 'เปิดธุรกิจและทำกำไรสะสม 50,000 บาท' },
    { id: 'family', name: 'สร้างครอบครัว', icon: '💞', desc: 'มีความสัมพันธ์ระดับคนพิเศษกับใครสักคน (ความสัมพันธ์ 90+) แล้วขอเป็นครอบครัว' },
    { id: 'happy', name: 'ชีวิตสมดุล', icon: '🌿', desc: 'รักษาความสุขเฉลี่ย 7 วันให้เกิน 70 และความเครียดต่ำกว่า 30' }
  ];

  const SCENES = {"home_in": {"name": "บ้านของฉัน", "bg": "scenes/home_in", "floorMask": "masks/home_in.png", "W": 1536, "H": 1024, "ch": 46, "home": true, "furnHome": true, "walk": [], "obs": [], "occ": [], "props": [], "spots": [{"id": "door", "x": 728, "y": 492, "label": "ออกไปหน้าบ้าน", "icon": "🚪", "act": "go", "to": "home_out", "at": "door"}, {"id": "bath_b", "x": 688, "y": 180, "label": "ฝักบัวและอ่างล้างหน้า (ห้องน้ำ)", "icon": "🚿", "act": "bathroom", "face": "back"}], "links": [{"a": [618, 330], "b": [540, 245], "label": "ประตูห้องนอนใหญ่"}, {"a": [625, 420], "b": [570, 420], "label": "ประตูห้องนอนเล็ก"}, {"a": [672, 322], "b": [650, 175], "label": "ประตูห้องน้ำ"}, {"a": [905, 312], "b": [880, 192], "label": "ประตูครัว"}], "spawns": {"start": [720, 420], "door": [728, 478]}}, "super_in": {"name": "ซูเปอร์มาร์เก็ต (ในห้าง)", "bg": "scenes/super_in", "W": 1672, "H": 941, "ch": 118, "shop": "super", "walk": [[[214, 429], [429, 340], [743, 240], [1000, 240], [1293, 317], [1443, 403], [1643, 497], [1664, 607], [893, 826], [800, 817], [429, 607], [229, 464]], [[340, 560], [430, 520], [470, 620], [380, 650]]], "obs": [], "occ": [], "props": [{"id": "checkout", "img": "checkout", "x": 690, "y": 560, "s": 0.85}, {"id": "produce", "img": "produce", "x": 760, "y": 420, "s": 0.85}, {"id": "shelf1", "img": "shelf_long", "x": 1080, "y": 500, "s": 0.85}, {"id": "shelf2", "img": "shelf_snack", "x": 1060, "y": 700, "s": 0.85}, {"id": "shelf3", "img": "shelf_clean", "x": 1400, "y": 540, "s": 0.8}, {"id": "fruit", "img": "fruit_crate", "x": 1170, "y": 345, "s": 0.75}], "spots": [{"id": "door", "x": 410, "y": 610, "label": "กลับไปที่ทางเดินห้าง", "icon": "🚪", "act": "go", "to": "mall", "at": null}, {"id": "counter", "x": 780, "y": 585, "label": "แคชเชียร์ / สมัครงานรายกะ", "icon": "🧾", "act": "shop", "shop": "super", "face": "back"}, {"id": "shelf", "x": 1085, "y": 535, "label": "ชั้นสินค้า", "icon": "🥫", "act": "shop", "shop": "super", "face": "back"}, {"id": "produce", "x": 800, "y": 455, "label": "ผักผลไม้", "icon": "🍎", "act": "shop", "shop": "super", "face": "back"}], "spawns": {"door": [440, 590]}}, "street": {"name": "ย่านไลฟ์สไตล์ใกล้บ้าน", "bg": "scenes/street", "W": 1364, "H": 768, "ch": 44, "outdoor": true, "walk": [[[0, 239], [1364, 239], [1364, 768], [0, 768]]], "obs": [{"p": [[33, 356], [278, 328], [291, 489], [106, 513], [33, 494]]}, {"p": [[317, 333], [522, 322], [536, 458], [383, 469], [317, 447]]}, {"p": [[511, 278], [820, 267], [824, 413], [667, 436], [511, 424]]}, {"p": [[594, 413], [702, 413], [702, 498], [622, 498]]}, {"p": [[994, 278], [1297, 294], [1297, 458], [1200, 469], [994, 424]]}, {"p": [[450, 506], [769, 500], [769, 617], [622, 644], [478, 633]]}, {"p": [[183, 533], [394, 533], [394, 650], [211, 672], [183, 653]]}, {"p": [[933, 556], [1056, 533], [1200, 556], [1178, 622], [1067, 633], [944, 611]]}, {"p": [[1222, 561], [1322, 561], [1322, 611], [1222, 611]]}], "occ": [], "props": [], "spots": [{"id": "home", "x": 272, "y": 683, "label": "บ้านของฉัน (หน้าบ้าน)", "icon": "🏠", "act": "go", "to": "home_out", "at": "street"}, {"id": "super", "x": 194, "y": 522, "label": "ร้านสะดวกซื้อ", "icon": "🛒", "act": "go", "to": "conv_in", "at": "door", "shop": "conv"}, {"id": "clinic", "x": 444, "y": 476, "label": "คลินิกและร้านยา", "icon": "💊", "act": "go", "to": "clinic_in", "at": "door", "shop": "pharm"}, {"id": "cars", "x": 711, "y": 444, "label": "โชว์รูมรถยนต์", "icon": "🚘", "act": "go", "to": "cars_in", "at": "door", "shop": "cars"}, {"id": "moto", "x": 1111, "y": 444, "label": "Moto Hub", "icon": "🛵", "act": "go", "to": "moto_in", "at": "door", "shop": "moto"}, {"id": "rest", "x": 489, "y": 658, "label": "ร้านอาหารทะเลสีคราม", "icon": "🍝", "act": "go", "to": "rest_in", "at": "door", "shop": "cafe"}, {"id": "park", "x": 1000, "y": 667, "label": "สวนสาธารณะ", "icon": "🌳", "act": "place", "place": "park"}, {"id": "hotel", "x": 344, "y": 253, "label": "โรงแรม The Oasis", "icon": "🏨", "act": "go", "to": "hotel_in", "at": "door"}, {"id": "mall", "x": 694, "y": 247, "label": "ห้างสรรพสินค้า", "icon": "🏬", "act": "place", "place": "mall"}, {"id": "hosp", "x": 1072, "y": 247, "label": "โรงพยาบาล", "icon": "🏥", "act": "go", "to": "hosp_in", "at": "door"}, {"id": "map", "x": 78, "y": 583, "label": "ป้ายรถเมล์ (แผนที่เมือง)", "icon": "🚏", "act": "map"}, {"id": "cafe", "x": 700, "y": 650, "label": "คาเฟ่ใบเขียว", "icon": "☕", "act": "go", "to": "cafe_in", "at": "door", "shop": "coffee"}, {"id": "cafe", "x": 700, "y": 650, "label": "คาเฟ่ใบเขียว", "icon": "☕", "act": "go", "to": "cafe_in", "at": "door", "shop": "coffee"}], "spawns": {"home": [272, 691], "super": [194, 530], "clinic": [444, 484], "cars": [711, 452], "moto": [1111, 452], "rest": [489, 666], "park": [1000, 675], "hotel": [344, 261], "mall": [694, 255], "hosp": [1072, 255], "map": [78, 591], "cafe": [700, 658]}}, "clinic_in": {"name": "คลินิกและร้านยาใบเตย", "bg": "scenes/clinic_in", "W": 1536, "H": 1024, "ch": 150, "shop": "pharm", "walk": [[[364, 593], [566, 465], [903, 404], [1213, 391], [1287, 593], [1361, 674], [930, 795], [903, 674], [768, 701], [714, 822], [472, 822], [404, 701]]], "obs": [{"p": [[728, 633], [903, 633], [903, 809], [728, 809]]}, {"p": [[1173, 445], [1226, 445], [1226, 539], [1173, 539]]}], "occ": [{"p": [[575, 425], [870, 395], [870, 375], [575, 405]], "h": 125}, {"p": [[943, 345], [1160, 395], [1160, 372], [943, 322]], "h": 110}], "props": [], "spots": [{"id": "door", "x": 573, "y": 700, "label": "ออกไปที่ถนน", "icon": "🚪", "act": "go", "to": "street", "at": "clinic"}, {"id": "counter", "x": 714, "y": 470, "label": "เคาน์เตอร์ยา", "icon": "💊", "act": "shop", "shop": "pharm", "face": "back"}, {"id": "consult", "x": 1033, "y": 410, "label": "ปรึกษาเภสัชกร / พบแพทย์", "icon": "🩺", "act": "clinic", "face": "back"}], "spawns": {"door": [580, 680]}}, "cars_in": {"name": "โชว์รูมรถยนต์ล้อทอง", "bg": "scenes/cars_in", "W": 1774, "H": 887, "ch": 135, "shop": "cars", "walk": [[[434, 409], [545, 353], [743, 328], [855, 310], [1152, 347], [1239, 335], [1599, 458], [1599, 644], [1338, 694], [991, 620], [520, 508], [421, 458]]], "obs": [{"p": [[400, 300], [520, 230], [660, 250], [560, 330], [420, 330]]}, {"p": [[650, 450], [760, 370], [910, 390], [860, 480], [720, 500]]}, {"p": [[1160, 480], [1330, 345], [1440, 380], [1300, 540]]}, {"p": [[1357, 600], [1460, 545], [1560, 610], [1460, 670]]}, {"p": [[1505, 520], [1610, 490], [1610, 580], [1505, 585]]}, {"p": [[186, 420], [300, 330], [458, 380], [400, 446]]}], "occ": [{"p": [[830, 300], [1140, 300], [1140, 290], [830, 290]], "h": 110}], "props": [], "spots": [{"id": "door", "x": 790, "y": 545, "label": "ออกไปที่ถนน", "icon": "🚪", "act": "go", "to": "street", "at": "cars"}, {"id": "desk", "x": 980, "y": 330, "label": "โต๊ะที่ปรึกษา / ซื้อรถ", "icon": "📝", "act": "shop", "shop": "cars", "face": "back"}, {"id": "car1", "x": 700, "y": 520, "label": "ชมรถเอสยูวีสีขาว", "icon": "🚙", "act": "shop", "shop": "cars"}], "spawns": {"door": [800, 520]}}, "office": {"name": "ออฟฟิศบริษัทใบไม้ดิจิทัล", "bg": "scenes/office", "W": 1536, "H": 1024, "ch": 140, "walk": [[[140, 330], [560, 305], [1000, 300], [1180, 300], [1190, 560], [950, 580], [950, 790], [500, 800], [140, 800]]], "obs": [{"p": [[330, 410], [660, 400], [660, 570], [330, 580]]}, {"p": [[730, 345], [1065, 345], [1065, 530], [730, 540]]}, {"p": [[140, 610], [330, 610], [330, 730], [140, 730]]}, {"p": [[370, 670], [450, 670], [450, 750], [370, 750]]}, {"p": [[220, 700], [320, 700], [320, 770], [220, 770]]}], "occ": [{"p": [[1078, 734], [1435, 620], [1435, 600], [1078, 714]], "h": 150}], "props": [], "spots": [{"id": "door", "x": 770, "y": 780, "label": "ออกจากออฟฟิศ (แผนที่)", "icon": "🚪", "act": "map"}, {"id": "desk", "x": 900, "y": 560, "label": "โต๊ะทำงานของฉัน", "icon": "💼", "act": "officeWork", "seat": [912, 470], "sitFrame": "chair"}, {"id": "sofa", "x": 250, "y": 600, "label": "มุมพักผ่อน", "icon": "🛋️", "act": "bench"}], "spawns": {"city": [770, 760]}}, "hosp_in": {"name": "โรงพยาบาลเมือง", "bg": "scenes/hosp_in", "W": 1536, "H": 1024, "ch": 150, "walk": [[[162, 472], [364, 391], [660, 391], [1011, 391], [1078, 310], [1240, 270], [1402, 431], [1321, 620], [1011, 809], [822, 809], [687, 728], [499, 593], [364, 539]]], "obs": [{"p": [[209, 404], [404, 350], [404, 431], [229, 499]]}, {"p": [[350, 499], [485, 438], [580, 458], [580, 512], [431, 580], [350, 553]]}, {"p": [[559, 566], [714, 472], [768, 512], [768, 580], [620, 674], [559, 647]]}, {"p": [[721, 674], [889, 566], [950, 606], [950, 674], [822, 734], [721, 728]]}, {"p": [[1193, 445], [1307, 445], [1307, 553], [1193, 553]]}], "occ": [{"p": [[480, 440], [920, 440], [920, 430], [480, 430]], "h": 150}], "props": [], "spots": [{"id": "door", "x": 460, "y": 590, "label": "ออกไปที่ถนน", "icon": "🚪", "act": "go", "to": "street", "at": "hosp"}, {"id": "desk", "x": 782, "y": 400, "label": "เคาน์เตอร์ลงทะเบียน", "icon": "🏥", "act": "hospital", "face": "back"}], "spawns": {"door": [480, 575]}}, "hotel_in": {"name": "โรงแรม The Oasis", "bg": "scenes/hotel_in", "W": 1536, "H": 1024, "ch": 150, "walk": [[[94, 519], [404, 303], [849, 249], [1321, 290], [1408, 431], [1294, 485], [1294, 647], [903, 755], [606, 647], [135, 553]]], "obs": [{"p": [[162, 377], [472, 310], [593, 377], [755, 391], [755, 499], [606, 553], [438, 553], [256, 539], [162, 445]]}, {"p": [[1085, 519], [1307, 519], [1307, 721], [1085, 721]]}], "occ": [{"p": [[404, 303], [822, 243], [822, 220], [404, 280]], "h": 150}], "props": [], "spots": [{"id": "door", "x": 566, "y": 573, "label": "ออกไปที่ถนน", "icon": "🚪", "act": "go", "to": "street", "at": "hotel"}, {"id": "desk", "x": 609, "y": 292, "label": "เคาน์เตอร์ต้อนรับ", "icon": "🛎️", "act": "hotel", "face": "back"}, {"id": "cafe", "x": 1327, "y": 345, "label": "คาเฟ่ล็อบบี้", "icon": "☕", "act": "shop", "shop": "cafe"}], "spawns": {"door": [580, 555]}}, "conv_in": {"name": "ร้านสะดวกซื้อใบเตย", "bg": "scenes/conv_in", "floorMask": "masks/conv_in.png", "W": 1448, "H": 1086, "ch": 185, "walk": [], "obs": [], "occ": [], "props": [], "spots": [{"id": "door", "x": 362, "y": 650, "label": "ออกไปที่ถนน", "icon": "🚪", "act": "go", "to": "street", "at": "super"}, {"id": "counter", "x": 420, "y": 585, "label": "แคชเชียร์ / สมัครงานรายกะ", "icon": "🧾", "act": "shop", "shop": "conv", "face": "back"}, {"id": "shelf", "x": 700, "y": 735, "label": "ชั้นขนมและของใช้", "icon": "🥫", "act": "shop", "shop": "conv", "face": "back"}, {"id": "fridge", "x": 935, "y": 420, "label": "ตู้แช่เครื่องดื่ม", "icon": "🧃", "act": "shop", "shop": "conv", "face": "back"}], "spawns": {"door": [380, 630]}, "shop": "conv"}, "rest_in": {"name": "ร้านอาหารทะเลสีคราม", "bg": "scenes/rest_in", "floorMask": "masks/rest_in.png", "W": 1448, "H": 1086, "ch": 180, "walk": [], "obs": [], "occ": [], "props": [], "spots": [{"id": "door", "x": 800, "y": 985, "label": "ออกไปที่ถนน", "icon": "🚪", "act": "go", "to": "street", "at": "rest"}, {"id": "host", "x": 550, "y": 635, "label": "สั่งอาหาร / สมัครพาร์ตไทม์", "icon": "🍽️", "act": "shop", "shop": "cafe"}, {"id": "kitchen", "x": 933, "y": 485, "label": "ครัวเปิด (ดูเชฟทำอาหาร)", "icon": "🍳", "act": "shop", "shop": "cafe", "face": "back"}], "spawns": {"door": [800, 955]}, "shop": "cafe", "seats": [[667, 650, 702], [842, 595, 643]]}, "hg_in": {"name": "ร้านเฟอร์นิเจอร์และของแต่งบ้าน (ในห้าง)", "bg": "scenes/hg_in", "floorMask": "masks/hg_in.png", "W": 1448, "H": 1086, "ch": 190, "walk": [], "obs": [], "occ": [], "props": [], "spots": [{"id": "door", "x": 470, "y": 650, "label": "กลับไปที่ทางเดินห้าง", "icon": "🚪", "act": "go", "to": "mall", "at": null}, {"id": "counter", "x": 867, "y": 420, "label": "เคาน์เตอร์ / สั่งเฟอร์นิเจอร์", "icon": "🧾", "act": "shop", "shop": "general", "face": "back"}, {"id": "shelf", "x": 385, "y": 560, "label": "ชั้นของใช้ในครัว", "icon": "🍲", "act": "shop", "shop": "general", "face": "back"}], "spawns": {"door": [480, 625]}, "shop": "general"}, "cafe_in": {"name": "คาเฟ่ใบเขียว", "bg": "scenes/cafe_in", "floorMask": "masks/cafe_in.png", "W": 1448, "H": 1086, "ch": 195, "walk": [], "obs": [], "occ": [], "props": [], "spots": [{"id": "door", "x": 510, "y": 1000, "label": "ออกไปที่ถนน", "icon": "🚪", "act": "go", "to": "street", "at": "cafe"}, {"id": "counter", "x": 700, "y": 485, "label": "สั่งเครื่องดื่ม / ขนม", "icon": "☕", "act": "shop", "shop": "coffee", "face": "back"}], "spawns": {"door": [510, 975]}, "shop": "coffee", "seats": [[617, 560, 620], [883, 690, 757]]}, "moto_in": {"name": "Moto Hub ร้านมอเตอร์ไซค์", "bg": "scenes/moto_in", "floorMask": "masks/moto_in.png", "W": 1536, "H": 1024, "ch": 160, "walk": [], "obs": [], "occ": [], "props": [], "spots": [{"id": "door", "x": 425, "y": 658, "label": "ออกไปที่ถนน", "icon": "🚪", "act": "go", "to": "street", "at": "moto"}, {"id": "desk", "x": 500, "y": 420, "label": "ฝ่ายขาย (สกู๊ตเตอร์/บิ๊กไบค์)", "icon": "🛵", "act": "shop", "shop": "moto", "face": "back"}, {"id": "bikes", "x": 933, "y": 555, "label": "ชมบิ๊กไบค์", "icon": "🏍️", "act": "shop", "shop": "moto"}, {"id": "service", "x": 1267, "y": 455, "label": "ศูนย์บริการ / ซ่อมรถ", "icon": "🔧", "act": "garage", "face": "back"}], "spawns": {"door": [440, 640]}, "shop": "moto", "seats": [[1192, 742, 811]]}, "elec_in": {"name": "ร้านเครื่องใช้ไฟฟ้า (ในห้าง)", "bg": "scenes/elec_in", "floorMask": "masks/elec_in.png", "W": 1672, "H": 941, "ch": 150, "walk": [], "obs": [], "occ": [], "props": [], "spots": [{"id": "door", "x": 1233, "y": 617, "label": "กลับไปที่ทางเดินห้าง", "icon": "🚪", "act": "go", "to": "mall", "at": null}, {"id": "counter", "x": 1267, "y": 520, "label": "เคาน์เตอร์ชำระเงิน", "icon": "🧾", "act": "shop", "shop": "elec", "face": "back"}, {"id": "laptops", "x": 800, "y": 760, "label": "โซนแล็ปท็อป", "icon": "💻", "act": "shop", "shop": "elec", "face": "back"}, {"id": "tv", "x": 420, "y": 520, "label": "โซนทีวี", "icon": "📺", "act": "shop", "shop": "elec", "face": "back"}], "spawns": {"door": [1215, 600]}, "shop": "elec"}, "clothes_in": {"name": "ร้านเสื้อผ้าและกระเป๋า (ในห้าง)", "bg": "scenes/clothes_in", "floorMask": "masks/clothes_in.png", "W": 1672, "H": 941, "ch": 150, "walk": [], "obs": [], "occ": [], "props": [], "spots": [{"id": "door", "x": 500, "y": 455, "label": "กลับไปที่ทางเดินห้าง", "icon": "🚪", "act": "go", "to": "mall", "at": null}, {"id": "counter", "x": 1083, "y": 392, "label": "เคาน์เตอร์ / ซื้อสินค้า", "icon": "🛍️", "act": "shop", "shop": "clothes", "face": "back"}, {"id": "rack", "x": 1150, "y": 720, "label": "ราวเสื้อผ้า", "icon": "👕", "act": "shop", "shop": "clothes", "face": "back"}], "spawns": {"door": [515, 440]}, "shop": "clothes"}, "home_out": {"name": "หน้าบ้านของฉัน", "bg": "scenes/home_out", "W": 1536, "H": 1024, "ch": 105, "outdoor": true, "walk": [[[688, 500], [862, 490], [1100, 468], [1150, 492], [1260, 545], [1240, 556], [1150, 578], [1000, 612], [905, 638], [830, 665], [770, 640], [740, 600], [705, 600]], [[445, 935], [1300, 668], [1536, 628], [1536, 668], [1300, 712], [470, 992]], [[1150, 492], [1380, 515], [1470, 590], [1460, 650], [1345, 668], [1340, 600], [1300, 570], [1260, 545]]], "obs": [], "occ": [], "props": [], "spots": [{"id": "door", "x": 745, "y": 518, "label": "เข้าบ้าน (บ้านของฉัน)", "icon": "🏠", "act": "go", "to": "home_in", "at": "door"}, {"id": "street", "x": 900, "y": 835, "label": "ออกไปที่ถนน (ย่านไลฟ์สไตล์)", "icon": "🛣️", "act": "go", "to": "street", "at": "home"}, {"id": "map", "x": 1250, "y": 727, "label": "ป้ายรถเมล์ (แผนที่เมือง)", "icon": "🚏", "act": "map"}], "spawns": {"door": [760, 545], "street": [910, 825], "city": [910, 825]}}};
  const CITY = [{"id": "home", "name": "บ้านของฉัน (หมู่บ้านจัดสรร)", "x": 190, "y": 668, "icon": "🏠", "scene": "home_out", "spawn": "city"}, {"id": "super", "name": "ร้านสะดวกซื้อ", "x": 1112, "y": 515, "icon": "🛒", "scene": "street", "spawn": "super", "shop": "conv"}, {"id": "clinic", "name": "คลินิกและร้านยา", "x": 1290, "y": 560, "icon": "💊", "scene": "street", "spawn": "clinic", "shop": "pharm"}, {"id": "cars", "name": "โชว์รูมรถยนต์ (ย่านธุรกิจ)", "x": 1105, "y": 160, "icon": "🚘", "scene": "street", "spawn": "cars", "shop": "cars"}, {"id": "moto", "name": "Moto Hub", "x": 1530, "y": 580, "icon": "🛵", "scene": "street", "spawn": "moto", "shop": "moto"}, {"id": "park", "name": "สวนสาธารณะ", "x": 260, "y": 100, "icon": "🌳", "scene": "street", "spawn": "park"}, {"id": "rest", "name": "ร้านอาหาร / คาเฟ่", "x": 950, "y": 640, "icon": "🍝", "scene": "street", "spawn": "rest", "shop": null}, {"id": "hotel", "name": "โรงแรม / รีสอร์ท", "x": 190, "y": 485, "icon": "🏨", "scene": "street", "spawn": "hotel"}, {"id": "mall", "name": "ห้างสรรพสินค้า", "x": 820, "y": 200, "icon": "🏬", "scene": "street", "spawn": "mall"}, {"id": "hosp", "name": "โรงพยาบาล", "x": 240, "y": 270, "icon": "🏥", "scene": "street", "spawn": "hosp"}, {"id": "office", "name": "ออฟฟิศ", "x": 890, "y": 435, "icon": "🏢", "scene": "office", "spawn": "city", "hours": [7, 19]}, {"id": "beach", "name": "ชายหาด / รีสอร์ท", "x": 1385, "y": 715, "icon": "🏖️", "scene": "street", "park": true, "spawn": "map"}, {"id": "police", "name": "สถานีตำรวจ", "x": 1310, "y": 375, "icon": "👮", "scene": "street", "spawn": "map", "park": true}, {"id": "bank", "name": "ธนาคาร", "x": 748, "y": 518, "icon": "🏦", "scene": "street", "spawn": "map", "park": true, "hours": [8, 17]}, {"id": "airport", "name": "สนามบิน", "x": 1520, "y": 110, "icon": "✈️", "scene": "street", "spawn": "map", "park": true}, {"id": "school", "name": "โรงเรียน (อยู่ระหว่างพัฒนา)", "x": 430, "y": 377, "icon": "🎓", "scene": "street", "spawn": "map", "park": true, "dev": true}, {"id": "gym", "name": "ฟิตเนส (อยู่ระหว่างพัฒนา)", "x": 1080, "y": 402, "icon": "🏋️", "scene": "street", "spawn": "map", "park": true, "dev": true}, {"id": "cinema", "name": "โรงภาพยนตร์ (อยู่ระหว่างพัฒนา)", "x": 1005, "y": 258, "icon": "🎬", "scene": "street", "spawn": "map", "park": true, "dev": true}, {"id": "fire", "name": "สถานีดับเพลิง (อยู่ระหว่างพัฒนา)", "x": 1490, "y": 455, "icon": "🚒", "scene": "street", "spawn": "map", "park": true, "dev": true}, {"id": "condo", "name": "คอนโดมิเนียม (อยู่ระหว่างพัฒนา)", "x": 450, "y": 578, "icon": "🏢", "scene": "street", "spawn": "map", "park": true, "dev": true}, {"id": "port", "name": "ท่าเรือ (อยู่ระหว่างพัฒนา)", "x": 1560, "y": 320, "icon": "⚓", "scene": "street", "spawn": "map", "park": true, "dev": true}];
  return {
    TRAITS, OUTFITS, FURN_TYPES, TIERS, FURN_BASE_PRICE, ITEMS, SHOPS, CARS, JOBS, FREELANCE_GIGS, SKILLS, STOCKS, PROPERTIES, BUSINESSES, BIZ_UPGRADES, STAFF_POOL,
    NPCS, SPARE_CIDS, PLAYABLE, CAREERS, HOME_LAYOUT, HOME_LAYOUT_V3, LINES, EVENTS, GOALS, SCENES, CITY,
    RENT: 6500, UTIL: 1300, PHONE_BILL: 399, START: { cash: 2500, bank: 18000, savings: 0, loan: 45000 }
  };
})();
