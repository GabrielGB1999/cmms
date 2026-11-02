package com.grash.service;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Weekly triggers fire every week; "every 2 weeks" must skip the weeks in between. */
class ScheduleWeekIntervalTest {

    private static final ZoneId ZONE = ZoneId.of("Europe/Paris");

    private static Date day(int year, int month, int dayOfMonth) {
        return Date.from(LocalDate.of(year, month, dayOfMonth).atTime(9, 0).atZone(ZONE).toInstant());
    }

    @Test
    void everyTwoWeeksRunsOnlyOnEvenWeeks() {
        Date start = day(2026, 1, 5); // a Monday
        assertTrue(ScheduleService.isOnWeekInterval(start, day(2026, 1, 5), ZONE, 2));
        assertFalse(ScheduleService.isOnWeekInterval(start, day(2026, 1, 12), ZONE, 2));
        assertTrue(ScheduleService.isOnWeekInterval(start, day(2026, 1, 19), ZONE, 2));
        assertTrue(ScheduleService.isOnWeekInterval(start, day(2026, 1, 21), ZONE, 2)); // same week, Wednesday
    }
}
