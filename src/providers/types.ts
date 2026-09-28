export type DriveItem = {
  id: string
  name: string
  type: 'folder' | 'file'
  path: string
  mimeType: string
  size: number
  modifiedAt: string
  starred: boolean
  trashed: boolean
  demo?: boolean
}

/** Storage boundary: UI code only talks to this interface, never to a vendor API. */
export interface DriveProvider {
  list(path: string, view?: 'all' | 'starred' | 'trash' | 'recent'): Promise<DriveItem[]>
  createFolder(path: string, name: string): Promise<DriveItem>
  upload(path: string, file: File): Promise<DriveItem>
  rename(id: string, name: string): Promise<void>
  setStarred(id: string, starred: boolean): Promise<void>
  trash(id: string): Promise<void>
  restore(id: string): Promise<void>
  getDownload(id: string): Promise<{ blob: Blob; filename: string } | null>
}
