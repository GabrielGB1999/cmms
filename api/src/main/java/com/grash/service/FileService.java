package com.grash.service;

import com.grash.advancedsearch.SearchCriteria;
import com.grash.advancedsearch.SpecificationBuilder;
import com.grash.exception.CustomException;
import com.grash.factory.StorageServiceFactory;
import com.grash.model.File;
import com.grash.model.OwnUser;
import com.grash.model.enums.FileType;
import com.grash.model.enums.RoleType;
import com.grash.repository.FileRepository;
import com.grash.utils.MultipartFileImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.Base64;
import java.util.Collection;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class FileService {
    private static final Pattern IMAGE_DATA_URI = Pattern.compile("^data:image/(png|jpe?g);base64,(.+)$",
            Pattern.DOTALL);
    private static final int MAX_DECODED_IMAGE_SIZE = 2 * 1024 * 1024;

    private final FileRepository fileRepository;
    private final StorageServiceFactory storageServiceFactory;
    private AssetService assetService;
    private PartService partService;
    private RequestService requestService;
    private WorkOrderService workOrderService;
    private LocationService locationService;

    @Autowired
    public void setDeps(@Lazy AssetService assetService, @Lazy PartService partService,
                        @Lazy RequestService requestService, @Lazy LocationService locationService,
                        @Lazy WorkOrderService workOrderService
    ) {
        this.assetService = assetService;
        this.partService = partService;
        this.requestService = requestService;
        this.locationService = locationService;
        this.workOrderService = workOrderService;
    }

    public File create(File File) {
        return fileRepository.save(File);
    }

    /**
     * Decodes a base64 image data URI, uploads it to the configured object storage and records it as
     * a hidden file. Used for images the user draws or generates in the client rather than picks from
     * disk, which therefore never reach the multipart upload endpoint.
     *
     * @param dataUri a {@code data:image/png;base64,...} (or JPEG) URI
     * @param name    file name without its extension
     * @param folder  destination folder in the storage bucket
     */
    public File createFromImageDataUri(String dataUri, String name, String folder) {
        Matcher matcher = IMAGE_DATA_URI.matcher(dataUri.trim());
        if (!matcher.matches())
            throw new CustomException("Only PNG or JPEG images encoded as a base64 data URI are accepted",
                    HttpStatus.NOT_ACCEPTABLE);
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(matcher.group(2).replaceAll("\\s", ""));
        } catch (IllegalArgumentException exception) {
            throw new CustomException("The image is not valid base64", HttpStatus.NOT_ACCEPTABLE);
        }
        if (bytes.length == 0) throw new CustomException("The image is empty", HttpStatus.NOT_ACCEPTABLE);
        if (bytes.length > MAX_DECODED_IMAGE_SIZE)
            throw new CustomException("The image exceeds the maximum size of "
                    + MAX_DECODED_IMAGE_SIZE / (1024 * 1024) + "MB", HttpStatus.NOT_ACCEPTABLE);
        String fileName = name + (matcher.group(1).equals("png") ? ".png" : ".jpg");
        String path = storageServiceFactory.getStorageService().upload(new MultipartFileImpl(bytes, fileName), folder);
        return create(new File(fileName, path, FileType.IMAGE, null, true));
    }

    public File update(File File) {
        return fileRepository.save(File);
    }

    public Collection<File> getAll() {
        return fileRepository.findAll();
    }

    public void delete(Long id) {
        fileRepository.deleteById(id);
    }

    public Optional<File> findById(Long id) {
        return fileRepository.findById(id);
    }

    public Collection<File> findByCompany(Long id) {
        return fileRepository.findByCompany_Id(id);
    }

    public Page<File> findBySearchCriteria(SearchCriteria searchCriteria) {
        SpecificationBuilder<File> builder = new SpecificationBuilder<>();
        searchCriteria.getFilterFields().forEach(builder::with);
        Pageable page = PageRequest.of(searchCriteria.getPageNum(), searchCriteria.getPageSize(),
                searchCriteria.getDirection(), searchCriteria.getSortField());
        return fileRepository.findAll(builder.build(), page);
    }
}
