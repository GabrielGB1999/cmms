package com.grash.controller;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BackupControllerTest {

    @Test
    void acceptsPlainAbsolutePaths() {
        assertTrue(BackupController.isSafePath("/var/backups/atlas"));
        assertTrue(BackupController.isSafePath("/mnt/nas-1/atlas_backups.d/"));
    }

    @Test
    void rejectsRelativeTraversalAndShellCharacters() {
        for (String p : new String[]{null, "", "/", "relative/dir", "/var/../etc", "/var/./x", "/a/..",
                "/a b", "/a;rm -rf /", "/a$(id)", "/a`id`", "-x", "/a//b", "/a\nb", "/.hidden"}) {
            assertFalse(BackupController.isSafePath(p), String.valueOf(p));
        }
    }
}
