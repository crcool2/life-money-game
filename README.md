# เกมส์ชีวิตและการเงิน (Life Money Game)

เกมจำลองชีวิตและการเงินแบบ 2.5D Isometric บนเว็บ ใช้ชีวิตในเมือง ทำงาน ออมเงิน ลงทุน เปิดธุรกิจ แต่งบ้าน และสร้างความสัมพันธ์ เล่นได้ทั้งมือถือและคอมพิวเตอร์

> เงิน หุ้น และการลงทุนทั้งหมดเป็นเงินจำลองในเกมเท่านั้น

## เล่นบนเครื่อง
```bash
python3 -m http.server 8765
# เปิด http://localhost:8765/index.html
```

## สร้างไฟล์เดียวสำหรับแจก
```bash
python3 tools/build_standalone.py   # ได้ dist/life-money-game.html และ .zip
```

## สำหรับนักพัฒนาและ AI
- อ่าน [AGENTS.md](AGENTS.md) ก่อนเริ่ม (Codex อ่านไฟล์นี้อัตโนมัติ, Claude อ่าน CLAUDE.md ที่เนื้อหาเดียวกัน)
- งานที่รอทำอยู่ใน [ROADMAP.md](ROADMAP.md)
- เทคโนโลยี: HTML + CSS + Vanilla JavaScript + Canvas 2D ไม่มี dependency

© Dream AI Games by CR
