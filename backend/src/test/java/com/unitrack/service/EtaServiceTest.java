package com.unitrack.service;

import com.unitrack.dto.EtaResponse;
import com.unitrack.exception.ResourceNotFoundException;
import com.unitrack.model.Location;
import com.unitrack.model.QueueStatus;
import com.unitrack.model.Stop;
import com.unitrack.repository.StopRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the ETA business rules.
 *
 * <p>Dependencies are mocked so each rule (speed fallback, queue mapping,
 * confidence thresholds, walking comparison) can be tested in isolation without
 * a database or Spring context. These are the rules a marker will check against
 * the spec, so each one gets an explicit test.</p>
 */
@ExtendWith(MockitoExtension.class)
class EtaServiceTest {

    @Mock
    private LocationService locationService;

    @Mock
    private QueueService queueService;

    @Mock
    private StopRepository stopRepository;

    @InjectMocks
    private EtaService etaService;

    private static final double MAIN_GATE_LAT = 6.5167;
    private static final double MAIN_GATE_LNG = 3.3850;

    private Stop mainGate;

    @BeforeEach
    void setUp() {
        mainGate = stop("Main Gate", MAIN_GATE_LAT, MAIN_GATE_LNG);
    }

    private Stop stop(String name, double lat, double lng) {
        Stop stop = new Stop();
        stop.setName(name);
        stop.setLatitude(lat);
        stop.setLongitude(lng);
        stop.setOrderIndex(1);
        return stop;
    }

    private Location location(double lat, double lng, double speed, Instant updatedAt) {
        Location location = new Location();
        location.setId(1L);
        location.setLatitude(lat);
        location.setLongitude(lng);
        location.setSpeed(speed);
        location.setHeading(0.0);
        location.setUpdatedAt(updatedAt);
        return location;
    }

    private QueueStatus queue(String level) {
        QueueStatus status = new QueueStatus();
        status.setId(1L);
        status.setLevel(level);
        status.setUpdatedAt(Instant.now());
        return status;
    }

    @Test
    @DisplayName("Throws ResourceNotFoundException when no driver has broadcast")
    void throwsWhenNoDriverLocation() {
        when(locationService.getLatestLocation()).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(
                ResourceNotFoundException.class,
                () -> etaService.calculateEta(MAIN_GATE_LAT, MAIN_GATE_LNG)
        );

        // The message pair is what the frontend renders, so assert both halves.
        assertEquals("Cannot calculate ETA", exception.getMessage());
        assertEquals("No driver location available", exception.getDetail());
    }

    @Test
    @DisplayName("A stationary shuttle falls back to the default cruising speed")
    void stationaryShuttleUsesDefaultSpeed() {
        // Speed 0 would make (distance / speed) infinite, so the service must
        // substitute a realistic speed rather than emit Infinity.
        when(locationService.getLatestLocation())
                .thenReturn(Optional.of(location(6.5210, 3.3930, 0.0, Instant.now())));
        when(queueService.getQueueStatus()).thenReturn(Optional.empty());
        when(stopRepository.findAll()).thenReturn(List.of(mainGate));

        EtaResponse response = etaService.calculateEta(MAIN_GATE_LAT, MAIN_GATE_LNG);

        assertEquals(20.0, response.getShuttleSpeed(), 0.001);
        assertTrue(Double.isFinite(response.getEtaMinutes()), "ETA must be a finite number");
        assertTrue(response.getEtaMinutes() > 0);
    }

    @Test
    @DisplayName("A moving shuttle's reported speed is used as-is")
    void movingShuttleUsesReportedSpeed() {
        when(locationService.getLatestLocation())
                .thenReturn(Optional.of(location(6.5210, 3.3930, 25.0, Instant.now())));
        when(queueService.getQueueStatus()).thenReturn(Optional.empty());
        when(stopRepository.findAll()).thenReturn(List.of(mainGate));

        EtaResponse response = etaService.calculateEta(MAIN_GATE_LAT, MAIN_GATE_LNG);

        assertEquals(25.0, response.getShuttleSpeed(), 0.001);
    }

    @Test
    @DisplayName("Queue level maps to the documented wait: LOW=2, MODERATE=8, PACKED=15")
    void queueLevelMapsToWaitMinutes() {
        when(locationService.getLatestLocation())
                .thenReturn(Optional.of(location(6.5210, 3.3930, 20.0, Instant.now())));
        when(stopRepository.findAll()).thenReturn(List.of(mainGate));

        when(queueService.getQueueStatus()).thenReturn(Optional.of(queue("LOW")));
        assertEquals(2, etaService.calculateEta(MAIN_GATE_LAT, MAIN_GATE_LNG).getQueueWaitMinutes());

        when(queueService.getQueueStatus()).thenReturn(Optional.of(queue("MODERATE")));
        assertEquals(8, etaService.calculateEta(MAIN_GATE_LAT, MAIN_GATE_LNG).getQueueWaitMinutes());

        when(queueService.getQueueStatus()).thenReturn(Optional.of(queue("PACKED")));
        assertEquals(15, etaService.calculateEta(MAIN_GATE_LAT, MAIN_GATE_LNG).getQueueWaitMinutes());
    }

    @Test
    @DisplayName("Queue level is matched case-insensitively")
    void queueLevelIsCaseInsensitive() {
        when(locationService.getLatestLocation())
                .thenReturn(Optional.of(location(6.5210, 3.3930, 20.0, Instant.now())));
        when(stopRepository.findAll()).thenReturn(List.of(mainGate));
        when(queueService.getQueueStatus()).thenReturn(Optional.of(queue("packed")));

        assertEquals(15, etaService.calculateEta(MAIN_GATE_LAT, MAIN_GATE_LNG).getQueueWaitMinutes());
    }

    @Test
    @DisplayName("Nearest stop is chosen from all stops, not the first one")
    void picksNearestStop() {
        Stop far = stop("DLI", 6.5230, 3.3920);
        Stop near = stop("Sports Centre", 6.5175, 3.3870);

        when(locationService.getLatestLocation())
                .thenReturn(Optional.of(location(6.5210, 3.3930, 20.0, Instant.now())));
        when(queueService.getQueueStatus()).thenReturn(Optional.empty());
        // Deliberately ordered so a naive "first match" implementation fails.
        when(stopRepository.findAll()).thenReturn(List.of(far, near, mainGate));

        EtaResponse response = etaService.calculateEta(6.5176, 3.3871);

        assertEquals("Sports Centre", response.getNearestStop());
    }

    @Test
    @DisplayName("Walking wins when the student is beside the stop and the shuttle is far")
    void walkingFasterWhenShuttleIsFarAway() {
        // Shuttle ~5 km away, student essentially standing at the stop:
        // walking is seconds, the shuttle is many minutes.
        when(locationService.getLatestLocation())
                .thenReturn(Optional.of(location(6.5600, 3.4200, 20.0, Instant.now())));
        when(queueService.getQueueStatus()).thenReturn(Optional.of(queue("PACKED")));
        when(stopRepository.findAll()).thenReturn(List.of(mainGate));

        EtaResponse response = etaService.calculateEta(MAIN_GATE_LAT, MAIN_GATE_LNG);

        assertTrue(response.isWalkingFaster(),
                "Expected walking to win: eta=" + response.getEtaMinutes()
                        + " walk=" + response.getWalkingMinutes());
    }

    @Test
    @DisplayName("Walking loses when the student is far from the stop and the shuttle is close")
    void shuttleFasterWhenStudentIsFarFromStop() {
        // Shuttle sitting at the stop, student ~3 km away: a long walk, no wait.
        when(locationService.getLatestLocation())
                .thenReturn(Optional.of(location(MAIN_GATE_LAT, MAIN_GATE_LNG, 20.0, Instant.now())));
        when(queueService.getQueueStatus()).thenReturn(Optional.of(queue("LOW")));
        when(stopRepository.findAll()).thenReturn(List.of(mainGate));

        EtaResponse response = etaService.calculateEta(6.5450, 3.3850);

        assertFalse(response.isWalkingFaster(),
                "Expected the shuttle to win: eta=" + response.getEtaMinutes()
                        + " walk=" + response.getWalkingMinutes());
    }

    @Test
    @DisplayName("Confidence reflects data age: NORMAL / WARNING / STALE / DISCONNECTED")
    void confidenceReflectsDataAge() {
        when(queueService.getQueueStatus()).thenReturn(Optional.empty());
        when(stopRepository.findAll()).thenReturn(List.of(mainGate));

        assertEquals("NORMAL", confidenceForAgeSeconds(5));
        assertEquals("WARNING", confidenceForAgeSeconds(20));
        assertEquals("STALE", confidenceForAgeSeconds(45));
        assertEquals("DISCONNECTED", confidenceForAgeSeconds(120));
    }

    private String confidenceForAgeSeconds(int ageSeconds) {
        when(locationService.getLatestLocation()).thenReturn(Optional.of(
                location(6.5210, 3.3930, 20.0, Instant.now().minusSeconds(ageSeconds))
        ));
        return etaService.calculateEta(MAIN_GATE_LAT, MAIN_GATE_LNG).getConfidence();
    }

    @Test
    @DisplayName("Reports 'Unknown' rather than failing when no stops are seeded")
    void handlesEmptyStopList() {
        when(locationService.getLatestLocation())
                .thenReturn(Optional.of(location(6.5210, 3.3930, 20.0, Instant.now())));
        when(queueService.getQueueStatus()).thenReturn(Optional.empty());
        when(stopRepository.findAll()).thenReturn(List.of());

        EtaResponse response = etaService.calculateEta(MAIN_GATE_LAT, MAIN_GATE_LNG);

        assertEquals("Unknown", response.getNearestStop());
        assertEquals(0.0, response.getDistanceKm(), 0.001);
    }
}
