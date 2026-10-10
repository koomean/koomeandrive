import { Cloud, Link, RotateCw } from 'lucide-react'
import type { GlobalMaintenanceState } from './providers/worker'
import './maintenance.css'

export function MaintenanceScreen({ state, now }: { state: GlobalMaintenanceState; now: number }) {
  const seconds = Math.max(0, Math.ceil(((state.reopenAt || now) - now) / 1000))
  const days = Math.floor(seconds / 86400)
  const countdown = [Math.floor(seconds % 86400 / 3600), Math.floor(seconds % 3600 / 60), seconds % 60].map(value => String(value).padStart(2, '0')).join(' : ')
  return <div className="km-maintenance" role="region" aria-labelledby="drive-maintenance-title" lang="th">
    <div className="maintenance-shell">
      <header className="maintenance-header"><div className="maintenance-brand"><span className="maintenance-brand-symbol"><Link /></span><div><span className="maintenance-brand-name">Koo Mean</span><span className="maintenance-brand-app">Drive</span></div></div><span className="maintenance-state">กำลังดูแลระบบ</span></header>
      <main className="maintenance-content"><span className="maintenance-symbol"><Cloud /></span><h1 id="drive-maintenance-title" className="maintenance-title">เราจะกลับมาเร็ว ๆ นี้</h1><p className="maintenance-note">{state.note || 'เรากำลังดูแลพื้นที่จัดเก็บไฟล์ของคุณ อีกสักครู่กลับมาใช้งาน Drive ได้ตามปกติ'}</p>
        <div className="maintenance-clock"><span className="maintenance-label">เปิดให้บริการอีกครั้งใน</span>{days > 0 && <span className="maintenance-days">{days} วัน</span>}<strong className="maintenance-countdown" aria-live="off">{state.reopenAt ? countdown : '—'}</strong><p className="maintenance-deadline">{state.reopenAt ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'long', timeStyle: 'short' }).format(state.reopenAt) : ''}</p></div>
        <p className="maintenance-foot">{state.reopenAt && !seconds ? 'กำลังตรวจสอบการเปิดระบบ…' : 'หน้านี้จะกลับมาใช้งานได้โดยอัตโนมัติเมื่อระบบพร้อม'}</p><button type="button" className="maintenance-refresh" onClick={() => window.location.reload()}><RotateCw /><span>ตรวจสอบอีกครั้ง</span></button>
      </main><footer className="maintenance-footer"><span>drive.koomean.com</span><span>ขอบคุณที่รอพบกันอีกครั้ง</span></footer>
    </div>
  </div>
}
