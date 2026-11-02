package com.grash.utils;

import com.grash.model.AdditionalCost;
import com.grash.model.Asset;
import com.grash.model.Checklist;
import com.grash.model.Company;
import com.grash.model.CustomField;
import com.grash.model.Customer;
import com.grash.model.FloorPlan;
import com.grash.model.Location;
import com.grash.model.Meter;
import com.grash.model.Part;
import com.grash.model.PreventiveMaintenance;
import com.grash.model.PurchaseOrder;
import com.grash.model.Request;
import com.grash.model.WorkOrder;
import com.grash.model.abstracts.BasicInfos;
import com.grash.model.abstracts.CategoryAbstract;
import com.grash.model.abstracts.WorkOrderBase;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.safety.Safelist;

/**
 * Central HTML-sanitization for user-supplied text stored by the API.
 * All free-text fields that end up rendered in a browser (SPA, emails,
 * PDF exports, print views) must go through {@link #cleanText(String)}
 * before being persisted.
 */
public final class Sanitizer {
    private static final Document.OutputSettings CLEAN_TEXT_OUTPUT_SETTINGS =
            new Document.OutputSettings().prettyPrint(false);

    /**
     * Strips all HTML markup from the input while keeping its readable text
     * (newlines preserved). Null-safe. The result never contains tags, so it is
     * safe to store as-is; rendering layers remain responsible for contextual
     * output-encoding (defense in depth).
     */
    public static String cleanText(String input) {
        if (input == null || input.isEmpty()) {
            return input;
        }

        return Jsoup.clean(
                input,
                "",
                Safelist.none(),
                CLEAN_TEXT_OUTPUT_SETTINGS
        ).trim();
    }

    private static void sanitizeWorkOrderBase(WorkOrderBase workOrderBase) {
        workOrderBase.setTitle(cleanText(workOrderBase.getTitle()));
        workOrderBase.setDescription(cleanText(workOrderBase.getDescription()));
    }

    public static void sanitizeRequest(Request request) {
        sanitizeWorkOrderBase(request);
        request.setCancellationReason(cleanText(request.getCancellationReason()));
    }

    public static void sanitizeWorkOrder(WorkOrder workOrder) {
        sanitizeWorkOrderBase(workOrder);
        workOrder.setFeedback(cleanText(workOrder.getFeedback()));
    }

    public static void sanitizePreventiveMaintenance(PreventiveMaintenance preventiveMaintenance) {
        sanitizeWorkOrderBase(preventiveMaintenance);
        preventiveMaintenance.setName(cleanText(preventiveMaintenance.getName()));
    }

    public static void sanitizeAsset(Asset asset) {
        asset.setName(cleanText(asset.getName()));
        asset.setDescription(cleanText(asset.getDescription()));
        asset.setArea(cleanText(asset.getArea()));
        asset.setAdditionalInfos(cleanText(asset.getAdditionalInfos()));
        asset.setModel(cleanText(asset.getModel()));
        asset.setPower(cleanText(asset.getPower()));
        asset.setManufacturer(cleanText(asset.getManufacturer()));
        asset.setSerialNumber(cleanText(asset.getSerialNumber()));
    }

    public static void sanitizeLocation(Location location) {
        location.setName(cleanText(location.getName()));
        location.setAddress(cleanText(location.getAddress()));
    }

    public static void sanitizePart(Part part) {
        part.setName(cleanText(part.getName()));
        part.setDescription(cleanText(part.getDescription()));
        part.setArea(cleanText(part.getArea()));
        part.setAdditionalInfos(cleanText(part.getAdditionalInfos()));
        part.setUnit(cleanText(part.getUnit()));
    }

    public static void sanitizeMeter(Meter meter) {
        meter.setName(cleanText(meter.getName()));
        meter.setUnit(cleanText(meter.getUnit()));
    }

    private static void sanitizeBasicInfos(BasicInfos basicInfos) {
        basicInfos.setName(cleanText(basicInfos.getName()));
        basicInfos.setAddress(cleanText(basicInfos.getAddress()));
        basicInfos.setPhone(cleanText(basicInfos.getPhone()));
        basicInfos.setWebsite(cleanText(basicInfos.getWebsite()));
    }

    public static void sanitizeCustomer(Customer customer) {
        sanitizeBasicInfos(customer);
        customer.setCustomerType(cleanText(customer.getCustomerType()));
        customer.setDescription(cleanText(customer.getDescription()));
        customer.setBillingName(cleanText(customer.getBillingName()));
        customer.setBillingAddress(cleanText(customer.getBillingAddress()));
        customer.setBillingAddress2(cleanText(customer.getBillingAddress2()));
    }

    public static void sanitizeChecklist(Checklist checklist) {
        checklist.setName(cleanText(checklist.getName()));
        checklist.setDescription(cleanText(checklist.getDescription()));
        checklist.setCategory(cleanText(checklist.getCategory()));
    }

    public static void sanitizeAdditionalCost(AdditionalCost additionalCost) {
        additionalCost.setDescription(cleanText(additionalCost.getDescription()));
    }

    public static void sanitizeCategory(CategoryAbstract category) {
        category.setName(cleanText(category.getName()));
        category.setDescription(cleanText(category.getDescription()));
    }

    public static void sanitizePurchaseOrder(PurchaseOrder purchaseOrder) {
        purchaseOrder.setName(cleanText(purchaseOrder.getName()));
        purchaseOrder.setShippingAdditionalDetail(cleanText(purchaseOrder.getShippingAdditionalDetail()));
        purchaseOrder.setShippingShipToName(cleanText(purchaseOrder.getShippingShipToName()));
        purchaseOrder.setShippingCompanyName(cleanText(purchaseOrder.getShippingCompanyName()));
        purchaseOrder.setShippingAddress(cleanText(purchaseOrder.getShippingAddress()));
        purchaseOrder.setShippingCity(cleanText(purchaseOrder.getShippingCity()));
        purchaseOrder.setShippingState(cleanText(purchaseOrder.getShippingState()));
        purchaseOrder.setShippingZipCode(cleanText(purchaseOrder.getShippingZipCode()));
        purchaseOrder.setShippingPhone(cleanText(purchaseOrder.getShippingPhone()));
        purchaseOrder.setShippingFax(cleanText(purchaseOrder.getShippingFax()));
        purchaseOrder.setAdditionalInfoRequisitionedName(cleanText(purchaseOrder.getAdditionalInfoRequisitionedName()));
        purchaseOrder.setAdditionalInfoShippingOrderCategory(cleanText(purchaseOrder.getAdditionalInfoShippingOrderCategory()));
        purchaseOrder.setAdditionalInfoTerm(cleanText(purchaseOrder.getAdditionalInfoTerm()));
        purchaseOrder.setAdditionalInfoNotes(cleanText(purchaseOrder.getAdditionalInfoNotes()));
    }

    public static void sanitizeFloorPlan(FloorPlan floorPlan) {
        floorPlan.setName(cleanText(floorPlan.getName()));
    }

    public static void sanitizeCompany(Company company) {
        company.setName(cleanText(company.getName()));
        company.setAddress(cleanText(company.getAddress()));
        company.setPhone(cleanText(company.getPhone()));
        company.setWebsite(cleanText(company.getWebsite()));
        company.setCity(cleanText(company.getCity()));
        company.setState(cleanText(company.getState()));
        company.setZipCode(cleanText(company.getZipCode()));
    }

    public static void sanitizeCustomField(CustomField customField) {
        customField.setName(cleanText(customField.getName()));
        customField.setValue(cleanText(customField.getValue()));
    }

    /**
     * Strips any directory components and non-portable characters from a client-supplied
     * upload filename before it is embedded in a storage object key. Null-safe.
     */
    public static String sanitizeFilename(String originalFilename) {
        String name = (originalFilename == null || originalFilename.isBlank()) ? "unnamed" : originalFilename;
        name = org.springframework.util.StringUtils.cleanPath(name);
        int lastSeparator = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
        if (lastSeparator >= 0) {
            name = name.substring(lastSeparator + 1);
        }
        name = name.replaceAll("[^a-zA-Z0-9._-]", "_");
        return name.isEmpty() ? "unnamed" : name;
    }
}
