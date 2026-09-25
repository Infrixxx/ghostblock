package com.ghostblock.service;

import com.ghostblock.model.CarvedBlock;
import com.ghostblock.model.Scan;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.RandomAccessFile;
import java.util.List;

@Service
public class BlockService {

    private final JdbcTemplate jdbcTemplate;

    public BlockService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<Scan> scanRowMapper = (rs, rowNum) -> new Scan(
        rs.getLong("id"),
        rs.getString("image_path"),
        rs.getInt("total_blocks"),
        rs.getInt("scanned_blocks"),
        rs.getString("status"),
        rs.getString("created_at"),
        rs.getString("completed_at")
    );

    private final RowMapper<CarvedBlock> blockRowMapper = (rs, rowNum) -> new CarvedBlock(
        rs.getLong("id"),
        rs.getLong("scan_id"),
        rs.getLong("physical_offset"),
        rs.getLong("block_number"),
        rs.getObject("inode_number") != null ? rs.getLong("inode_number") : null,
        rs.getString("file_type"),
        rs.getDouble("entropy"),
        rs.getBoolean("is_deleted"),
        rs.getString("raw_hex_preview"),
        rs.getString("created_at")
    );

    public List<Scan> getScans() {
        return jdbcTemplate.query("SELECT * FROM scans ORDER BY id DESC", scanRowMapper);
    }

    public List<CarvedBlock> getBlocks(Long scanId, Boolean deletedOnly, int limit, int offset) {
        String sql = "SELECT * FROM carved_blocks WHERE scan_id = ? " +
                     (deletedOnly ? "AND is_deleted = 1 " : "") +
                     "ORDER BY block_number ASC LIMIT ? OFFSET ?";
        return jdbcTemplate.query(sql, blockRowMapper, scanId, limit, offset);
    }

    public byte[] readRawSector(String imagePath, long physicalOffset, int length) throws Exception {
        File file = new File(imagePath);
        if (!file.exists()) {
            throw new IllegalArgumentException("Image file not found: " + imagePath);
        }

        try (RandomAccessFile raf = new RandomAccessFile(file, "r")) {
            raf.seek(physicalOffset);
            byte[] buffer = new byte[length];
            int read = raf.read(buffer);
            if (read < length) {
                byte[] trimmed = new byte[Math.max(0, read)];
                System.arraycopy(buffer, 0, trimmed, 0, trimmed.length);
                return trimmed;
            }
            return buffer;
        }
    }
}