package com.ghostblock.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.concurrent.CompletableFuture;

@Service
public class ScannerProcessService {

    @Value("${ghostblock.scanner.binary}")
    private String binaryPath;

    @Value("${ghostblock.scanner.default-image}")
    private String defaultImage;

    @Value("${ghostblock.scanner.default-db}")
    private String defaultDb;

    public CompletableFuture<Integer> triggerScan(String imagePath, String dbPath) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                String targetImage = (imagePath != null && !imagePath.isBlank()) ? imagePath : defaultImage;
                String targetDb = (dbPath != null && !dbPath.isBlank()) ? dbPath : defaultDb;

                ProcessBuilder pb = new ProcessBuilder(
                    binaryPath,
                    "--image", targetImage,
                    "--db", targetDb
                );
                pb.redirectErrorStream(true);

                Process process = pb.start();

                try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        System.out.println("[RUST CLI] " + line);
                    }
                }

                return process.waitFor();
            } catch (Exception e) {
                throw new RuntimeException("Failed to execute scanner binary", e);
            }
        });
    }
}