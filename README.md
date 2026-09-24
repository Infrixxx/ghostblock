# Ghost Block

**Ghost Block** is an educational digital forensics tool that demonstrates storage persistence at the operating system and block level. It exposes how deleted files remain intact on disk media until explicitly overwritten, pairing low-level filesystem structure parsing with Shannon entropy analysis and an interactive visualizer.

## Core Architecture

Ghost Block follows a decoupled three-tier architecture:
- **`scanner-core/` (Rust):** Low-level CLI parsing `ext4` superblocks, unlinked inode tables, and physical block extents with high-throughput Shannon entropy scoring.
- **`api-gateway/` (Java):** Orchestrates scanner executions via OS process controls and serves parsed sector data via REST endpoints.
- **`dashboard/` (React):** Color-coded hex viewer mapping raw magic bytes, metadata headers, and dangling payloads.
- **`data/`:** Storage location for raw disk images and SQLite runtime databases.

---

## Controlled Forensic Test Bed

To verify file recovery deterministically, `create_sample.sh` produces a self-contained 50MB `ext4` disk image containing active and deleted files:

| File Name | Intended State | Content Type | Expected Entropy Profile |
| :--- | :--- | :--- | :--- |
| `active_system_log.txt` | Active (Allocated) | Plain ASCII log | ~4.0 (Structured text) |
| `deleted_credentials.txt` | Deleted (Unlinked Inode) | Configuration key-values | ~4.1 (Low entropy) |
| `deleted_invoice.pdf` | Deleted (Unlinked Inode) | Magic bytes `%PDF-1.5` + stream | Variable |
| `deleted_archive.bin` | Deleted (Unlinked Inode) | Raw `/dev/urandom` bytes | ~7.9+ (Encrypted/compressed) |

### Generating the Image
```bash
chmod +x create_sample.sh
sudo ./create_sample.sh