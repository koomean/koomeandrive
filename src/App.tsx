import { useEffect, useMemo, useRef, useState } from 'react'
import { Archive, ArrowLeft, ArrowUpDown, Bell, Check, ChevronDown, ChevronRight, CircleHelp, Cloud, CloudUpload, Download, File, FileArchive, FileAudio, FileImage, FileSpreadsheet, FileText, FileUp, FileVideo, Folder, FolderPlus, Grid2X2, HardDrive, LayoutList, MoreHorizontal, Plus, Search, Settings2, Star, Trash2, Upload, X } from 'lucide-react'
import { WorkerDriveProvider, type DriveUser } from './providers/worker'
import type { DriveItem } from './providers/types'

type View = 'all' | 'starred' | 'recent' | 'trash'
type GoogleIdClient = { initialize: (config: Record<string, unknown>) => void; renderButton: (target: HTMLElement, options: Record<string, unknown>) => void }
const GOOGLE_CLIENT_ID = '906677442222-kmjgsmta70n24aoaq7osm9c1l7g1fb89.apps.googleusercontent.com'
const formatter = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
const sizeLabel = (size: number) => size < 1024 ? `${size} B` : size < 1024 ** 2 ? `${(size / 1024).toFixed(0)} KB` : `${(size / 1024 ** 2).toFixed(1)} MB`
const ext = (name: string) => name.split('.').pop()?.toLowerCase() || ''

function FileGlyph({ item, large = false }: { item: DriveItem; large?: boolean }) {
  if (item.type === 'folder') return <span className={`glyph folder-glyph ${large ? 'glyph-large' : ''}`}><Folder fill="currentColor" strokeWidth={1.5} /></span>
  const extension = ext(item.name)
  const Icon = ['jpg','jpeg','png','gif','webp','svg'].includes(extension) ? FileImage : ['pdf','doc','docx','txt','md'].includes(extension) ? FileText : ['xls','xlsx','csv'].includes(extension) ? FileSpreadsheet : ['mp3','wav'].includes(extension) ? FileAudio : ['mp4','mov'].includes(extension) ? FileVideo : ['zip','rar','7z'].includes(extension) ? FileArchive : File
  const kind = ['jpg','jpeg','png','gif','webp','svg'].includes(extension) ? 'image' : ['pdf'].includes(extension) ? 'pdf' : ['doc','docx','txt','md'].includes(extension) ? 'doc' : ['xls','xlsx','csv'].includes(extension) ? 'sheet' : 'other'
  return <span className={`glyph ${kind} ${large ? 'glyph-large' : ''}`}><Icon strokeWidth={1.7} /></span>
}

export default function App() {
  const [drive, setDrive] = useState<WorkerDriveProvider | null>(null)
  const [user, setUser] = useState<DriveUser | null>(null)
  const [loginError, setLoginError] = useState('')
  const [loginBusy, setLoginBusy] = useState(false)
  const [items, setItems] = useState<DriveItem[]>([])
  const [path, setPath] = useState('/')
  const [view, setView] = useState<View>('all')
  const [query, setQuery] = useState('')
  const [layout, setLayout] = useState<'list' | 'grid'>('list')
  const [sort, setSort] = useState<'name' | 'modifiedAt' | 'size'>('name')
  const [selected, setSelected] = useState<string | null>(null)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [modal, setModal] = useState<'folder' | 'connect' | 'preview' | null>(null)
  const [folderName, setFolderName] = useState('')
  const [preview, setPreview] = useState<DriveItem | null>(null)
  const [toast, setToast] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [newMenu, setNewMenu] = useState(false)
  const [replaceTarget, setReplaceTarget] = useState<string | null>(null)
  const uploadRef = useRef<HTMLInputElement>(null)
  const googleButtonRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    let attempts = 0
    const renderButton = () => {
      const gis = (window as Window & { google?: { accounts?: { id?: GoogleIdClient } } }).google?.accounts?.id
      if (gis && googleButtonRef.current) {
        gis.initialize({ client_id: GOOGLE_CLIENT_ID, callback: async (credential: { credential: string }) => {
          if (!alive) return
          setLoginBusy(true); setLoginError('')
          try {
            const provider = new WorkerDriveProvider(credential.credential)
            const firstPage = await provider.list('/', 'all')
            if (!alive) return
            setDrive(provider); setUser(provider.user); setItems(firstPage); setPath('/'); setView('all')
          } catch (error) {
            if (alive) setLoginError(error instanceof Error && /not registered|ลงทะเบียน/i.test(error.message) ? 'บัญชีนี้ยังไม่มีสิทธิ์ใช้งาน กรุณาติดต่อผู้ดูแลระบบ' : error instanceof Error ? error.message : 'เข้าสู่ระบบไม่สำเร็จ')
          } finally { if (alive) setLoginBusy(false) }
        }, auto_select: false })
        gis.renderButton(googleButtonRef.current, { type: 'standard', size: 'large', theme: 'outline', shape: 'pill', text: 'signin_with', logo_alignment: 'left', width: 260 })
        return
      }
      if (alive && attempts++ < 40) window.setTimeout(renderButton, 250)
      else if (alive) setLoginError('โหลดระบบเข้าสู่ระบบ Google ไม่สำเร็จ กรุณารีเฟรชหน้า')
    }
    if (!(window as Window & { google?: unknown }).google) {
      const script = document.createElement('script'); script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.defer = true
      script.onload = renderButton; script.onerror = () => alive && setLoginError('เชื่อมต่อ Google Sign-In ไม่สำเร็จ'); document.head.appendChild(script)
    } else renderButton()
    return () => { alive = false }
  }, [])

  const refresh = async () => { if (!drive) return; try { setItems(await drive.list(path, view)) } catch (error) { setToast(error instanceof Error ? error.message : 'โหลดรายการไฟล์ไม่สำเร็จ') } }
  useEffect(() => { void refresh() }, [path, view, drive])
  useEffect(() => { if (!toast) return; const id = window.setTimeout(() => setToast(''), 2800); return () => window.clearTimeout(id) }, [toast])

  const visible = useMemo(() => items.filter(item => item.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    if (sort === 'modifiedAt') return b.modifiedAt.localeCompare(a.modifiedAt)
    if (sort === 'size') return b.size - a.size
    return a.name.localeCompare(b.name, 'th')
  }), [items, query, sort])
  const crumbs = path.split('/').filter(Boolean)
  const heading = view === 'all' ? 'ไฟล์ของฉัน' : view === 'starred' ? 'ติดดาว' : view === 'recent' ? 'ล่าสุด' : 'ถังขยะ'
  const filesCount = items.filter(x => x.type === 'file').length

  const notify = (text: string) => setToast(text)
  const loadItems = async () => { if (drive) setItems(await drive.list(path, view)) }
  const createFolder = async () => {
    const name = folderName.trim()
    if (!name || !drive) return
    if (items.some(item => item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) { notify('มีชื่อนี้ในโฟลเดอร์แล้ว'); return }
    await drive.createFolder(path, name); setFolderName(''); setModal(null); await loadItems(); notify(`สร้างโฟลเดอร์ “${name}” แล้ว`)
  }
  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length || !drive || !user?.isAdmin) return
    try {
      if (replaceTarget) {
        if (files.length !== 1) { notify('เลือกไฟล์เดียวเพื่อแทนที่'); if (uploadRef.current) uploadRef.current.value = ''; return }
        await drive.replace(replaceTarget, files[0]); setReplaceTarget(null)
        await loadItems(); notify('แทนที่ไฟล์เรียบร้อยแล้ว')
      } else {
        for (const file of Array.from(files)) await drive.upload(path, file)
        await loadItems(); notify(`อัปโหลด ${files.length} ไฟล์ไปยัง Drive แล้ว`)
      }
    } catch (error) { notify(error instanceof Error ? error.message : 'อัปโหลดไฟล์ไม่สำเร็จ') }
    if (uploadRef.current) uploadRef.current.value = ''
  }
  const toggleStar = async (item: DriveItem) => { if (!drive || !user?.isAdmin) return; await drive.setStarred(item.id, !item.starred); await loadItems(); notify(item.starred ? 'นำดาวออกแล้ว' : 'เพิ่มลงรายการติดดาวแล้ว') }
  const renameItem = async (item: DriveItem) => {
    if (!drive || !user?.isAdmin) return
    const name = window.prompt('เปลี่ยนชื่อเป็น', item.name)?.trim()
    if (!name || name === item.name) return
    await drive.rename(item.id, name); await loadItems(); notify('เปลี่ยนชื่อเรียบร้อย')
  }
  const trashItem = async (item: DriveItem) => { if (!drive || !user?.isAdmin) return; await drive.trash(item.id); setSelected(null); setMenuFor(null); await loadItems(); notify('ย้ายไปถังขยะแล้ว') }
  const downloadItem = async (item: DriveItem) => {
    if (!drive) return
    try {
      const result = await drive.getDownload(item.id)
      const url = URL.createObjectURL(result.blob); const link = document.createElement('a'); link.href = url; link.download = result.filename; link.click(); URL.revokeObjectURL(url)
    } catch (error) { notify(error instanceof Error ? error.message : 'ดาวน์โหลดไฟล์ไม่สำเร็จ') }
  }
  const activateView = (next: View) => { setView(next); setPath('/'); setSelected(null); setMobileNav(false) }
  const openFolder = (item: DriveItem) => { setPath(`${item.path === '/' ? '' : item.path}/${item.name}` || '/'); setView('all'); setSelected(null) }
  const selectedItem = items.find(item => item.id === selected)

  if (!drive || !user) return <div className="login-screen"><div className="login-card"><span className="login-cloud"><Cloud size={30}/></span><p className="login-eyebrow">KOO MEAN · PRIVATE DRIVE</p><h1>เข้าสู่ระบบ Drive</h1><p className="login-description">ใช้บัญชี Google ที่ลงทะเบียนไว้ เพื่อดูไฟล์ตามสิทธิ์ของบัญชี</p><div className="google-login" ref={googleButtonRef}/>{loginBusy && <p className="login-status">กำลังตรวจสอบสิทธิ์กับ D1…</p>}{loginError && <p className="login-error" role="alert">{loginError}</p>}<p className="login-footnote">ระบบตรวจสิทธิ์จากฐานข้อมูลก่อนแสดงไฟล์ทุกครั้ง</p></div></div>

  return <div className="drive-app">
    <header className="topbar">
      <button className="mobile-menu icon-button" onClick={() => setMobileNav(!mobileNav)} aria-label="เปิดเมนู"><Grid2X2 size={20}/></button>
      <a className="brand" href="#" onClick={e => { e.preventDefault(); activateView('all') }}><span className="brand-mark"><Cloud size={25} strokeWidth={2.1}/></span><span>Koo <b>Drive</b></span></a>
      <div className="search-wrap"><Search size={19}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="ค้นหาใน Drive" aria-label="ค้นหาใน Drive"/>{query && <button className="search-clear" onClick={() => setQuery('')} aria-label="ล้างการค้นหา"><X size={16}/></button>}<button className="search-options" title="ตัวเลือกการค้นหา"><Settings2 size={19}/></button></div>
      <div className="top-actions"><button className="icon-button" title="สิทธิ์การเข้าถึง" onClick={() => setModal('connect')}><CircleHelp size={20}/></button><button className="profile" title={`${user.name} · ออกจากระบบ`} onClick={() => { setDrive(null); setUser(null); setItems([]); setSelected(null); setLoginError('') }}>{user.name.slice(0, 1).toUpperCase()}</button></div>
    </header>

    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      {user.isAdmin && <div className="new-wrap"><button className="new-button" onClick={() => setNewMenu(!newMenu)}><Plus size={22} strokeWidth={2.3}/><span>ใหม่</span><ChevronDown size={16}/></button>{newMenu && <div className="new-menu"><button onClick={() => { setNewMenu(false); setModal('folder') }}><FolderPlus size={17}/>โฟลเดอร์ใหม่</button><button onClick={() => { setNewMenu(false); uploadRef.current?.click() }}><Upload size={17}/>อัปโหลดไฟล์</button></div>}</div>}
      <nav className="main-nav">
        <button className={view === 'all' ? 'nav-item active' : 'nav-item'} onClick={() => activateView('all')}><HardDrive size={19}/><span>ไฟล์ของฉัน</span></button>
        <button className={view === 'recent' ? 'nav-item active' : 'nav-item'} onClick={() => activateView('recent')}><Archive size={19}/><span>ล่าสุด</span></button>
        <button className={view === 'starred' ? 'nav-item active' : 'nav-item'} onClick={() => activateView('starred')}><Star size={19}/><span>ติดดาว</span></button>
        <button className={view === 'trash' ? 'nav-item active' : 'nav-item'} onClick={() => activateView('trash')}><Trash2 size={19}/><span>ถังขยะ</span></button>
      </nav>
      <div className="sidebar-divider"/>
      <button className="nav-item connect-nav" onClick={() => setModal('connect')}><CloudUpload size={19}/><span>สิทธิ์การเข้าถึง</span></button>
      <div className="sidebar-bottom"><div className="storage-icon"><Cloud size={18}/></div><p className="storage-title">{user.isAdmin ? 'ผู้ดูแลระบบ' : 'อ่านอย่างเดียว'}</p><p className="storage-copy">{user.isAdmin ? 'อัปโหลด แก้ไข และจัดการไฟล์ใน Drive ได้' : 'ดูรายการไฟล์ได้ โดยชื่อไฟล์ถูกซ่อนและแก้ไขไม่ได้'}</p><button className="storage-button" onClick={() => { setDrive(null); setUser(null); setItems([]); setLoginError('') }}>ออกจากระบบ</button></div>
    </aside>

    {mobileNav && <button className="nav-backdrop" onClick={() => setMobileNav(false)} aria-label="ปิดเมนู"/>}
    <main className="main-content">
      <div className={`connection-banner ${user.isAdmin ? 'admin-banner' : 'readonly-banner'}`}><span className="status-dot"/><span>{user.isAdmin ? 'ผู้ดูแลระบบ' : 'ผู้ใช้ทั่วไป · อ่านอย่างเดียว'}</span><span className="banner-sep">·</span><span>{user.isAdmin ? 'จัดการไฟล์ได้ทุกอย่าง' : 'ชื่อไฟล์ถูกซ่อน'}</span><button onClick={() => setModal('connect')}>สิทธิ์บัญชี <ChevronRight size={14}/></button></div>
      <div className="content-heading"><div className="heading-title"><h1>{heading}</h1>{view === 'all' && crumbs.length > 0 && <div className="breadcrumbs"><button onClick={() => setPath('/')}>ไฟล์ของฉัน</button>{crumbs.map((crumb, i) => <span key={`${crumb}-${i}`}><ChevronRight size={15}/><button onClick={() => setPath('/' + crumbs.slice(0, i + 1).join('/'))}>{crumb}</button></span>)}</div>}</div>
        <div className="heading-actions"><button className="view-toggle" title="แสดงแบบรายการ" onClick={() => setLayout('list')}><LayoutList size={18} className={layout === 'list' ? 'chosen' : ''}/></button><button className="view-toggle" title="แสดงแบบตาราง" onClick={() => setLayout('grid')}><Grid2X2 size={17} className={layout === 'grid' ? 'chosen' : ''}/></button><span className="action-divider"/><button className="sort-button" onClick={() => setSort(sort === 'name' ? 'modifiedAt' : sort === 'modifiedAt' ? 'size' : 'name')}><ArrowUpDown size={16}/><span>{sort === 'name' ? 'ชื่อ' : sort === 'modifiedAt' ? 'แก้ไขล่าสุด' : 'ขนาด'}</span><ChevronDown size={14}/></button></div>
      </div>
      {selectedItem && <div className="selection-bar"><span>เลือก {selectedItem.name}</span>{user.isAdmin && <button onClick={() => void toggleStar(selectedItem)}><Star size={17}/>{selectedItem.starred ? 'นำดาวออก' : 'ติดดาว'}</button>}{selectedItem.type === 'file' && <button onClick={() => void downloadItem(selectedItem)}><Download size={17}/>ดาวน์โหลด</button>}{user.isAdmin && (view === 'trash' ? <button onClick={async () => { await drive.restore(selectedItem.id); setSelected(null); await loadItems(); notify('กู้คืนไฟล์แล้ว') }}><ArrowLeft size={17}/>กู้คืน</button> : <button onClick={() => void trashItem(selectedItem)}><Trash2 size={17}/>ย้ายไปถังขยะ</button>)}<button className="selection-close" onClick={() => setSelected(null)} aria-label="ยกเลิกการเลือก"><X size={18}/></button></div>}
      <section className={`file-area ${layout === 'grid' ? 'grid-layout' : ''}`}>
        {visible.length ? <>
          <div className="table-head"><span>ชื่อ</span><span>เจ้าของ</span><span>แก้ไขล่าสุด</span><span>ขนาดไฟล์</span><span/></div>
          {visible.map(item => <div key={item.id} className={`file-row ${selected === item.id ? 'row-selected' : ''}`} onClick={() => setSelected(selected === item.id ? null : item.id)} onDoubleClick={() => item.type === 'folder' ? openFolder(item) : (setPreview(item), setModal('preview'))}>
            <div className="file-name"><FileGlyph item={item}/><span className="filename-text">{item.name}</span>{item.starred && <Star size={14} className="star-mark" fill="currentColor"/>}{item.demo && <span className="sample-chip">ตัวอย่าง</span>}</div>
            <div className="owner-cell"><span className="owner-avatar">K</span><span>Drive</span></div>
            <div className="date-cell">{formatter.format(new Date(item.modifiedAt))}</div><div className="size-cell">{item.type === 'folder' ? '—' : sizeLabel(item.size)}</div>
            {user.isAdmin && <div className="row-menu-wrap"><button className="row-more" aria-label={`ตัวเลือก ${item.name}`} onClick={e => { e.stopPropagation(); setSelected(item.id); setMenuFor(menuFor === item.id ? null : item.id) }}><MoreHorizontal size={20}/></button>
              {menuFor === item.id && <div className="item-menu" onClick={e => e.stopPropagation()}>{view === 'trash' ? <button onClick={async () => { await drive.restore(item.id); setMenuFor(null); await loadItems(); notify('กู้คืนไฟล์แล้ว') }}><ArrowLeft size={16}/>กู้คืน</button> : <><button onClick={() => { setMenuFor(null); void toggleStar(item) }}><Star size={16}/>{item.starred ? 'นำดาวออก' : 'เพิ่มลงรายการติดดาว'}</button>{item.type === 'file' && <><button onClick={() => { setMenuFor(null); void downloadItem(item) }}><Download size={16}/>ดาวน์โหลด</button><button onClick={() => { setMenuFor(null); setReplaceTarget(item.id); uploadRef.current?.click() }}><FileUp size={16}/>แทนที่ไฟล์</button></>}<button onClick={() => { setMenuFor(null); void renameItem(item) }}><FileText size={16}/>เปลี่ยนชื่อ</button><button className="danger-action" onClick={() => void trashItem(item)}><Trash2 size={16}/>ย้ายไปถังขยะ</button></>}</div>}</div>
            }
          </div>)}
          <div className="table-summary">{filesCount} ไฟล์{view === 'all' ? 'ในโฟลเดอร์นี้' : ''}</div>
        </> : <div className="empty-state"><div className="empty-art"><Folder size={40} strokeWidth={1.2}/><Search size={21}/></div><h2>{query ? 'ไม่พบไฟล์ที่ค้นหา' : view === 'trash' ? 'ถังขยะว่างเปล่า' : 'โฟลเดอร์นี้ยังว่างอยู่'}</h2><p>{query ? 'ลองค้นหาด้วยคำอื่น' : user.isAdmin ? 'สร้างโฟลเดอร์หรืออัปโหลดไฟล์เพื่อเริ่มต้น' : 'ยังไม่มีไฟล์ในโฟลเดอร์นี้'}</p>{!query && view !== 'trash' && user.isAdmin && <button className="upload-cta" onClick={() => uploadRef.current?.click()}><Upload size={17}/>อัปโหลดไฟล์</button>}</div>}
      </section>
      <input ref={uploadRef} type="file" multiple hidden onChange={e => void uploadFiles(e.target.files)}/>
    </main>

    {modal === 'folder' && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null) }}><div className="dialog"><div className="dialog-head"><h2>สร้างโฟลเดอร์ใหม่</h2><button className="icon-button" onClick={() => setModal(null)}><X size={19}/></button></div><label className="input-label" htmlFor="folder-name">ชื่อโฟลเดอร์</label><input id="folder-name" autoFocus value={folderName} onChange={e => setFolderName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void createFolder() }} placeholder="โฟลเดอร์ใหม่"/><div className="dialog-actions"><button className="subtle-button" onClick={() => setModal(null)}>ยกเลิก</button><button className="primary-button" onClick={() => void createFolder()}>สร้าง</button></div></div></div>}
    {modal === 'connect' && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null) }}><div className="dialog connect-dialog"><div className="dialog-head"><div className="dialog-icon"><Cloud size={22}/></div><button className="icon-button" onClick={() => setModal(null)}><X size={19}/></button></div><h2>สิทธิ์การเข้าถึงไฟล์</h2><p className="dialog-copy">เข้าสู่ระบบด้วย Google และตรวจ role จาก D1 ทุกครั้งที่เรียก API ข้อมูลไฟล์เก็บใน R2 โดยชื่อไฟล์ของผู้ใช้ทั่วไปถูกปิดบังจากฝั่งเซิร์ฟเวอร์</p><div className="connect-steps"><div><span>✓</span><p><b>Admin</b> อัปโหลด สร้างโฟลเดอร์ เปลี่ยนชื่อ ติดดาว กู้คืน และย้ายไฟล์ไปถังขยะ</p></div><div><span>✓</span><p><b>ผู้ใช้ทั่วไป</b> ดูและดาวน์โหลดไฟล์ได้ แต่เห็นชื่อไฟล์เป็น “ซ่อนชื่อไฟล์” และแก้ไขไม่ได้</p></div><div><span>✓</span><p>บัญชีต้องมีอยู่ในตาราง users ของ D1 และ role admin เท่านั้นที่เขียนข้อมูลได้</p></div></div><div className="dialog-actions"><button className="primary-button" onClick={() => setModal(null)}>ปิด <Check size={16}/></button></div></div></div>}
    {modal === 'preview' && preview && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null) }}><div className="dialog preview-dialog"><div className="dialog-head"><div className="preview-title"><FileGlyph item={preview}/><h2>{preview.name}</h2></div><div><button className="icon-button" onClick={() => void downloadItem(preview)} title="ดาวน์โหลด"><Download size={18}/></button><button className="icon-button" onClick={() => setModal(null)} title="ปิด"><X size={19}/></button></div></div>{preview.mimeType.startsWith('image/') ? <ImagePreview item={preview} provider={drive}/> : <div className="preview-body"><div className="preview-large-icon"><FileGlyph item={preview} large/></div><p>ตัวอย่างไฟล์พร้อมดาวน์โหลด</p><span>{sizeLabel(preview.size)} · แก้ไข {formatter.format(new Date(preview.modifiedAt))}</span></div>}</div></div>}
    {toast && <div className="toast"><Check size={17}/>{toast}</div>}
    {menuFor && <button className="dismiss-menu" onClick={() => setMenuFor(null)} aria-label="ปิดเมนู"/>}
  </div>
}

function ImagePreview({ item, provider }: { item: DriveItem; provider: WorkerDriveProvider }) {
  const [src, setSrc] = useState('')
  useEffect(() => { let url = ''; void provider.getDownload(item.id).then(result => { url = URL.createObjectURL(result.blob); setSrc(url) }).catch(() => setSrc('')); return () => { if (url) URL.revokeObjectURL(url) } }, [item.id, provider])
  return src ? <img className="image-preview" src={src} alt={item.name}/> : <div className="preview-body"><p>ไม่พบภาพตัวอย่างนี้</p></div>
}
