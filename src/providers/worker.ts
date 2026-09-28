import type { DriveItem, DriveProvider } from './types'

const API_URL = import.meta.env.VITE_DRIVE_API_URL || 'https://koomean-proxy.meanchannel52.workers.dev'
export type DriveUser = { email: string; name: string; roles: string[]; isAdmin: boolean }

export class WorkerDriveProvider implements DriveProvider {
  user: DriveUser | null = null
  constructor(private readonly idToken: string) {}

  private async action<T>(action: string, values: Record<string, string> = {}): Promise<T> {
    const body = new URLSearchParams({ action, idToken: this.idToken, ...values })
    const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body, cache: 'no-store' })
    const data = await response.json() as T & { message?: string; success?: boolean }
    if (!response.ok || data.success === false) throw new Error(data.message || `Drive request failed (${response.status})`)
    return data
  }

  async list(path: string, view: 'all' | 'starred' | 'trash' | 'recent' = 'all') {
    const result = await this.action<{ items: DriveItem[]; user: DriveUser }>('driveList', { path, view })
    this.user = result.user
    return result.items
  }
  async createFolder(path: string, name: string) { const result = await this.action<{ item: DriveItem }>('driveCreateFolder', { path, name }); return result.item }
  async upload(path: string, file: File) {
    const form = new FormData(); form.set('idToken', this.idToken); form.set('path', path); form.set('file', file)
    const response = await fetch(`${API_URL}/drive/upload`, { method: 'POST', body: form, cache: 'no-store' })
    const data = await response.json() as { item?: DriveItem; message?: string; success?: boolean }
    if (!response.ok || data.success === false || !data.item) throw new Error(data.message || `Upload failed (${response.status})`)
    return data.item
  }
  async replace(id: string, file: File) {
    const form = new FormData(); form.set('idToken', this.idToken); form.set('id', id); form.set('file', file)
    const response = await fetch(`${API_URL}/drive/replace`, { method: 'POST', body: form, cache: 'no-store' })
    const data = await response.json() as { item?: DriveItem; message?: string; success?: boolean }
    if (!response.ok || data.success === false || !data.item) throw new Error(data.message || `Replace failed (${response.status})`)
    return data.item
  }
  async rename(id: string, name: string) { await this.action('driveRename', { id, name }) }
  async setStarred(id: string, starred: boolean) { await this.action('driveSetStarred', { id, starred: String(starred) }) }
  async trash(id: string) { await this.action('driveTrash', { id }) }
  async restore(id: string) { await this.action('driveRestore', { id }) }
  async getDownload(id: string) {
    const body = new URLSearchParams({ action: 'driveDownload', idToken: this.idToken, id })
    const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body, cache: 'no-store' })
    if (!response.ok) {
      let message = 'ดาวน์โหลดไฟล์ไม่สำเร็จ'
      try { message = (await response.json() as { message?: string }).message || message } catch { /* binary or empty response */ }
      throw new Error(message)
    }
    const disposition = response.headers.get('content-disposition') || ''
    const utf8Name = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
    const legacyName = disposition.match(/filename="?([^";]+)"?/i)?.[1]
    return { blob: await response.blob(), filename: utf8Name ? decodeURIComponent(utf8Name) : legacyName || 'file' }
  }
}
