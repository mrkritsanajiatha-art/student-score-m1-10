# 📚 ระบบเก็บคะแนนนักเรียน (Student Score Management System)

ระบบเก็บคะแนนพฤติกรรม/ความดีของนักเรียน คะแนนเต็ม 100 คะแนน
รองรับการสแกน QR Code เพิ่ม/ลดคะแนนแบบเรียลไทม์ ผ่านมือถือทุกระบบ

- **Frontend:** HTML5 + Bootstrap 5 + SweetAlert2 + Chart.js + Html5Qrcode + QRCode.js → Deploy บน **GitHub Pages**
- **Backend:** Google Apps Script (REST API) → Deploy เป็น **Web App**
- **Database:** Google Sheets (`Sheet1` + `History`)

---

## 📁 โครงสร้างไฟล์

```
ระบบเก็บคะแนน ม.1.10/
├── index.html            # หน้าค้นหานักเรียน (สาธารณะ)
├── student.html          # หน้าโปรไฟล์นักเรียน (?id=29601)
├── leaderboard.html      # หน้าอันดับคะแนน
├── admin.html            # หน้าแอดมิน (Login/Dashboard/Scanner/Random/Reports)
├── .nojekyll             # ให้ GitHub Pages เสิร์ฟโฟลเดอร์ js/ css/ ได้ถูกต้อง
├── css/style.css         # ธีม Glassmorphism + Dark Mode
├── js/
│   ├── config.js         # ⚙️ ตั้งค่า API_URL ที่นี่
│   ├── api.js            # ชั้นเชื่อมต่อ API
│   ├── common.js         # ฟังก์ชันร่วม (ธีม/Token/Toast)
│   ├── student-card.js   # การ์ดนักเรียน + QR (ใช้ร่วมกัน)
│   ├── index.js          # หน้าค้นหา
│   ├── student.js        # หน้าโปรไฟล์
│   ├── leaderboard.js    # หน้าอันดับ
│   ├── qr.js             # ดาวน์โหลด/แชร์/พิมพ์/เต็มจอ/บัตร QR
│   └── admin.js          # ตรรกะหน้าแอดมินทั้งหมด
├── assets/logo.svg
└── backend/
    ├── Code.gs           # REST API หลัก
    └── ImportStudents.gs # สคริปต์นำเข้านักเรียน 35 คน
```

---

## 🚀 ขั้นตอนการติดตั้ง (อ่าน DEPLOY.md สำหรับฉบับละเอียด)

### ส่วนที่ 1 — Backend (Google Apps Script)

1. เปิด Google Sheet ของคุณ (Spreadsheet ID: `1owVljsBI0y4qAiT5KPQKiDqV8KEAdbpqbo53XkmmsEs`)
2. เมนู **Extensions → Apps Script**
3. คัดลอกเนื้อหา `backend/Code.gs` และ `backend/ImportStudents.gs` ไปวาง (สร้าง 2 ไฟล์)
4. รันฟังก์ชัน **`setupAndImport`** หนึ่งครั้ง (สร้างชีต + นำเข้านักเรียน 35 คน คะแนนเริ่มต้น 100)
   - ครั้งแรกจะมีหน้าต่างขออนุญาต → กด Allow
5. กด **Deploy → New deployment → เลือก Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. คัดลอก **Web app URL** (ลงท้ายด้วย `/exec`)

### ส่วนที่ 2 — Frontend (GitHub Pages)

1. เปิดไฟล์ `js/config.js` แล้ววาง URL ที่ได้ลงในตัวแปร `API_URL`
   ```js
   API_URL: 'https://script.google.com/macros/s/XXXX/exec',
   ```
2. แก้ `SCHOOL_NAME` / `CLASS_NAME` ตามต้องการ
3. สร้าง GitHub Repository แล้ว push โค้ดทั้งหมด (ดู DEPLOY.md)
4. Settings → Pages → Source: `main` / root → Save
5. เปิดเว็บได้ที่ `https://<username>.github.io/<repo>/`

---

## 🔐 บัญชีแอดมิน

| Username | Password |
|----------|----------|
| kimzabig11 | kimzabig11 |

> Username/Password เก็บไว้ใน `Code.gs` (Backend) เท่านั้น — ไม่อยู่ใน Frontend
> เปลี่ยนรหัสได้ที่ค่า `ADMIN_USERNAME` / `ADMIN_PASSWORD` ใน `Code.gs`

---

## ✨ ฟีเจอร์

- 🔍 ค้นหานักเรียน (เลขที่/รหัส/ชื่อ/นามสกุล) — ไม่ต้องล็อกอิน
- 🧾 QR Code ส่วนตัว: ดาวน์โหลด PNG / บันทึก / แชร์ / พิมพ์ / เต็มจอ
- 🎫 บัตรนักเรียน (QR Card) ดาวน์โหลด PNG / PDF (A4)
- 🏆 อันดับคะแนน (Gold/Silver/Bronze) + ค้นหา/กรอง/เรียง
- 📊 แดชบอร์ดแอดมิน: การ์ดสถิติ + กราฟ Chart.js + กิจกรรมล่าสุด
- 📷 สแกน QR ด้วยกล้อง (Android/iPhone/iPad/Desktop) เพิ่ม/ลดคะแนนทันที
- 🎯 สุ่มนักเรียน (Animation) + ให้คะแนนได้ทันที
- 📄 รายงาน Export Excel / PDF / พิมพ์
- 🌙 Dark Mode + Responsive (Mobile First)
- 🔒 Session Token + Auto Logout + Protected Route + Rate Limiting

---

## ⚙️ กฎคะแนน
- คะแนนเต็ม **100**, ต่ำสุด **0** (ระบบบีบค่าอัตโนมัติ ไม่เกิน/ไม่ติดลบ)
- นักเรียนใหม่ที่ยังไม่มีคะแนน = ตั้งต้น **100** อัตโนมัติ
- ทุกการเปลี่ยนแปลงบันทึกลงชีต `History` พร้อมเวลา `dd/MM/yyyy HH:mm:ss`
