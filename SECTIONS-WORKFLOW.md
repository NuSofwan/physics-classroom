# Workflow: จัดวีดีโอเป็น "หมวด/บท" (Sections) ในคอร์ส

> เอกสารนี้เขียนให้ Sonnet (หรือ dev คนถัดไป) ทำต่อแบบทีละเฟส
> ทุกเฟสมี "เกณฑ์ผ่าน (Done check)" ให้ยืนยันก่อนไปเฟสถัดไป

## เป้าหมาย
ตอนนี้วีดีโอในคอร์สเป็น **list แบน** เรียงด้วย `order_index` อย่างเดียว พอวีดีโอเยอะ
นักเรียนต้องเลื่อนหานาน เราจะเพิ่มชั้น "หมวด/บท" (section) คั่นกลางระหว่างคอร์สกับวีดีโอ
เพื่อให้นักเรียนเห็นภาพรวมเป็นบท (พับ/เปิดได้) และแอดมินจัดระเบียบได้ง่าย

## การตัดสินใจที่ล็อกแล้ว (จากการคุยกับเจ้าของโปรเจกต์)
1. **โครงสร้าง:** หมวด/บท **ระดับเดียว** (ไม่ซ้อนโฟลเดอร์หลายชั้น) — เหมือนบทเรียนใน Udemy
2. **การเรียงในหมวด:** สลับได้ต่อหมวด → `sort_mode` = `'date'` (ค่าเริ่มต้น) หรือ `'manual'` (ลากเรียงเอง)
3. **วันที่ที่ใช้เรียง:** ใช้ `created_at` ที่มีอยู่แล้ว (ไม่เพิ่มฟิลด์ใหม่)
4. **วิธีย้ายวีดีโอเข้าหมวด:** เฟสแรกทำ **ติ๊กเลือกหลายอัน + ดรอปดาวน์ "ย้ายไปหมวด"** ก่อน,
   แล้วค่อยเพิ่ม **ลากวาง (drag-drop)** เป็นเฟสเสริมทีหลัง

## หลักการสำคัญ (อ่านก่อนเริ่ม)
- **มี 2 backend ต้องแก้คู่กันเสมอ:** `fileBackend` (JSON ตอน dev) และ `makeMongoBackend` (prod)
  ใน [server/db.js](server/db.js) — เพิ่ม method ใหม่ต้องทำทั้งสองฝั่ง + เพิ่มใน proxy `db` ท้ายไฟล์
- **เข้ากันได้กับข้อมูลเดิม (ไม่ต้อง migrate):** วีดีโอที่ `section_id` เป็น `null`/ไม่มี = กลุ่ม "ทั่วไป"
  แสดงเป็นหมวดพิเศษบนสุดเสมอ คอร์สเดิมที่ยังไม่จัดหมวดต้องใช้งานได้เหมือนเดิม 100%
- **ระวัง bug listener ซ้ำ:** ดูคอมเมนต์ใน [admin-classroom.js:103-106](src/pages/admin-classroom.js) —
  ปุ่มใน modal/element ที่อยู่นอกฟังก์ชัน re-render ต้องผูก listener **ครั้งเดียว** อย่าผูกซ้ำใน loader
- รัน dev ด้วย `npm run dev` (ไม่มี `MONGODB_URI` = ใช้ไฟล์ JSON) ทดสอบให้ครบก่อน deploy

---

## Data model

### sections (collection / array ใหม่)
```js
{
  id: uuid,
  classroom_id: uuid,
  name: string,
  order_index: number,          // ลำดับของหมวดภายในคอร์ส (1, 2, 3, ...)
  sort_mode: 'date' | 'manual', // ค่าเริ่มต้น 'date'
  created_at: ISOString,
  updated_at: ISOString,
}
```

### video (เพิ่มฟิลด์)
- `section_id: string | null` — `null` = ยังไม่จัดหมวด (กลุ่ม "ทั่วไป")
- `order_index` เดิมยังอยู่ → ตีความใหม่เป็น "ลำดับภายในหมวด" ใช้เมื่อ `sort_mode === 'manual'`

### ไฟล์ JSON
ใน [data/physics-classroom.json](data/physics-classroom.json) เพิ่ม top-level key `"sections": []`
และแก้ `defaultData` ใน [server/db.js:15](server/db.js) เป็น
`const defaultData = { classrooms: [], videos: [], sections: [] };`

---

## Phase 1 — Backend: db.js methods (file + mongo)

ไฟล์: [server/db.js](server/db.js)

เพิ่ม method ต่อไปนี้ใน **ทั้ง** `fileBackend` และ `makeMongoBackend` และเพิ่มใน proxy `db` ท้ายไฟล์:

| method | หน้าที่ |
|---|---|
| `getSectionsByClassroom(classroomId)` | คืน sections ของคอร์ส เรียงตาม `order_index` แล้วตาม `created_at` |
| `getSectionById(id)` | คืน section เดียว หรือ `null` |
| `createSection(section)` | เพิ่ม section |
| `updateSection(id, updates)` | แก้ name/sort_mode/order_index + เซ็ต `updated_at` |
| `deleteSection(id)` | ลบ section **และ** เซ็ต `section_id = null` ให้วีดีโอที่อยู่ในหมวดนั้น |
| `getMaxSectionOrder(classroomId)` | คืนค่า `order_index` สูงสุดของ section ในคอร์ส (ไม่มี = 0) |
| `getMaxVideoOrderInSection(classroomId, sectionId)` | ค่า `order_index` สูงสุดของวีดีโอใน section (สำหรับ append ตอน manual) |

แนวทาง implement (ยึดรูปแบบเดิมของไฟล์):
- **fileBackend:** `loadData()` → กรอง/แก้ array `data.sections` / `data.videos` → `saveData(data)`
  - `deleteSection`: `data.sections = data.sections.filter(s => s.id !== id)` แล้ว
    `data.videos = data.videos.map(v => v.section_id === id ? { ...v, section_id: null } : v)`
- **mongo:** เพิ่ม `const sectionsCol = database.collection('sections');` ใน `makeMongoBackend`
  - `deleteSection`: `await sectionsCol.deleteOne({ id })` แล้ว
    `await videosCol.updateMany({ section_id: id }, { $set: { section_id: null } })`
  - ใช้ `strip` ({ projection: { _id: 0 } }) เหมือน method อื่น
- **proxy `db` ท้ายไฟล์:** เพิ่มบรรทัด forward ของทุก method ใหม่ (เหมือนของ video)

> Mongo seed (db.js initDb): ของเดิม seed เฉพาะตอน DB ว่าง — ไม่ต้องแก้ logic seed
> แต่เพิ่มบรรทัด seed `sections` ถ้ามีใน JSON: `if (seed.sections?.length) await sectionsCol.insertMany(...)`

**Done check P1:** ไม่มี error ตอน import, `npm run dev:server` ขึ้นได้ปกติ

---

## Phase 2 — Backend: routes

### 2a. ไฟล์ใหม่ `server/routes/sections.js`
ยึดโครง [server/routes/classrooms.js](server/routes/classrooms.js) (import `Router`, `uuidv4`, `requireAdmin`, `db`)

| method + path | auth | body | ทำอะไร |
|---|---|---|---|
| `GET /classroom/:classroomId` | admin | — | คืน `{ sections }` |
| `POST /classroom/:classroomId` | admin | `{ name }` | สร้าง section: `order_index = getMaxSectionOrder + 1`, `sort_mode: 'date'` |
| `PUT /:id` | admin | `{ name?, sort_mode? }` | แก้ไข (validate `sort_mode ∈ {date,manual}`) |
| `DELETE /:id` | admin | — | ลบ (วีดีโอในหมวดกลับเป็น null) |
| `PUT /classroom/:classroomId/reorder` | admin | `{ order: [sectionId...] }` | เซ็ต `order_index = idx+1` ตามลำดับ array (ยึดรูปแบบ reorder ของวีดีโอ [videos.js:186-207](server/routes/videos.js)) |

### 2b. แก้ [server/routes/videos.js](server/routes/videos.js)
- `POST /classroom/:classroomId` (เพิ่มวีดีโอ): รับ `section_id` จาก body (optional) → เก็บลง video object
  (default `null`). ถ้ามี `section_id` ให้ `order_index = getMaxVideoOrderInSection + 1` แทน
- `PUT /:id` (แก้วีดีโอ): รองรับอัปเดต `section_id` (ระวัง: `section_id` ส่ง `null` ได้ ต้องไม่โดน
  `||` กลืน — ใช้เช็ก `req.body.section_id !== undefined`)
- **endpoint ใหม่** `PUT /classroom/:classroomId/move` (admin), body `{ videoIds: [], section_id }`:
  - ตรวจว่าทุก video อยู่ใน classroom นี้จริง
  - ถ้า `section_id` ไม่ใช่ null ต้องมี section นั้นจริง (และเป็นของคอร์สเดียวกัน)
  - เซ็ต `section_id` ให้ทุกตัว; ถ้าหมวดปลายทาง `sort_mode === 'manual'` ให้ไล่ append `order_index`
    ต่อท้าย (เริ่มจาก `getMaxVideoOrderInSection`)
  - คืน `{ videos: getVideosByClassroom(...) }`

### 2c. แก้ [server/routes/classrooms.js](server/routes/classrooms.js) — endpoint นักเรียน
`GET /code/:code` (public): เพิ่ม `sections` ลงใน response และส่ง `section_id` ของแต่ละวีดีโอออกไปด้วย
```js
const sections = await db.getSectionsByClassroom(classroom.id);
// ใน map ของ videos เพิ่ม: section_id: v.section_id ?? null
res.json({ classroom: {...}, sections, videos });
```

### 2d. mount route — [server/index.js](server/index.js)
```js
import sectionRoutes from './routes/sections.js';
app.use('/api/sections', sectionRoutes);   // วางก่อน app.use('/api', 404 handler)
```

**Done check P2:** ทดสอบด้วย curl/Postman (ใส่ `Authorization: Bearer <token>` จาก /api/auth):
สร้าง section → list ได้ → ย้ายวีดีโอเข้า → `GET /api/videos/classroom/:id` เห็น `section_id` เปลี่ยน →
ลบ section แล้ววีดีโอกลับเป็น `section_id: null`

---

## Phase 3 — Frontend: helper รวมการจัดกลุ่ม

ไฟล์: [src/utils.js](src/utils.js) — เพิ่มฟังก์ชัน export ให้ทั้งฝั่งแอดมินและนักเรียนใช้ร่วมกัน
(กันโค้ดเรียง/จัดกลุ่มซ้ำสองที่)

```js
// คืน array ของกลุ่มพร้อมวีดีโอที่เรียงแล้ว
// [{ section: {...}|null, videos: [...] }]  — กลุ่ม null ("ทั่วไป") อยู่ท้ายสุด
export function groupVideosBySection(videos, sections) {
  const byId = new Map(sections.map(s => [s.id, { section: s, videos: [] }]));
  const ungrouped = { section: null, videos: [] };
  for (const v of videos) {
    const bucket = (v.section_id && byId.get(v.section_id)) || ungrouped;
    bucket.videos.push(v);
  }
  const sortVideos = (arr, mode) => arr.sort((a, b) =>
    mode === 'manual'
      ? (a.order_index - b.order_index) || (new Date(a.created_at) - new Date(b.created_at))
      : (new Date(a.created_at) - new Date(b.created_at))   // 'date' = เก่า→ใหม่
  );
  const groups = [...sections]
    .sort((a, b) => a.order_index - b.order_index)
    .map(s => { const g = byId.get(s.id); sortVideos(g.videos, s.sort_mode); return g; });
  if (ungrouped.videos.length) { sortVideos(ungrouped.videos, 'date'); groups.push(ungrouped); }
  return groups;
}
```
> หมายเหตุ: ทิศการเรียงวันที่ ("เก่า→ใหม่" หรือ "ใหม่→เก่า") ปรับได้ตรงนี้ที่เดียว ค่าเริ่มต้นข้างบนคือเก่า→ใหม่
> (บทเรียนควรเรียงจากตอนแรกไปตอนหลัง) ถ้าต้องการใหม่→เก่าให้สลับ a/b

**Done check P3:** import ได้ ไม่มี error

---

## Phase 4 — Frontend: หน้าแอดมิน (จัดระเบียบ)

ไฟล์: [src/pages/admin-classroom.js](src/pages/admin-classroom.js)

### 4a. โหลดข้อมูล
`loadClassroomDetail` ดึง sections เพิ่ม:
`const { classroom, videos, sections } = await api(\`/videos/classroom/${classroomId}\`);`
→ ต้องแก้ route P2 ให้ `GET /videos/classroom/:id` ส่ง `sections` มาด้วย (เพิ่ม `db.getSectionsByClassroom`)

### 4b. UI ส่วนหัวจัดการหมวด
เหนือ list วีดีโอ เพิ่มแถบ:
- ปุ่ม **"➕ เพิ่มหมวด"** → prompt ชื่อ → `POST /sections/classroom/:id` → reload
- แสดงรายการวีดีโอ **จัดกลุ่มตาม section** ด้วย `groupVideosBySection(videos, sections)`
  - หัวกลุ่มแต่ละหมวด: ชื่อ + จำนวน + ปุ่ม **แก้ชื่อ / ลบหมวด / เลื่อนหมวดขึ้น-ลง** +
    ปุ่มสลับ **เรียงตามวันที่ ⇄ ลากเรียงเอง** (`PUT /sections/:id { sort_mode }`)
  - กลุ่ม "ทั่วไป" (section = null) แสดงหัวว่า "ยังไม่จัดหมวด" ไม่มีปุ่มลบ/แก้ชื่อ

### 4c. ติ๊กเลือก + ย้าย (กลไกหลักเฟสนี้)
- ใส่ checkbox หน้าวีดีโอแต่ละตัว (`.video-select` data-id)
- แถบ action ลอย/บนสุด แสดงเมื่อเลือก ≥1: `"เลือก N รายการ"` + `<select>` รายชื่อหมวด
  (รวมตัวเลือก "ทั่วไป (เอาออกจากหมวด)" และ "➕ สร้างหมวดใหม่…") + ปุ่ม **"ย้าย"**
- กด "ย้าย" → `PUT /videos/classroom/:id/move { videoIds, section_id }` → reload → เคลียร์ที่เลือก

### 4d. การเรียงภายในหมวด (manual)
- ปุ่ม ▲▼ เดิม ([admin-classroom.js:311-339](src/pages/admin-classroom.js)) ให้คงไว้ **แต่แสดงเฉพาะหมวด
  ที่ `sort_mode === 'manual'`** และ reorder ภายในขอบเขตหมวดนั้น (ส่งเฉพาะ id ในหมวดเดียวกันไป
  endpoint reorder เดิม [videos.js:186](server/routes/videos.js))
- หมวดที่ `sort_mode === 'date'` ซ่อนปุ่ม ▲▼ (เพราะเรียงอัตโนมัติ)

> เตือน: handler ของ checkbox/ปุ่มที่ถูก re-render ใน `loadClassroomDetail` ผูกได้ตามปกติ (เพราะ DOM ถูกสร้างใหม่ทุกครั้ง)
> แต่ปุ่ม submit ใน modal ที่อยู่ใน `initAdminClassroom` ต้องผูกครั้งเดียวเหมือนเดิม — อย่าย้ายเข้า loader

**Done check P4:** สร้างหมวด, ติ๊ก 2-3 วีดีโอแล้วย้ายเข้าหมวดสำเร็จ, สลับ sort_mode แล้วลำดับเปลี่ยน,
ลบหมวดแล้ววีดีโอกลับไป "ยังไม่จัดหมวด", refresh แล้วสถานะคงอยู่

---

## Phase 5 — Frontend: หน้านักเรียน (accordion)

ไฟล์: [src/pages/student-classroom.js](src/pages/student-classroom.js)

- ดึง `sections` จาก `api(\`/classrooms/code/${classroomCode}\`)`
- ใช้ `groupVideosBySection(videos, sections)` แล้ว render เป็น **accordion**:
  - หัวบท: chevron + ชื่อบท + จำนวนวีดีโอ — คลิกพับ/เปิด (toggle class)
  - ในบท: การ์ดวีดีโอเดิม (เลข, ชื่อ, วันที่ `formatDate`, badge "ดูค้างไว้" จาก `localStorage resume_<id>`)
  - กลุ่ม "ทั่วไป" แสดงเป็นบทสุดท้าย (ถ้ามีวีดีโอ)
- **สถานะพับ:** เปิดบทแรกไว้ บทอื่นพับ; (ออปชัน) จำสถานะใน `localStorage` คีย์ `sec_open_<sectionId>`
- ถ้าคอร์สไม่มี section เลย → แสดง list แบนเหมือนเดิม (ผ่าน fallback: กลุ่ม "ทั่วไป" กลุ่มเดียว ไม่ต้องมีหัวบท)
- คง logic คลิกการ์ด → `navigateTo(/watch/<id>/<code>)` ([student-classroom.js:84-88](src/pages/student-classroom.js))
- เพิ่ม CSS accordion ใน [src/styles/main.css](src/styles/main.css) (ใช้ตัวแปรสีเดิม `--bg-card`, `--accent`, ฯลฯ)

**Done check P5:** หน้านักเรียนเห็นบทพับ/เปิดได้, วีดีโอในบทเรียงถูกตามโหมด, คอร์สเก่าที่ไม่มีหมวดยังแสดงปกติ

---

## Phase 6 (เสริม) — ลากวาง (drag-drop)  ✅ เสร็จแล้ว

> ทำเสร็จแล้วใน admin-classroom.js: แถว `.admin-video-item` เป็น `draggable` + มี drag handle (⠿),
> หัวหมวด/กลุ่มเป็น drop target, ลากแล้วเรียก endpoint move เดิม (ลากทั้ง selection ได้ถ้าติ๊กไว้)
> checkbox + dropdown ยังเป็นวิธีหลัก (HTML5 drag ใช้บนจอสัมผัสไม่ได้)
>
> เพิ่มเติม (มือถือ/iPad): `#video-element { object-fit: contain }` กันวีดีโอสัดส่วนอื่นถูกยืดเพี้ยน,
> landscape ใช้ `100dvh`, มี `playsinline` + iOS fullscreen fallback อยู่แล้ว

ทำหลัง P1-P5 เสถียรแล้วเท่านั้น
- ฝั่งแอดมิน: ทำการ์ดวีดีโอ `draggable="true"`, หัวหมวดเป็น drop target
  (`dragstart` เก็บ id, `dragover` preventDefault + ไฮไลต์, `drop` → เรียก endpoint move เดิม)
- เป็น enhancement เสริมจาก checkbox (อย่าถอด checkbox ออก เพราะ drag ใช้บนมือถือไม่สะดวก)
- ออปชัน: ลากเรียงลำดับภายในหมวด manual ด้วย (ใช้ reorder endpoint เดิม)

---

## Checklist ทดสอบรวม (ก่อน deploy)
- [ ] คอร์สเดิม (ไม่มี section) เปิดทั้งฝั่งแอดมินและนักเรียนได้เหมือนเดิม
- [ ] สร้าง/แก้ชื่อ/ลบ/เลื่อนลำดับ หมวด ได้ครบ
- [ ] ติ๊กเลือกหลายวีดีโอ → ย้ายเข้าหมวด/ย้ายออก ได้
- [ ] sort_mode `date` เรียงตาม created_at, `manual` เรียงตาม order_index + ปุ่ม ▲▼ ทำงาน
- [ ] ลบหมวด → วีดีโอกลับเป็น "ยังไม่จัดหมวด" ไม่หาย
- [ ] หน้านักเรียน accordion พับ/เปิด, จำนวนถูก, badge ดูค้างไว้ยังขึ้น
- [ ] ทดสอบทั้ง backend ไฟล์ JSON (dev) และ Mongo (ตั้ง `MONGODB_URI` ชี้ DB ทดสอบ)
- [ ] `npm run build` ผ่าน, ไม่มี error ใน console ตอนใช้งานจริง

## ไฟล์ที่จะถูกแตะ (สรุป)
- `server/db.js` — methods + proxy + defaultData + seed sections
- `server/routes/sections.js` — **ไฟล์ใหม่**
- `server/routes/videos.js` — section_id ใน POST/PUT + endpoint move + ส่ง sections ใน GET classroom
- `server/routes/classrooms.js` — ส่ง sections + section_id ใน GET /code/:code
- `server/index.js` — mount /api/sections
- `data/physics-classroom.json` — เพิ่ม `"sections": []`
- `src/utils.js` — `groupVideosBySection`
- `src/pages/admin-classroom.js` — UI จัดหมวด + ติ๊กเลือก/ย้าย + sort toggle
- `src/pages/student-classroom.js` — accordion
- `src/styles/main.css` — สไตล์ accordion + แถบเลือก/ย้าย

## ลำดับแนะนำให้ Sonnet ทำ
P1 → P2 (ทดสอบ API ด้วย curl) → P3 → P4 (ทดสอบแอดมิน) → P5 (ทดสอบนักเรียน) → commit →
P6 เป็น commit แยกทีหลัง

> ทำทีละเฟส, รัน `npm run dev` ทดสอบจริงทุกเฟส, commit เมื่อแต่ละเฟสผ่าน Done check
