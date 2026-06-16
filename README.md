# ⚛️ PhysicsClassroom — ห้องเรียนฟิสิกส์ออนไลน์

เว็บแอปสตรีมวีดีโอสอนฟิสิกส์จาก Google Drive อาจารย์สร้างห้องเรียน เพิ่มวีดีโอ
แล้วแชร์รหัส/ลิงก์ให้นักเรียนเข้าดูได้ทันที พร้อมเครื่องเล่นวีดีโอแบบมืออาชีพ
(ปรับความเร็ว เลื่อนไป-กลับ เล่นต่อจากที่ค้างไว้ เต็มจอ Picture-in-Picture)

## ✨ ฟีเจอร์
- 🔐 ระบบอาจารย์: สร้าง / **แก้ไข** / ลบห้องเรียน, เพิ่ม / **แก้ไข** / ลบ / **จัดลำดับ** วีดีโอ
- 🎓 นักเรียนเข้าด้วยรหัส 6 หลักหรือลิงก์ตรง ไม่ต้องสมัครสมาชิก
- 🎬 เครื่องเล่นเอง: ปรับความเร็ว 0.25x–2x, เลื่อน ±10/30 วินาที, แตะสองครั้งเพื่อข้าม (มือถือ),
  จำระดับเสียง/ความเร็ว, **เล่นต่อจากจุดที่ดูค้างไว้**, ปุ่มบทก่อนหน้า/ถัดไป, ปุ่มลัดคีย์บอร์ด
- 📱 รองรับมือถือเต็มรูปแบบ (รวมเต็มจอบน iPhone) และติดตั้งเป็น PWA ได้

## 🛠️ การพัฒนา (Development)
```bash
npm install
npm run dev      # รัน server (3000) + client (5173) พร้อมกัน
```
เปิด http://localhost:5173

## 🚀 รันแบบใช้งานจริง (Production)
```bash
npm install
npm run build    # สร้างไฟล์ frontend ลงโฟลเดอร์ dist/
npm start        # เซิร์ฟเวอร์เสิร์ฟทั้ง API และหน้าเว็บที่พอร์ต 3000
```
เปิด http://localhost:3000

> ตั้งรหัสผ่านอาจารย์เองได้: คัดลอก `.env.example` เป็น `.env` แล้วแก้ `ADMIN_PASSWORD`
> (ค่าเริ่มต้นคือ `physics2026`)

## 📱 เปิดบนมือถือในเครือข่าย Wi-Fi เดียวกัน
1. รัน `npm run build` แล้ว `npm start` บนคอมพิวเตอร์
2. ให้มือถือเชื่อม Wi-Fi วงเดียวกับคอมพิวเตอร์
3. เปิดเบราว์เซอร์บนมือถือไปที่ **http://192.168.1.132:3000**
   (เลข IP นี้คือของเครื่องนี้ ถ้า IP เปลี่ยนให้ดูด้วยคำสั่ง `ipconfig`)
4. หากเปิดไม่ได้ ให้อนุญาต Windows Firewall สำหรับ Node.js พอร์ต 3000
   (รัน PowerShell แบบ Administrator):
   ```powershell
   New-NetFirewallRule -DisplayName "PhysicsClassroom" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
   ```

## ☁️ Deploy ขึ้นคลาวด์ (เข้าจากที่ไหนก็ได้)
ดันโค้ดขึ้น GitHub ก่อน จากนั้นเลือกวิธีใดวิธีหนึ่ง:

- **Render** (ฟรี): New → Blueprint → เลือก repo นี้ (อ่านค่าจาก `render.yaml` อัตโนมัติ)
  อย่าลืมตั้งค่า `ADMIN_PASSWORD` ในแดชบอร์ด
- **Railway / Fly.io / Cloud Run**: ใช้ `Dockerfile` ที่ให้มาได้เลย
- ทุกแพลตฟอร์มจะตั้ง `PORT` ให้เอง — โค้ดอ่านจาก `process.env.PORT` แล้ว

### 💾 เก็บข้อมูลถาวรด้วย MongoDB (แนะนำสำหรับแพลนฟรี)
ค่าเริ่มต้นเก็บเป็นไฟล์ JSON ซึ่ง**หายเมื่อรีสตาร์ท/redeploy** บนโฮสต์ฟรี
เพื่อให้ข้อมูลอยู่ถาวร ใช้ MongoDB Atlas (ฟรี) แล้วตั้ง env var:

| Key | Value |
|-----|-------|
| `MONGODB_URI` | connection string จาก Atlas เช่น `mongodb+srv://user:pass@cluster.xxxx.mongodb.net/` |
| `MONGODB_DB` | (ไม่บังคับ) ชื่อฐานข้อมูล ค่าเริ่มต้น `physics_classroom` |

วิธีได้ connection string ฟรีจาก Atlas:
1. สมัคร https://www.mongodb.com/cloud/atlas/register
2. สร้าง **Free (M0)** cluster
3. **Database Access** → สร้าง user + รหัสผ่าน
4. **Network Access** → Add IP → **Allow access from anywhere (0.0.0.0/0)**
   (จำเป็น เพราะ IP ของ Render ไม่คงที่)
5. **Connect → Drivers** → คัดลอก connection string แล้วแทน `<password>` ด้วยรหัสจริง
6. นำไปใส่เป็น `MONGODB_URI` ในแดชบอร์ด Render → Environment → Save (Render จะ redeploy ให้)

เมื่อตั้งค่าแล้ว ระบบจะเก็บข้อมูลลง MongoDB อัตโนมัติ และ seed ห้องตัวอย่างให้ครั้งแรก

## 📋 ข้อกำหนดวีดีโอจาก Google Drive
ไฟล์วีดีโอใน Google Drive ต้องตั้งการแชร์เป็น **"ทุกคนที่มีลิงก์ (Anyone with the link)"**
ระบบจะดึง File ID จากลิงก์ให้อัตโนมัติเมื่อวางลิงก์เต็ม เช่น
`https://drive.google.com/file/d/`**`FILE_ID`**`/view`
