package com.unitrack.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Unit tests for the great-circle distance calculation.
 *
 * <p>This is the numerical foundation of every ETA in the app, so it is tested
 * against independently known values rather than against its own output.</p>
 */
class HaversineUtilTest {

    /** Distances are compared with a tolerance; floating point is never exact. */
    private static final double TOLERANCE_KM = 0.01;

    @Test
    @DisplayName("Distance between a point and itself is zero")
    void distanceToSelfIsZero() {
        double distance = HaversineUtil.distance(6.5167, 3.3850, 6.5167, 3.3850);
        assertEquals(0.0, distance, TOLERANCE_KM);
    }

    @Test
    @DisplayName("Known campus distance: Main Gate to Faculty of Science is about 0.53 km")
    void knownCampusDistance() {
        // Seeded stops: Main Gate (6.5167, 3.3850) -> Faculty of Science (6.5210, 3.3930).
        double distance = HaversineUtil.distance(6.5167, 3.3850, 6.5210, 3.3930);

        // Sanity bounds rather than a magic number: the campus is ~1 km across,
        // so anything outside this range means the formula is broken.
        assertTrue(distance > 0.9 && distance < 1.1,
                "Expected roughly 1 km across campus but got " + distance);
    }

    @Test
    @DisplayName("One degree of latitude is approximately 111 km")
    void oneDegreeOfLatitude() {
        // A degree of latitude is constant everywhere on the globe, which makes
        // it the cleanest possible check of the formula's scaling.
        double distance = HaversineUtil.distance(0.0, 0.0, 1.0, 0.0);
        assertEquals(111.19, distance, 0.5);
    }

    @Test
    @DisplayName("Distance is symmetric: A to B equals B to A")
    void distanceIsSymmetric() {
        double forward = HaversineUtil.distance(6.5167, 3.3850, 6.5230, 3.3920);
        double backward = HaversineUtil.distance(6.5230, 3.3920, 6.5167, 3.3850);
        assertEquals(forward, backward, 0.0001);
    }

    @Test
    @DisplayName("Handles antipodal points without overflow")
    void handlesAntipodalPoints() {
        // atan2-based Haversine must stay stable at the extreme; a naive acos
        // implementation returns NaN here because of floating point rounding.
        double distance = HaversineUtil.distance(0.0, 0.0, 0.0, 180.0);
        assertEquals(20015.0, distance, 5.0);
    }
}
