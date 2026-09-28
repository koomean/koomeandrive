import type { DriveItem, DriveProvider } from './types'

/**
 * Same-origin backend bridge for Synology Drive. Keep DSM credentials and API
 * sessions on the server; never put them in browser storage or this bundle.
 * Set VITE_DRIVE_PROVIDER=synology only after the backend bridge is deployed.
 */
const API_BASE = import.meta.env.VITE_DRIVE_API_BASE || '/api/drive'
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } })
  if (!response.ok) throw new Error(`Drive service returned ${response.status}`)
  return response.json() as Promise<T>
}
export class SynologyDriveProvider implements DriveProvider {
  async list(path: string, view = 'all') { const q = new URLSearchParams({ path, view }); return request<DriveItem[]>(`/items?${q}`) }
  async createFolder(path: string, name: string) { return request<DriveItem>('/folders', { method: 'POST', body: JSON.stringify({ path, name }) }) }
  async upload(path: string, file: File) {
    const body = new FormData(); body.set('path', path); body.set('file', file)
    const response = await fetch(`${API_BASE}/files`, { method: 'POST', body })
    if (!response.ok) throw new Error(`Drive service returned ${response.status}`)
    return response.json() as Promise<DriveItem>
  }
  async rename(id: string, name: string) { await request(`/items/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ name }) }) }
  async setStarred(id: string, starred: boolean) { await request(`/items/${encodeURIComponent(id)}/star`, { method: 'PUT', body: JSON.stringify({ starred }) }) }
  async trash(id: string) { await request(`/items/${encodeURIComponent(id)}/trash`, { method: 'POST' }) }
  async restore(id: string) { await request(`/items/${encodeURIComponent(id)}/restore`, { method: 'POST' }) }
  async getDownload(id: string) { const response = await fetch(`${API_BASE}/items/${encodeURIComponent(id)}/download`); if (!response.ok) throw new Error(`Drive service returned ${response.status}`); return { blob: await response.blob(), filename: response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'download' } }
}
