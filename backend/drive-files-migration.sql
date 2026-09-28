CREATE TABLE IF NOT EXISTS drive_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('folder', 'file')),
  path TEXT NOT NULL DEFAULT '/',
  object_key TEXT UNIQUE,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes INTEGER NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
  modified_at TEXT NOT NULL,
  starred INTEGER NOT NULL DEFAULT 0 CHECK (starred IN (0, 1)),
  trashed INTEGER NOT NULL DEFAULT 0 CHECK (trashed IN (0, 1)),
  created_by TEXT NOT NULL,
  CHECK ((type = 'folder' AND object_key IS NULL) OR (type = 'file' AND object_key IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS drive_items_path_idx ON drive_items(path, trashed, type, name);
CREATE INDEX IF NOT EXISTS drive_items_starred_idx ON drive_items(starred, trashed, modified_at);
