use rusqlite::{Connection, Result};

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new(path: &str) -> Result<Self> {
        let conn = Connection::open(path)?;
        conn.execute_batch("PRAGMA journal_mode = WAL;")?;
        Ok(Self { conn })
    }

    pub fn begin_transaction(&mut self) -> Result<()> {
        self.conn.execute_batch("BEGIN TRANSACTION;")
    }

    pub fn commit_transaction(&mut self) -> Result<()> {
        self.conn.execute_batch("COMMIT;")
    }

    pub fn create_scan(&self, image_path: &str, total_blocks: i64) -> Result<i64> {
        self.conn.execute(
            "INSERT INTO scans (image_path, total_blocks, status) VALUES (?1, ?2, 'RUNNING')",
            rusqlite::params![image_path, total_blocks],
        )?;
        Ok(self.conn.last_insert_rowid())
    }

    pub fn complete_scan(&self, scan_id: i64) -> Result<()> {
        self.conn.execute(
            "UPDATE scans SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP WHERE id = ?1",
            rusqlite::params![scan_id],
        )?;
        Ok(())
    }

    pub fn insert_block(
        &self,
        scan_id: i64,
        physical_offset: i64,
        block_number: i64,
        entropy: f64,
        is_deleted: bool,
        hex_preview: &str,
    ) -> Result<()> {
        self.conn.execute(
            "INSERT INTO carved_blocks (scan_id, physical_offset, block_number, entropy, is_deleted, raw_hex_preview) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![scan_id, physical_offset, block_number, entropy, is_deleted, hex_preview],
        )?;
        Ok(())
    }
}