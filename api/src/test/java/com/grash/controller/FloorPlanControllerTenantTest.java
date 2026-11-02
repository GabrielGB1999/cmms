package com.grash.controller;

import com.grash.exception.CustomException;
import com.grash.mapper.FloorPlanMapper;
import com.grash.model.Company;
import com.grash.model.FloorPlan;
import com.grash.model.Location;
import com.grash.model.OwnUser;
import com.grash.service.FloorPlanService;
import com.grash.service.LocationService;
import com.grash.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Floor plans carry no company of their own and load their location lazily, so the CompanyAudit
 * guard never runs for them; the controller must check the owning company itself.
 */
class FloorPlanControllerTenantTest {

    private final FloorPlanService floorPlanService = mock(FloorPlanService.class);
    private final UserService userService = mock(UserService.class);
    private final FloorPlanController controller = new FloorPlanController(
            floorPlanService, userService, mock(LocationService.class), mock(FloorPlanMapper.class));
    private final HttpServletRequest req = mock(HttpServletRequest.class);

    private static Company company(long id) {
        Company company = new Company();
        company.setId(id);
        return company;
    }

    private void givenFloorPlanOfCompany(long ownerCompanyId, long callerCompanyId) {
        Location location = new Location();
        location.setCompany(company(ownerCompanyId));
        FloorPlan floorPlan = new FloorPlan();
        floorPlan.setLocation(location);
        when(floorPlanService.findById(7L)).thenReturn(Optional.of(floorPlan));
        OwnUser caller = new OwnUser();
        caller.setCompany(company(callerCompanyId));
        when(userService.whoami(any())).thenReturn(caller);
    }

    @Test
    void anotherCompanysFloorPlanIsNotFoundAndNotDeleted() {
        givenFloorPlanOfCompany(1, 2);
        CustomException ex = assertThrows(CustomException.class, () -> controller.delete(7L, req));
        assertEquals(HttpStatus.NOT_FOUND, ex.getHttpStatus());
        verify(floorPlanService, never()).delete(any());
    }

    @Test
    void ownFloorPlanIsDeleted() {
        givenFloorPlanOfCompany(1, 1);
        controller.delete(7L, req);
        verify(floorPlanService).delete(7L);
    }
}
