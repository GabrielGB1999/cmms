package com.grash.controller;

import com.grash.dto.SuccessResponse;
import com.grash.exception.CustomException;
import com.grash.model.OwnUser;
import com.grash.model.enums.RoleCode;
import com.grash.service.UserService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Pattern;

/**
 * Runs scripts/backup/atlas-backup.sh (database + MinIO files) for administrators.
 * The script is mounted into the API container and talks to the host's Docker daemon;
 * see docker-compose.yml.
 */
@RestController
@RequestMapping("/backup")
@Tag(name = "backup")
@RequiredArgsConstructor
public class BackupController {

    // Absolute path, plain characters only; a segment can't start with "." so no "." / ".." segments.
    private static final Pattern SAFE_PATH = Pattern.compile("^(/[A-Za-z0-9_\\-][A-Za-z0-9._\\-]*)+/?$");
    private static final AtomicBoolean RUNNING = new AtomicBoolean(false);

    private final UserService userService;

    @Value("${backup.script:/app/backup/atlas-backup.sh}")
    private String scriptPath;

    @PostMapping("")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public SuccessResponse backup(@RequestBody Map<String, String> body, HttpServletRequest req) {
        OwnUser user = userService.whoami(req);
        if (user.getRole().getCode() != RoleCode.ADMIN) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }
        String path = body.get("path");
        if (!isSafePath(path)) {
            throw new CustomException("Invalid path: use an absolute path like /var/backups/atlas",
                    HttpStatus.BAD_REQUEST);
        }
        if (!RUNNING.compareAndSet(false, true)) {
            throw new CustomException("A backup is already running", HttpStatus.CONFLICT);
        }
        try {
            // shortcut: runs synchronously inside the request; a reverse proxy with a short read timeout
            // may drop the response on big instances (the backup still finishes). Make it async if that bites.
            Process process = new ProcessBuilder("bash", scriptPath, "backup", "--output", path)
                    .redirectErrorStream(true)
                    .start();
            process.getOutputStream().close();
            // drain before waiting, or mc's per-file output fills the pipe and the script blocks
            String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8).trim();
            int exitCode = process.waitFor();
            String lastLine = output.substring(output.lastIndexOf('\n') + 1);
            if (exitCode != 0) {
                throw new CustomException("Backup failed: " + lastLine, HttpStatus.INTERNAL_SERVER_ERROR);
            }
            return new SuccessResponse(true, lastLine);
        } catch (IOException e) {
            throw new CustomException("Could not run backup script: " + e.getMessage(),
                    HttpStatus.INTERNAL_SERVER_ERROR);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new CustomException("Backup interrupted", HttpStatus.INTERNAL_SERVER_ERROR);
        } finally {
            RUNNING.set(false);
        }
    }

    static boolean isSafePath(String path) {
        return path != null && path.length() <= 255 && SAFE_PATH.matcher(path).matches();
    }
}
