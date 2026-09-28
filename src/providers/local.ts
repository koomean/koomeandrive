import type { DriveItem, DriveProvider } from './types'

const META_KEY = 'koo-drive-items-v1'
const DB_NAME = 'koo-drive-files-v1'
const seed: DriveItem[] = [
  { id: 'f-design', name: 'Design', type: 'folder', path: '/', mimeType: 'folder', size: 0, modifiedAt: '2026-09-24T09:20:00Z', starred: true, trashed: false, demo: true },
  { id: 'f-personal', name: 'Personal', type: 'folder', path: '/', mimeType: 'folder', size: 0, modifiedAt: '2026-09-21T14:30:00Z', starred: false, trashed: false, demo: true },
  { id: 'f-projects', name: 'Projects', type: 'folder', path: '/', mimeType: 'folder', size: 0, modifiedAt: '2026-09-18T10:00:00Z', starred: false, trashed: false, demo: true },
  { id: 'd-brand', name: 'Brand guidelines.pdf', type: 'file', path: '/Design', mimeType: 'application/pdf', size: 2840000, modifiedAt: '2026-09-24T09:18:00Z', starred: true, trashed: false, demo: true },
  { id: 'd-mood', name: 'Moodboard 2026.png', type: 'file', path: '/Design', mimeType: 'image/png', size: 4250000, modifiedAt: '2026-09-22T11:42:00Z', starred: false, trashed: false, demo: true },
  { id: 'p-notes', name: 'Notes.txt', type: 'file', path: '/Personal', mimeType: 'text/plain', size: 3200, modifiedAt: '2026-09-21T14:20:00Z', starred: false, trashed: false, demo: true },
  { id: 'p-trip', name: 'Chiang Mai trip.jpg', type: 'file', path: '/Personal', mimeType: 'image/jpeg', size: 3820000, modifiedAt: '2026-09-19T08:12:00Z', starred: false, trashed: false, demo: true },
  { id: 'pr-plan', name: 'Project plan.docx', type: 'file', path: '/Projects', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 846000, modifiedAt: '2026-09-18T09:52:00Z', starred: false, trashed: false, demo: true },
  { id: 'pr-budget', name: 'Budget 2026.xlsx', type: 'file', path: '/Projects', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 1290000, modifiedAt: '2026-09-16T15:10:00Z', starred: false, trashed: false, demo: true },
]

function readItems(): DriveItem[] {
  try { const raw = localStorage.getItem(META_KEY); if (raw) return JSON.parse(raw) as DriveItem[] } catch { /* use fresh sample data */ }
  localStorage.setItem(META_KEY, JSON.stringify(seed))
  return seed
}
function save(items: DriveItem[]) { localStorage.setItem(META_KEY, JSON.stringify(items)) }
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('blobs')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
async function putBlob(id: string, file: Blob) {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => { const tx = db.transaction('blobs', 'readwrite'); tx.objectStore('blobs').put(file, id); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error) })
  db.close()
}
async function getBlob(id: string): Promise<Blob | undefined> {
  const db = await openDb()
  const value = await new Promise<Blob | undefined>((resolve, reject) => { const req = db.transaction('blobs').objectStore('blobs').get(id); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error) })
  db.close(); return value
}

export class LocalDriveProvider implements DriveProvider {
  async list(path: string, view: 'all' | 'starred' | 'trash' | 'recent' = 'all') {
    const items = readItems()
    const filtered = items.filter(item => {
      if (view === 'trash') return item.trashed
      if (item.trashed) return false
      if (view === 'starred') return item.starred
      if (view === 'recent') return true
      return item.path === path
    })
    if (view === 'recent') filtered.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))
    return filtered
  }
  async createFolder(path: string, name: string) {
    const item: DriveItem = { id: crypto.randomUUID(), name, type: 'folder', path, mimeType: 'folder', size: 0, modifiedAt: new Date().toISOString(), starred: false, trashed: false }
    save([...readItems(), item]); return item
  }
  async upload(path: string, file: File) {
    const item: DriveItem = { id: crypto.randomUUID(), name: file.name, type: 'file', path, mimeType: file.type || 'application/octet-stream', size: file.size, modifiedAt: new Date().toISOString(), starred: false, trashed: false }
    await putBlob(item.id, file); save([...readItems(), item]); return item
  }
  async rename(id: string, name: string) { save(readItems().map(item => item.id === id ? { ...item, name, modifiedAt: new Date().toISOString() } : item)) }
  async setStarred(id: string, starred: boolean) { save(readItems().map(item => item.id === id ? { ...item, starred } : item)) }
  async trash(id: string) { save(readItems().map(item => item.id === id ? { ...item, trashed: true } : item)) }
  async restore(id: string) { save(readItems().map(item => item.id === id ? { ...item, trashed: false } : item)) }
  async getDownload(id: string) { const item = readItems().find(x => x.id === id); if (!item) return null; const blob = await getBlob(id); return blob ? { blob, filename: item.name } : null }
}
