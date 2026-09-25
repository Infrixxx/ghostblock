package com.ghostblock.model;

public record CarvedBlock(
    Long id,
    Long scanId,
    Long physicalOffset,
    Long blockNumber,
    Long inodeNumber,
    String fileType,
    Double entropy,
    Boolean isDeleted,
    String rawHexPreview,
    String createdAt
) {}