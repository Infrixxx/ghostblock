package com.ghostblock.model;

public record Scan(
    Long id,
    String imagePath,
    Integer totalBlocks,
    Integer scannedBlocks,
    String status,
    String createdAt,
    String completedAt
) {}