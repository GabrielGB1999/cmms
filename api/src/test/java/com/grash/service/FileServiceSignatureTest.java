package com.grash.service;

import com.grash.exception.CustomException;
import com.grash.factory.StorageServiceFactory;
import com.grash.model.File;
import com.grash.model.enums.FileType;
import com.grash.repository.FileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;

import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Covers the base64 image path used to store signatures drawn on a canvas, which never goes through
 * the multipart upload endpoint and so carries its own validation.
 */
class FileServiceSignatureTest {

    /** 1x1 transparent PNG. */
    private static final String PNG_BASE64 =
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

    private FileRepository fileRepository;
    private StorageService storageService;
    private FileService fileService;

    @BeforeEach
    void setUp() {
        fileRepository = mock(FileRepository.class);
        storageService = mock(StorageService.class);
        StorageServiceFactory storageServiceFactory = mock(StorageServiceFactory.class);
        when(storageServiceFactory.getStorageService()).thenReturn(storageService);
        when(fileRepository.save(any(File.class))).thenAnswer(invocation -> invocation.getArgument(0));
        fileService = new FileService(fileRepository, storageServiceFactory);
    }

    @Test
    void uploadsThePngAndRecordsItAsAHiddenImage() {
        when(storageService.upload(any(), eq("signatures/7"))).thenReturn("signatures/7/xyz signature.png");

        File created = fileService.createFromImageDataUri("data:image/png;base64," + PNG_BASE64, "signature",
                "signatures/7");

        assertEquals("signature.png", created.getName());
        assertEquals("signatures/7/xyz signature.png", created.getPath());
        assertEquals(FileType.IMAGE, created.getType());
        assertTrue(created.isHidden(), "signatures must not show up in the company's file list");

        ArgumentCaptor<MultipartFile> uploaded = ArgumentCaptor.forClass(MultipartFile.class);
        verify(storageService).upload(uploaded.capture(), eq("signatures/7"));
        assertEquals("image/png", uploaded.getValue().getContentType());
        assertEquals(Base64.getDecoder().decode(PNG_BASE64).length, uploaded.getValue().getSize());
    }

    @Test
    void usesTheJpegExtensionForJpegPayloads() {
        when(storageService.upload(any(), any())).thenReturn("signatures/7/xyz signature.jpg");

        File created = fileService.createFromImageDataUri("data:image/jpeg;base64," + PNG_BASE64, "signature",
                "signatures/7");

        assertEquals("signature.jpg", created.getName());
    }

    @Test
    void rejectsAPayloadThatIsNotADataUri() {
        assertRejects("please store this");
    }

    @Test
    void rejectsANonImageDataUri() {
        assertRejects("data:text/html;base64," + Base64.getEncoder().encodeToString("<h1>hi</h1>".getBytes()));
    }

    @Test
    void rejectsInvalidBase64() {
        assertRejects("data:image/png;base64,!!!definitely not base64!!!");
    }

    @Test
    void rejectsAnImageOverTheSizeCap() {
        byte[] tooBig = new byte[2 * 1024 * 1024 + 1];
        assertRejects("data:image/png;base64," + Base64.getEncoder().encodeToString(tooBig));
    }

    private void assertRejects(String dataUri) {
        CustomException exception = assertThrows(CustomException.class,
                () -> fileService.createFromImageDataUri(dataUri, "signature", "signatures/7"));
        assertEquals(HttpStatus.NOT_ACCEPTABLE, exception.getHttpStatus());
        verify(storageService, never()).upload(any(), any());
        verify(fileRepository, never()).save(any());
    }
}
