PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_path TEXT NOT NULL,
    total_blocks INTEGER DEFAULT 0,
    scanned_blocks INTEGER DEFAULT 0,
    status TEXT CHECK(status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')) DEFAULT 'PENDING',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

CREATE TABLE IF NOT EXISTS carved_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_id INTEGER NOT NULL,
    physical_offset INTEGER NOT NULL,
    block_number INTEGER NOT NULL,
    inode_number INTEGER,
    file_type TEXT,
    entropy REAL NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    raw_hex_preview TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_carved_blocks_scan_id ON carved_blocks(scan_id);
CREATE INDEX IF NOT EXISTS idx_carved_blocks_is_deleted ON carved_blocks(is_deleted);
CREATE INDEX IF NOT EXISTS idx_carved_blocks_offset ON carved_blocks(physical_offset);