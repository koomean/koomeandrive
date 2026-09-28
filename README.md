# Koo Drive

เว็บจัดการไฟล์ส่วนตัว หน้าตาคุ้นเคยแบบ cloud drive และเตรียมจุดเชื่อมต่อ Synology Drive ไว้แล้ว

## เริ่มใช้งาน

```sh
npm install
npm run dev
```

ค่าเริ่มต้นเป็น `LocalDriveProvider`: ไฟล์และการเปลี่ยนแปลงจะอยู่ใน browser profile นี้เท่านั้น รายการตัวอย่างเป็นข้อมูลสมมติ ใช้ค้นหา เปิดโฟลเดอร์ สร้างโฟลเดอร์ อัปโหลด/ดาวน์โหลด เปลี่ยนชื่อ ติดดาว และย้ายเข้าถังขยะได้

## จุดเชื่อมต่อ Synology

UI เรียก `DriveProvider` interface เดียวกันทั้ง local และ Synology ที่ `src/providers/types.ts` ตัวเลือก `SynologyDriveProvider` เรียก same-origin backend ที่ `/api/drive` โดยตั้ง `VITE_DRIVE_PROVIDER=synology` ใน `.env.local` ได้หลังติดตั้ง backend bridge

backend bridge ที่เชื่อมกับ DSM ต้องทำ endpoint ตามนี้:

- `GET /items?path=/&view=all|starred|recent|trash` → `DriveItem[]`
- `POST /folders` JSON `{ path, name }` → `DriveItem`
- `POST /files` multipart `path`, `file` → `DriveItem`
- `PATCH /items/:id` JSON `{ name }`
- `PUT /items/:id/star` JSON `{ starred }`
- `POST /items/:id/trash`, `POST /items/:id/restore`
- `GET /items/:id/download` → file bytes และ `Content-Disposition`

Frontend ไม่เก็บรหัสผ่านหรือ session ของ Synology; ให้ backend bridge จัดการ DSM authentication, แปลง provider API ให้ตรง contract ข้างต้น, และอนุญาตเฉพาะ origin ที่ไว้ใจได้ การเชื่อม NAS จริงยังต้องกำหนดที่อยู่ DSM, วิธีเข้าถึงจาก browser/server, บัญชีและสิทธิ์ของผู้ใช้ รวมถึงเปิดใช้ backend bridge ก่อนสลับ provider
