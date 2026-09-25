package com.ghostblock.controller;

import com.ghostblock.model.CarvedBlock;
import com.ghostblock.model.Scan;
import com.ghostblock.service.BlockService;
import com.ghostblock.service.ScannerProcessService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HexFormat;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ForensicController {

    private final BlockService blockService;
    private final ScannerProcessService scannerProcessService;

    public ForensicController(BlockService blockService, ScannerProcessService scannerProcessService) {
        this.blockService = blockService;
        this.scannerProcessService = scannerProcessService;
    }

    @PostMapping("/scan")
    public ResponseEntity<Map<String, String>> startScan(
        @RequestParam(required = false) String imagePath,
        @RequestParam(required = false) String dbPath
    ) {
        scannerProcessService.triggerScan(imagePath, dbPath);
        return ResponseEntity.accepted().body(Map.of(
            "status", "ACCEPTED",
            "message", "Scanner execution triggered successfully."
        ));
    }

    @GetMapping("/scans")
    public ResponseEntity<List<Scan>> listScans() {
        return ResponseEntity.ok(blockService.getScans());
    }

    @GetMapping("/blocks")
    public ResponseEntity<List<CarvedBlock>> listBlocks(
        @RequestParam Long scanId,
        @RequestParam(defaultValue = "false") Boolean deletedOnly,
        @RequestParam(defaultValue = "100") int limit,
        @RequestParam(defaultValue = "0") int offset
    ) {
        return ResponseEntity.ok(blockService.getBlocks(scanId, deletedOnly, limit, offset));
    }

    @GetMapping("/blocks/{id}/raw")
    public ResponseEntity<Map<String, Object>> getRawSector(
        @RequestParam String imagePath,
        @RequestParam long offset,
        @RequestParam(defaultValue = "512") int length
    ) {
        try {
            byte[] bytes = blockService.readRawSector(imagePath, offset, length);
            String hexString = HexFormat.of().formatHex(bytes);

            return ResponseEntity.ok(Map.of(
                "offset", offset,
                "length", bytes.length,
                "hex", hexString
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}