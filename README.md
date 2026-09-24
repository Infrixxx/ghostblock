# Ghost Block

**Ghost Block** is an educational digital forensics tool that demonstrates storage persistence at the operating system and block level. It exposes how deleted files remain intact on disk media until explicitly overwritten, pairing low-level filesystem structure parsing with Shannon entropy analysis and an interactive visualizer.

## Core Architecture

Ghost Block follows a decoupled three-tier architecture:

* **`scanner-core/` (Rust):** Low-level CLI parsing `ext4` superblocks, unlinked inode tables, and physical block extents with high-throughput Shannon entropy scoring.
* **`api-gateway/` (Java):** Orchestrates scanner executions via OS process controls and serves parsed sector data via REST endpoints.
* **`dashboard/` (React):** Color-coded hex viewer mapping raw magic bytes, metadata headers, and dangling payloads.
* **`data/`:** Storage location for raw disk images and SQLite runtime databases.

---

## Controlled Forensic Test Bed

To verify file recovery deterministically, `create_sample.sh` produces a self-contained 50MB `ext4` disk image containing active and deleted files:

| File Name | Intended State | Content Type | Expected Entropy Profile |
| --- | --- | --- | --- |
| `active_system_log.txt` | Active (Allocated) | Plain ASCII log | ~4.0 (Structured text) |
| `deleted_credentials.txt` | Deleted (Unlinked Inode) | Configuration key-values | ~4.1 (Low entropy) |
| `deleted_invoice.pdf` | Deleted (Unlinked Inode) | Magic bytes `%PDF-1.5` + stream | Variable |
| `deleted_archive.bin` | Deleted (Unlinked Inode) | Raw `/dev/urandom` bytes | ~7.9+ (Encrypted/compressed) |

### Generating the Image

```bash
chmod +x create_sample.sh
sudo ./create_sample.sh

```

---

## Database Architecture

Ghost Block uses an embedded SQLite database (`data/ghostblock.sqlite`) with Write-Ahead Logging (WAL) enabled as the shared persistence bus between the Rust scanner and the Java API gateway.

### Schema Entities

* **`scans`**: Tracks high-level scan sessions, target disk paths, block counts, and execution states (`PENDING`, `RUNNING`, `COMPLETED`, `FAILED`).
* **`carved_blocks`**: Stores granular disk artifacts identified during parsing:
* `physical_offset`: Byte position relative to disk origin.
* `block_number`: Filesystem-level block index (`offset / blockSize`).
* `inode_number`: Pointer to the owning metadata structure (if resolved from ext4 tables).
* `file_type`: Detected MIME type or magic byte classification (e.g., `PDF`, `JPEG`, `TEXT`).
* `entropy`: Shannon entropy score (0.0000 to 8.0000).
* `is_deleted`: Boolean flag indicating if the block belongs to an unlinked inode or slack area.
* `raw_hex_preview`: First 64 bytes of sector content encoded in hex for dashboard previews.



### Execution Verification

To run a benchmark scan against a controlled image and verify extracted blocks:

```bash
cd scanner-core
cargo build --release
./target/release/ghost-block-cli --image ../data/sample.img --db ../data/ghostblock.sqlite

# Query extracted block metrics
sqlite3 ../data/ghostblock.sqlite "SELECT COUNT(*) AS total_blocks, AVG(entropy) AS mean_entropy FROM carved_blocks;"

```