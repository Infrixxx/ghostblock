#!/usr/bin/env bash
set -euo pipefail

# Ensure the script is run with root privileges (required for loopback mounting)
if [ "$EUID" -ne 0 ]; then
  echo "[!] Please run this script with sudo: sudo ./create_sample.sh"
  exit 1
fi

DATA_DIR="./data"
IMAGE_PATH="${DATA_DIR}/sample.img"
MOUNT_POINT="/mnt/ghost_sample"

mkdir -p "${DATA_DIR}"
mkdir -p "${MOUNT_POINT}"

echo "[*] Step 1: Allocating a clean 50MB zeroed disk image..."
dd if=/dev/zero of="${IMAGE_PATH}" bs=1M count=50 status=progress

echo "[*] Step 2: Formatting image as ext4 with 4KB block size..."
# -b 4096 sets standard 4KB blocks; -F forces format on a raw file
mkfs.ext4 -b 4096 -F "${IMAGE_PATH}"

echo "[*] Step 3: Mounting disk image via loop device..."
mount -o loop "${IMAGE_PATH}" "${MOUNT_POINT}"

echo "[*] Step 4: Writing sample payloads..."

# 1. Plain text file (Will remain active / not deleted)
cat << 'EOF' > "${MOUNT_POINT}/active_system_log.txt"
[INFO] System initialized successfully.
[INFO] Monitoring daemon started on port 8080.
[INFO] Active services: API Gateway, SQLite Store.
EOF

# 2. Sensitive text file (Low entropy ~4.1, will be DELETED)
cat << 'EOF' > "${MOUNT_POINT}/deleted_credentials.txt"
DATABASE_USER=admin
DATABASE_SECRET_TOKEN=GHOST_BLOCK_FORENSIC_KEY_99218
SERVER_INTERNAL_IP=10.0.4.15
API_BEARER_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
EOF

# 3. PDF mock file with standard magic bytes '%PDF-1.5' (Will be DELETED)
printf '%%PDF-1.5\n%%\xe2\xe3\xcf\xd3\n' > "${MOUNT_POINT}/deleted_invoice.pdf"
head -c 2048 /dev/urandom >> "${MOUNT_POINT}/deleted_invoice.pdf"
printf '\n%%%%EOF\n' >> "${MOUNT_POINT}/deleted_invoice.pdf"

# 4. High-entropy block (Simulated encrypted container or archive, ~7.9+ entropy, will be DELETED)
dd if=/dev/urandom of="${MOUNT_POINT}/deleted_archive.bin" bs=4K count=4 status=none

echo "[*] Step 5: Flushing file buffers to ensure physical block allocation..."
sync

echo "[*] Step 6: Deleting target files to orphan inodes..."
rm "${MOUNT_POINT}/deleted_credentials.txt"
rm "${MOUNT_POINT}/deleted_invoice.pdf"
rm "${MOUNT_POINT}/deleted_archive.bin"

# Sync again so the filesystem updates inodes (dtime set, links_count = 0)
sync

echo "[*] Step 7: Unmounting..."
umount "${MOUNT_POINT}"
rmdir "${MOUNT_POINT}"

echo "[+] Success! Sample disk image generated at: ${IMAGE_PATH}"
echo "[+] Size: $(du -h "${IMAGE_PATH}" | cut -f1)"