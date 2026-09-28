import { useEffect, useMemo, useRef, useState } from 'react'
import { Archive, ArrowLeft, ArrowUpDown, Bell, Check, ChevronDown, ChevronRight, CircleHelp, Cloud, CloudUpload, Download, File, FileArchive, FileAudio, FileImage, FileSpreadsheet, FileText, FileVideo, Folder, FolderPlus, Grid2X2, HardDrive, LayoutList, MoreHorizontal, Plus, Search, Settings2, Star, Trash2, Upload, X } from 'lucide-react'
import { LocalDriveProvider } from './providers/local'
import { SynologyDriveProvider } from './providers/synology'
import type { DriveItem } from './providers/types'

type View = 'all' | 'starred' | 'recent' | 'trash'
const drive = import.meta.env.VITE_DRIVE_PROVIDER === 'synology' ? new SynologyDriveProvider() : new LocalDriveProvider()
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
  const uploadRef = useRef<HTMLInputElement>(null)

  const refresh = async () => setItems(await drive.list(path, view))
  useEffect(() => { void refresh() }, [path, view])
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
  const loadItems = async () => setItems(await drive.list(path, view))
  const createFolder = async () => {
    const name = folderName.trim()
    if (!name) return
    if (items.some(item => item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) { notify('มีชื่อนี้ในโฟลเดอร์แล้ว'); return }
    await drive.createFolder(path, name); setFolderName(''); setModal(null); await loadItems(); notify(`สร้างโฟลเดอร์ “${name}” แล้ว`)
  }
  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return
    for (const file of Array.from(files)) await drive.upload(path, file)
    await loadItems(); notify(`อัปโหลด ${files.length} ไฟล์ไว้ในเบราว์เซอร์แล้ว`)
    if (uploadRef.current) uploadRef.current.value = ''
  }
  const toggleStar = async (item: DriveItem) => { await drive.setStarred(item.id, !item.starred); await loadItems(); notify(item.starred ? 'นำดาวออกแล้ว' : 'เพิ่มลงรายการติดดาวแล้ว') }
  const renameItem = async (item: DriveItem) => {
    const name = window.prompt('เปลี่ยนชื่อเป็น', item.name)?.trim()
    if (!name || name === item.name) return
    await drive.rename(item.id, name); await loadItems(); notify('เปลี่ยนชื่อเรียบร้อย')
  }
  const trashItem = async (item: DriveItem) => { await drive.trash(item.id); setSelected(null); setMenuFor(null); await loadItems(); notify('ย้ายไปถังขยะแล้ว') }
  const downloadItem = async (item: DriveItem) => {
    const result = await drive.getDownload(item.id)
    if (!result) { notify('ไฟล์นี้เป็นข้อมูลตัวอย่าง ลองอัปโหลดไฟล์ของคุณเพื่อดาวน์โหลดได้'); return }
    const url = URL.createObjectURL(result.blob); const link = document.createElement('a'); link.href = url; link.download = result.filename; link.click(); URL.revokeObjectURL(url)
  }
  const activateView = (next: View) => { setView(next); setPath('/'); setSelected(null); setMobileNav(false) }
  const openFolder = (item: DriveItem) => { setPath(`${path === '/' ? '' : path}/${item.name}`); setView('all'); setSelected(null) }
  const selectedItem = items.find(item => item.id === selected)

  return <div className="drive-app">
    <header className="topbar">
      <button className="mobile-menu icon-button" onClick={() => setMobileNav(!mobileNav)} aria-label="เปิดเมนู"><Grid2X2 size={20}/></button>
      <a className="brand" href="#" onClick={e => { e.preventDefault(); activateView('all') }}><span className="brand-mark"><Cloud size={25} strokeWidth={2.1}/></span><span>Koo <b>Drive</b></span></a>
      <div className="search-wrap"><Search size={19}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="ค้นหาใน Drive" aria-label="ค้นหาใน Drive"/>{query && <button className="search-clear" onClick={() => setQuery('')} aria-label="ล้างการค้นหา"><X size={16}/></button>}<button className="search-options" title="ตัวเลือกการค้นหา"><Settings2 size={19}/></button></div>
      <div className="top-actions"><button className="icon-button" title="ความช่วยเหลือ" onClick={() => setModal('connect')}><CircleHelp size={20}/></button><button className="icon-button" title="การแจ้งเตือน"><Bell size={19}/></button><button className="profile" title="บัญชี Koo Mean">K</button></div>
    </header>

    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="new-wrap"><button className="new-button" onClick={() => setNewMenu(!newMenu)}><Plus size={22} strokeWidth={2.3}/><span>ใหม่</span><ChevronDown size={16}/></button>{newMenu && <div className="new-menu"><button onClick={() => { setNewMenu(false); setModal('folder') }}><FolderPlus size={17}/>โฟลเดอร์ใหม่</button><button onClick={() => { setNewMenu(false); uploadRef.current?.click() }}><Upload size={17}/>อัปโหลดไฟล์</button></div>}</div>
      <nav className="main-nav">
        <button className={view === 'all' ? 'nav-item active' : 'nav-item'} onClick={() => activateView('all')}><HardDrive size={19}/><span>ไฟล์ของฉัน</span></button>
        <button className={view === 'recent' ? 'nav-item active' : 'nav-item'} onClick={() => activateView('recent')}><Archive size={19}/><span>ล่าสุด</span></button>
        <button className={view === 'starred' ? 'nav-item active' : 'nav-item'} onClick={() => activateView('starred')}><Star size={19}/><span>ติดดาว</span></button>
        <button className={view === 'trash' ? 'nav-item active' : 'nav-item'} onClick={() => activateView('trash')}><Trash2 size={19}/><span>ถังขยะ</span></button>
      </nav>
      <div className="sidebar-divider"/>
      <button className="nav-item connect-nav" onClick={() => setModal('connect')}><CloudUpload size={19}/><span>เชื่อมต่อ Synology</span><span className="soon-dot"/></button>
      <div className="sidebar-bottom"><div className="storage-icon"><Cloud size={18}/></div><p className="storage-title">พื้นที่ทำงานในเครื่อง</p><p className="storage-copy">ไฟล์จะบันทึกในเบราว์เซอร์นี้ จนกว่าจะเชื่อมต่อ Synology</p><button className="storage-button" onClick={() => setModal('connect')}>เตรียมการเชื่อมต่อ</button></div>
    </aside>

    {mobileNav && <button className="nav-backdrop" onClick={() => setMobileNav(false)} aria-label="ปิดเมนู"/>}
    <main className="main-content">
      <div className="connection-banner"><span className="status-dot"/><span>โหมดในเครื่อง</span><span className="banner-sep">·</span><span>ยังไม่ได้เชื่อมต่อ Synology Drive</span><button onClick={() => setModal('connect')}>ตั้งค่าการเชื่อมต่อ <ChevronRight size={14}/></button></div>
      <div className="content-heading"><div className="heading-title"><h1>{heading}</h1>{view === 'all' && crumbs.length > 0 && <div className="breadcrumbs"><button onClick={() => setPath('/')}>ไฟล์ของฉัน</button>{crumbs.map((crumb, i) => <span key={`${crumb}-${i}`}><ChevronRight size={15}/><button onClick={() => setPath('/' + crumbs.slice(0, i + 1).join('/'))}>{crumb}</button></span>)}</div>}</div>
        <div className="heading-actions"><button className="view-toggle" title="แสดงแบบรายการ" onClick={() => setLayout('list')}><LayoutList size={18} className={layout === 'list' ? 'chosen' : ''}/></button><button className="view-toggle" title="แสดงแบบตาราง" onClick={() => setLayout('grid')}><Grid2X2 size={17} className={layout === 'grid' ? 'chosen' : ''}/></button><span className="action-divider"/><button className="sort-button" onClick={() => setSort(sort === 'name' ? 'modifiedAt' : sort === 'modifiedAt' ? 'size' : 'name')}><ArrowUpDown size={16}/><span>{sort === 'name' ? 'ชื่อ' : sort === 'modifiedAt' ? 'แก้ไขล่าสุด' : 'ขนาด'}</span><ChevronDown size={14}/></button></div>
      </div>
      {selectedItem && <div className="selection-bar"><span>เลือก {selectedItem.name}</span><button onClick={() => toggleStar(selectedItem)}><Star size={17}/>{selectedItem.starred ? 'นำดาวออก' : 'ติดดาว'}</button>{selectedItem.type === 'file' && <button onClick={() => void downloadItem(selectedItem)}><Download size={17}/>ดาวน์โหลด</button>}{view === 'trash' ? <button onClick={async () => { await drive.restore(selectedItem.id); setSelected(null); await loadItems(); notify('กู้คืนไฟล์แล้ว') }}><ArrowLeft size={17}/>กู้คืน</button> : <button onClick={() => void trashItem(selectedItem)}><Trash2 size={17}/>ย้ายไปถังขยะ</button>}<button className="selection-close" onClick={() => setSelected(null)} aria-label="ยกเลิกการเลือก"><X size={18}/></button></div>}
      <section className={`file-area ${layout === 'grid' ? 'grid-layout' : ''}`}>
        {visible.length ? <>
          <div className="table-head"><span>ชื่อ</span><span>เจ้าของ</span><span>แก้ไขล่าสุด</span><span>ขนาดไฟล์</span><span/></div>
          {visible.map(item => <div key={item.id} className={`file-row ${selected === item.id ? 'row-selected' : ''}`} onClick={() => setSelected(selected === item.id ? null : item.id)} onDoubleClick={() => item.type === 'folder' ? openFolder(item) : (setPreview(item), setModal('preview'))}>
            <div className="file-name"><FileGlyph item={item}/><span className="filename-text">{item.name}</span>{item.starred && <Star size={14} className="star-mark" fill="currentColor"/>}{item.demo && <span className="sample-chip">ตัวอย่าง</span>}</div>
            <div className="owner-cell"><span className="owner-avatar">K</span><span>ฉัน</span></div>
            <div className="date-cell">{formatter.format(new Date(item.modifiedAt))}</div><div className="size-cell">{item.type === 'folder' ? '—' : sizeLabel(item.size)}</div>
            <div className="row-menu-wrap"><button className="row-more" aria-label={`ตัวเลือก ${item.name}`} onClick={e => { e.stopPropagation(); setSelected(item.id); setMenuFor(menuFor === item.id ? null : item.id) }}><MoreHorizontal size={20}/></button>
              {menuFor === item.id && <div className="item-menu" onClick={e => e.stopPropagation()}>{view === 'trash' ? <button onClick={async () => { await drive.restore(item.id); setMenuFor(null); await loadItems(); notify('กู้คืนไฟล์แล้ว') }}><ArrowLeft size={16}/>กู้คืน</button> : <><button onClick={() => { setMenuFor(null); void toggleStar(item) }}><Star size={16}/>{item.starred ? 'นำดาวออก' : 'เพิ่มลงรายการติดดาว'}</button>{item.type === 'file' && <button onClick={() => { setMenuFor(null); void downloadItem(item) }}><Download size={16}/>ดาวน์โหลด</button>}<button onClick={() => { setMenuFor(null); void renameItem(item) }}><FileText size={16}/>เปลี่ยนชื่อ</button><button className="danger-action" onClick={() => void trashItem(item)}><Trash2 size={16}/>ย้ายไปถังขยะ</button></>}</div>}</div>
          </div>)}
          <div className="table-summary">{filesCount} ไฟล์{view === 'all' ? 'ในโฟลเดอร์นี้' : ''}</div>
        </> : <div className="empty-state"><div className="empty-art"><Folder size={40} strokeWidth={1.2}/><Search size={21}/></div><h2>{query ? 'ไม่พบไฟล์ที่ค้นหา' : view === 'trash' ? 'ถังขยะว่างเปล่า' : 'โฟลเดอร์นี้ยังว่างอยู่'}</h2><p>{query ? 'ลองค้นหาด้วยคำอื่น' : 'สร้างโฟลเดอร์หรืออัปโหลดไฟล์เพื่อเริ่มต้น'}</p>{!query && view !== 'trash' && <button className="upload-cta" onClick={() => uploadRef.current?.click()}><Upload size={17}/>อัปโหลดไฟล์</button>}</div>}
      </section>
      <input ref={uploadRef} type="file" multiple hidden onChange={e => void uploadFiles(e.target.files)}/>
    </main>

    {modal === 'folder' && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null) }}><div className="dialog"><div className="dialog-head"><h2>สร้างโฟลเดอร์ใหม่</h2><button className="icon-button" onClick={() => setModal(null)}><X size={19}/></button></div><label className="input-label" htmlFor="folder-name">ชื่อโฟลเดอร์</label><input id="folder-name" autoFocus value={folderName} onChange={e => setFolderName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void createFolder() }} placeholder="โฟลเดอร์ใหม่"/><div className="dialog-actions"><button className="subtle-button" onClick={() => setModal(null)}>ยกเลิก</button><button className="primary-button" onClick={() => void createFolder()}>สร้าง</button></div></div></div>}
    {modal === 'connect' && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null) }}><div className="dialog connect-dialog"><div className="dialog-head"><div className="dialog-icon"><Cloud size={22}/></div><button className="icon-button" onClick={() => setModal(null)}><X size={19}/></button></div><h2>พร้อมเชื่อมต่อ Synology Drive</h2><p className="dialog-copy">ตอนนี้ไฟล์ที่เพิ่มจะเก็บอยู่ในเบราว์เซอร์นี้ เมื่อพร้อมเชื่อมต่อ ให้ตั้งค่า backend bridge ไปยัง NAS เพื่อให้การเข้าสู่ระบบและจัดการไฟล์ทำงานอย่างปลอดภัย</p><div className="connect-steps"><div><span>1</span><p>ติดตั้ง backend bridge บนเครือข่ายที่เข้าถึง NAS ได้</p></div><div><span>2</span><p>ตั้งค่า URL ของ service และเปิด provider เป็น <code>synology</code></p></div><div><span>3</span><p>ตั้งค่าบัญชี Synology ฝั่ง server แล้วเริ่มซิงก์รายการไฟล์</p></div></div><div className="endpoint-card"><span>Drive provider</span><code>LocalDriveProvider</code><span className="endpoint-arrow"><ArrowUpDown size={15}/></span><span>SynologyDriveProvider</span></div><div className="dialog-actions"><button className="subtle-button" onClick={() => setModal(null)}>ปิด</button><button className="primary-button" onClick={() => { setModal(null); notify('เพิ่มไฟล์และโฟลเดอร์ได้จากปุ่ม “ใหม่”') }}>เข้าใจแล้ว <Check size={16}/></button></div></div></div>}
    {modal === 'preview' && preview && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null) }}><div className="dialog preview-dialog"><div className="dialog-head"><div className="preview-title"><FileGlyph item={preview}/><h2>{preview.name}</h2></div><div><button className="icon-button" onClick={() => void downloadItem(preview)} title="ดาวน์โหลด"><Download size={18}/></button><button className="icon-button" onClick={() => setModal(null)} title="ปิด"><X size={19}/></button></div></div>{preview.mimeType.startsWith('image/') && !preview.demo ? <ImagePreview item={preview}/> : <div className="preview-body"><div className="preview-large-icon"><FileGlyph item={preview} large/></div><p>{preview.demo ? 'ไฟล์ตัวอย่าง — อัปโหลดไฟล์จริงเพื่อดูตัวอย่างและดาวน์โหลด' : 'เพิ่มตัวอย่างไฟล์จากที่จัดเก็บในเบราว์เซอร์'}</p><span>{sizeLabel(preview.size)} · แก้ไข {formatter.format(new Date(preview.modifiedAt))}</span></div>}</div></div>}
    {toast && <div className="toast"><Check size={17}/>{toast}</div>}
    {menuFor && <button className="dismiss-menu" onClick={() => setMenuFor(null)} aria-label="ปิดเมนู"/>}
  </div>
}

function ImagePreview({ item }: { item: DriveItem }) {
  const [src, setSrc] = useState('')
  useEffect(() => { let url = ''; void new LocalDriveProvider().getDownload(item.id).then(result => { if (result) { url = URL.createObjectURL(result.blob); setSrc(url) } }); return () => { if (url) URL.revokeObjectURL(url) } }, [item.id])
  return src ? <img className="image-preview" src={src} alt={item.name}/> : <div className="preview-body"><p>ไม่พบภาพตัวอย่างนี้</p></div>
}
