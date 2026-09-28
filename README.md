# Koo Drive

เว็บจัดการไฟล์ที่ตรวจ Google Sign-In และ role จาก D1 ผ่าน Worker `koomean-proxy` โดยตรง

## สิทธิ์

- ผู้ใช้ต้องอยู่ในตาราง `users` ของ D1 ก่อนเข้าใช้งาน
- role `admin` สร้างโฟลเดอร์ อัปโหลด เปลี่ยนชื่อ ติดดาว กู้คืน และย้ายไฟล์ไปถังขยะได้
- role อื่นดูรายการและดาวน์โหลดได้ แต่ Worker เปลี่ยนชื่อไฟล์เป็น “ซ่อนชื่อไฟล์” ก่อนส่งข้อมูลให้ และปฏิเสธคำสั่งแก้ไขทุกครั้ง
- เนื้อหาไฟล์เก็บใน R2 bucket `koomean-drive-files`; metadata เก็บใน D1 ตาราง `drive_items`
- จำกัดขนาดอัปโหลดที่ 50 MB ต่อไฟล์

## Deploy

Frontend build และ GitHub Pages deploy ผ่าน `.github/workflows/deploy.yml`. Drive API ต่อกับ shared Worker `koomean-proxy`; source/config ของ Worker อยู่ในโฟลเดอร์ Cloudflare ส่วนตัวของ workspace และไม่ได้คัดลอก Worker สำหรับเว็บอื่นมาไว้ใน public repository นี้. Migration ของ Drive อยู่ใน `backend/drive-files-migration.sql`.

```sh
npm ci
npm run build
```

`VITE_DRIVE_API_URL` ตั้งค่าได้ใน `.env.local`; ค่าเริ่มต้นชี้ไปยัง Worker production. ห้ามใส่ Google client secret หรือ ID token ใน environment/build.

เตรียม D1 schema และ bucket ครั้งแรกด้วย migration ใน `backend/drive-files-migration.sql` และ R2 bucket `koomean-drive-files`; ตั้ง Worker bindings `DB`, `DRIVE_FILES` และ `ALLOWED_ORIGINS` ให้รวม `https://drive.koomean.com` ก่อน deploy Worker.

## API และ authorization

Frontend ส่ง Google ID token ผ่าน POST ไปยัง Worker. Worker ตรวจลายเซ็นและ audience ของ token จากนั้นอ่าน role ล่าสุดจาก D1 ทุกคำขอแก้ไข. การซ่อนปุ่มใน UI เป็นเพียง UX; การป้องกันจริงอยู่ใน Worker.

- `driveList`, `driveDownload` อนุญาตผู้ใช้ที่ลงทะเบียน
- `driveCreateFolder`, `driveRename`, `driveSetStarred`, `driveTrash`, `driveRestore` ตรวจ role `admin`
- `POST /drive/upload` ตรวจ token, role admin, origin และขนาดไฟล์ ก่อนบันทึก object ลง R2
