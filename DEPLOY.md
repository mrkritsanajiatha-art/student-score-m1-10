# 🚀 คู่มือ Deploy ฉบับละเอียด (ทำตามทีละขั้น)

มี 2 ส่วนที่ต้อง Deploy: **Backend (Google Apps Script)** และ **Frontend (GitHub Pages)**
ทำ Backend ให้เสร็จก่อน เพราะต้องเอา URL ไปใส่ใน Frontend

---

## 🟦 ส่วนที่ 1 — Backend: Google Apps Script + Google Sheets

### 1.1 เปิด Apps Script
1. เปิด Google Sheet ของคุณ
   👉 https://docs.google.com/spreadsheets/d/1owVljsBI0y4qAiT5KPQKiDqV8KEAdbpqbo53XkmmsEs/edit
2. เมนูด้านบน **Extensions (ส่วนขยาย) → Apps Script**

### 1.2 วางโค้ด
3. ในตัวแก้ไข จะมีไฟล์ `Code.gs` อยู่แล้ว → ลบโค้ดเดิม แล้ววางเนื้อหาจาก `backend/Code.gs`
4. กดปุ่ม **+ (Add a file) → Script** ตั้งชื่อ `ImportStudents` แล้ววางเนื้อหาจาก `backend/ImportStudents.gs`
5. กด 💾 บันทึก (Ctrl+S)

### 1.3 แก้รายชื่อนักเรียน (ถ้ามีรายชื่อจริง)
6. เปิดไฟล์ `ImportStudents.gs` แก้ตัวแปร `STUDENT_LIST` ให้เป็นข้อมูลจริง
   รูปแบบ: `[เลขที่, 'รหัสนักเรียน', 'ชื่อ-สกุล']`
   *(ถ้ายังไม่มีข้อมูลจริง ข้ามได้ ระบบมีตัวอย่าง 35 คนให้แล้ว)*

### 1.4 สร้างชีต + นำเข้านักเรียน
7. ที่แถบเลือกฟังก์ชันด้านบน เลือก **`setupAndImport`** → กด **Run (▶)**
8. ครั้งแรกจะมีหน้าต่าง **Authorization required** → Review permissions → เลือกบัญชี → Advanced → Go to project (unsafe) → **Allow**
9. กลับไปดูที่ Google Sheet จะมี
   - `Sheet1`: เลขที่ | รหัสนักเรียน | ชื่อ-สกุล | คะแนน(100) | QR_ID(uuid)
   - `History`: หัวตารางครบ 9 คอลัมน์

### 1.5 Deploy เป็น Web App
10. มุมขวาบน กด **Deploy → New deployment**
11. ไอคอนเฟือง ⚙ → เลือก **Web app**
12. ตั้งค่า:
    - **Description:** score-api
    - **Execute as:** Me (อีเมลคุณ)
    - **Who has access:** **Anyone**  ⚠️ ต้องเป็น Anyone เพื่อให้เว็บเรียกได้
13. กด **Deploy** → Authorize (ถ้าถาม) → คัดลอก **Web app URL**
    (หน้าตา: `https://script.google.com/macros/s/AKfycb.../exec`)

> 🔁 **ทุกครั้งที่แก้ Code.gs** ต้อง **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**
> มิฉะนั้นโค้ดใหม่จะยังไม่มีผล (URL เดิมใช้ต่อได้)

### 1.6 ทดสอบ API
14. เปิด URL นี้ในเบราว์เซอร์:
    `<WEB_APP_URL>?action=ping` → ควรได้ `{"success":true,"message":"pong",...}`
    `<WEB_APP_URL>?action=students` → ควรได้รายชื่อนักเรียน

---

## 🟩 ส่วนที่ 2 — Frontend: GitHub Pages

### 2.1 ตั้งค่า API URL
1. เปิดไฟล์ `js/config.js`
2. วาง Web App URL ลงใน `API_URL` และแก้ชื่อโรงเรียน:
   ```js
   const CONFIG = {
     API_URL: 'https://script.google.com/macros/s/AKfycb.../exec',
     SCHOOL_NAME: 'โรงเรียนของฉัน',
     CLASS_NAME: 'ชั้นมัธยมศึกษาปีที่ 1/10',
     ...
   };
   ```

### 2.2 Push ขึ้น GitHub
มี 2 วิธี — เลือกวิธีใดก็ได้

**วิธี A: ผ่านเว็บ GitHub (ง่ายสุด ไม่ต้องลงโปรแกรม)**
1. ไป https://github.com/new → สร้าง repo เช่น `student-score` → Create
2. หน้า repo → **Add file → Upload files** → ลากไฟล์ทั้งหมดในโฟลเดอร์นี้ขึ้นไป
   (รวม `.nojekyll`, โฟลเดอร์ `css/`, `js/`, `assets/`, ไฟล์ `.html`)
3. กด **Commit changes**

**วิธี B: ผ่าน Git (Command Line)**
```bash
cd "D:\ระบบเก็บคะแนน ม.1.10"
git init
git add .
git commit -m "Student Score Management System"
git branch -M main
git remote add origin https://github.com/<USERNAME>/student-score.git
git push -u origin main
```

### 2.3 เปิด GitHub Pages
1. ที่ repo → **Settings → Pages**
2. **Source:** Deploy from a branch
3. **Branch:** `main` / folder: `/ (root)` → **Save**
4. รอ ~1 นาที จะได้ลิงก์: `https://<USERNAME>.github.io/student-score/`

### 2.4 ทดสอบใช้งานจริง
- เปิดลิงก์ → หน้าค้นหา → พิมพ์ `1` หรือ `29601` → คลิกชื่อ → เห็น QR Code
- ไปหน้า **แอดมิน** → Login `kimzabig11 / kimzabig11`
- แท็บ **สแกน QR** → กดเริ่มสแกน (มือถือจะขอสิทธิ์กล้อง → Allow)
  - ⚠️ กล้องทำงานเฉพาะบน **HTTPS** ซึ่ง GitHub Pages เป็น HTTPS อยู่แล้ว ✅

---

## ❓ แก้ปัญหาที่พบบ่อย

| อาการ | สาเหตุ / วิธีแก้ |
|-------|-----------------|
| เว็บขึ้น "ยังไม่ได้ตั้งค่า API" | ยังไม่วาง `API_URL` ใน `js/config.js` |
| ค้นหาแล้วไม่มีข้อมูล | ยังไม่ได้รัน `setupAndImport` หรือ Web App access ไม่ใช่ Anyone |
| กล้องไม่เปิด | ต้องเปิดผ่าน HTTPS (GitHub Pages) และกด Allow สิทธิ์กล้อง |
| แก้ Code.gs แล้วไม่อัปเดต | ต้อง Deploy เวอร์ชันใหม่ (Manage deployments → New version) |
| Login ไม่ผ่าน | ตรวจ `ADMIN_USERNAME/PASSWORD` ใน Code.gs และ Deploy ใหม่ |
| CSS/JS โหลดไม่ขึ้นบน Pages | ตรวจว่าอัปโหลดไฟล์ `.nojekyll` และโฟลเดอร์ `css/ js/` ครบ |
