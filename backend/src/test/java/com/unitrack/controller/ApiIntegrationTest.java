package com.unitrack.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.unitrack.model.QueueStatus;
import com.unitrack.repository.QueueStatusRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

import static org.hamcrest.Matchers.lessThan;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end HTTP contract tests.
 *
 * <p>These exercise the real controllers, services, validation and JPA layer
 * against an in-memory database, so they catch the class of bug a unit test
 * cannot: wrong status codes, wrong JSON field names, validation that is
 * declared but never triggered.</p>
 *
 * <p>Note on ordering: {@code DataSeeder} populates routes, stops and an
 * initial location on startup, so these tests assume data exists rather than
 * asserting on an empty database.</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
class ApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private QueueStatusRepository queueStatusRepository;

    /**
     * Resets the queue row to a known, safely-backdated state.
     *
     * <p>The queue is a single shared row and the debounce is time-based, so
     * without this the tests are order-dependent: one test leaving "PACKED"
     * behind makes the next test's identical report a debounced 429 rather than
     * the 200 it expects. Backdating past the window means no test can inherit
     * another's timer, whatever order JUnit picks.
     */
    @BeforeEach
    void resetQueueState() {
        QueueStatus status = queueStatusRepository.findById(1L).orElseGet(QueueStatus::new);
        status.setId(1L);
        status.setLevel("LOW");
        status.setSource("DISPATCHER");
        status.setUpdatedAt(Instant.now().minus(1, ChronoUnit.HOURS));
        queueStatusRepository.save(status);
    }

    private String json(Object value) throws Exception {
        return objectMapper.writeValueAsString(value);
    }

    @Test
    @DisplayName("GET /api/v1/health reports UP")
    void healthReturnsUp() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    @DisplayName("POST /api/v1/location stores a valid reading and echoes it back")
    void postLocationAcceptsValidPayload() throws Exception {
        String payload = json(Map.of(
                "latitude", 6.5185,
                "longitude", 3.3895,
                "speed", 18.5,
                "heading", 90.0
        ));

        mockMvc.perform(post("/api/v1/location")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.latitude").value(6.5185))
                .andExpect(jsonPath("$.longitude").value(3.3895))
                .andExpect(jsonPath("$.speed").value(18.5))
                // updatedAt is server-generated: the client must never set it.
                .andExpect(jsonPath("$.updatedAt").exists());
    }

    @Test
    @DisplayName("POST /api/v1/location rejects an out-of-range latitude with the documented error shape")
    void postLocationRejectsInvalidLatitude() throws Exception {
        String payload = json(Map.of("latitude", 200.0, "longitude", 3.3895));

        mockMvc.perform(post("/api/v1/location")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation failed"))
                .andExpect(jsonPath("$.details").isArray());
    }

    @Test
    @DisplayName("POST /api/v1/location rejects a missing latitude")
    void postLocationRejectsMissingLatitude() throws Exception {
        String payload = json(Map.of("longitude", 3.3895));

        mockMvc.perform(post("/api/v1/location")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation failed"));
    }

    @Test
    @DisplayName("POST /api/v1/location rejects a negative speed")
    void postLocationRejectsNegativeSpeed() throws Exception {
        String payload = json(Map.of(
                "latitude", 6.5185,
                "longitude", 3.3895,
                "speed", -5.0
        ));

        mockMvc.perform(post("/api/v1/location")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation failed"));
    }

    @Test
    @DisplayName("Location uses a single row: two POSTs overwrite rather than accumulate")
    void locationIsSingletonRow() throws Exception {
        mockMvc.perform(post("/api/v1/location")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("latitude", 6.5100, "longitude", 3.3800))))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/location")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("latitude", 6.5300, "longitude", 3.4000))))
                .andExpect(status().isOk());

        // The GET must return the second reading: the spec calls for the latest
        // position only, not a history table. The primary key is deliberately
        // absent from the response - it is a database detail, not part of the
        // published contract.
        mockMvc.perform(get("/api/v1/location"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.latitude").value(6.5300))
                .andExpect(jsonPath("$.longitude").value(3.4000))
                .andExpect(jsonPath("$.id").doesNotExist());
    }

    /**
     * The bug this guards against: {@code updatedAt} was a LocalDateTime, so it
     * serialised with no timezone offset. The container runs in UTC and phones on
     * campus are UTC+1, and a browser reads an offset-less datetime as local
     * time - so a reading posted a second ago appeared to be an hour old and the
     * student view showed "offline" while the marker was visibly moving.
     *
     * <p>Two guarantees make that impossible to reintroduce: the timestamp is an
     * absolute instant (trailing Z, no interpretation required), and the server
     * publishes the age it measured itself so no client ever has to subtract two
     * clocks.
     */
    @Test
    @DisplayName("A freshly posted location reports a near-zero age and a UTC-qualified timestamp")
    void freshLocationIsNotReportedAsStale() throws Exception {
        mockMvc.perform(post("/api/v1/location")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("latitude", 6.5185, "longitude", 3.3895, "speed", 15.0))))
                .andExpect(status().isOk());

        String body = mockMvc.perform(get("/api/v1/location"))
                .andExpect(status().isOk())
                // Well inside the 15s NORMAL window: anything near 3600 is the
                // timezone bug returning.
                .andExpect(jsonPath("$.ageSeconds").value(lessThan(5)))
                .andExpect(jsonPath("$.serverTime").exists())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode payload = objectMapper.readTree(body);
        String updatedAt = payload.get("updatedAt").asText();

        org.junit.jupiter.api.Assertions.assertTrue(
                updatedAt.endsWith("Z"),
                "updatedAt must be an absolute UTC instant so no client has to guess "
                        + "a timezone, but was: " + updatedAt);

        // And the instant must genuinely be recent, not merely well-formatted.
        long ageSeconds = Duration.between(Instant.parse(updatedAt), Instant.now()).getSeconds();
        org.junit.jupiter.api.Assertions.assertTrue(
                Math.abs(ageSeconds) < 60,
                "updatedAt should be within a minute of now, but was " + ageSeconds + "s off");
    }

    @Test
    @DisplayName("The ETA of a freshly posted location is NORMAL, not DISCONNECTED")
    void freshLocationYieldsNormalConfidence() throws Exception {
        mockMvc.perform(post("/api/v1/location")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("latitude", 6.5210, "longitude", 3.3930, "speed", 20.0))))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/eta").param("lat", "6.5167").param("lng", "3.3850"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.confidence").value("NORMAL"));
    }

    @Test
    @DisplayName("POST /api/v1/queue accepts a valid level")
    void postQueueAcceptsValidLevel() throws Exception {
        mockMvc.perform(post("/api/v1/queue")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("level", "MODERATE"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.level").value("MODERATE"))
                .andExpect(jsonPath("$.updatedAt").exists());
    }

    @Test
    @DisplayName("POST /api/v1/queue rejects a level outside LOW/MODERATE/PACKED")
    void postQueueRejectsUnknownLevel() throws Exception {
        mockMvc.perform(post("/api/v1/queue")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("level", "EXTREMELY_BUSY"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation failed"));
    }

    @Test
    @DisplayName("GET /api/v1/queue returns the level most recently published")
    void getQueueReturnsLatestLevel() throws Exception {
        mockMvc.perform(post("/api/v1/queue")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("level", "PACKED"))))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/queue"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.level").value("PACKED"));
    }

    @Test
    @DisplayName("A student may report crowding, and the report is attributed to them")
    void studentCanReportQueueLevel() throws Exception {
        mockMvc.perform(post("/api/v1/queue")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("level", "MODERATE", "source", "STUDENT"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.level").value("MODERATE"))
                .andExpect(jsonPath("$.source").value("STUDENT"));

        mockMvc.perform(get("/api/v1/queue"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.source").value("STUDENT"));
    }

    @Test
    @DisplayName("An omitted source defaults to DISPATCHER, keeping the old contract working")
    void queueSourceDefaultsToDispatcher() throws Exception {
        mockMvc.perform(post("/api/v1/queue")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("level", "LOW"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.source").value("DISPATCHER"));
    }

    @Test
    @DisplayName("POST /api/v1/queue rejects an unrecognised source")
    void postQueueRejectsUnknownSource() throws Exception {
        mockMvc.perform(post("/api/v1/queue")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("level", "LOW", "source", "ROBOT"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation failed"));
    }

    /**
     * The spec's 10-second debounce has to be enforced here, not only in the
     * dispatcher page: the endpoint is public and unauthenticated, so a
     * browser-side guard can simply be bypassed.
     *
     * <p>429 rather than 400 because the payload was valid - the caller was
     * merely early - and the body still carries the current queue state so a
     * rejected client does not need a second request to refresh.
     */
    @Test
    @DisplayName("An immediate repeat of the same level is debounced with 429 and Retry-After")
    void repeatedIdenticalQueueReportIsDebounced() throws Exception {
        mockMvc.perform(post("/api/v1/queue")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("level", "PACKED", "source", "DISPATCHER"))))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/queue")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("level", "PACKED", "source", "DISPATCHER"))))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                // Still reports the live state, so the UI can render from it.
                .andExpect(jsonPath("$.level").value("PACKED"));
    }

    /**
     * The debounce must not swallow a genuine change of state. A global
     * "one report per 10 seconds" lock would, and that is the difference between
     * suppressing a double-tap and losing the report that the stop just went
     * from Moderate to Packed.
     */
    @Test
    @DisplayName("A different level is accepted immediately, even inside the debounce window")
    void changedQueueLevelIsNotDebounced() throws Exception {
        mockMvc.perform(post("/api/v1/queue")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("level", "LOW", "source", "DISPATCHER"))))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/queue")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("level", "PACKED", "source", "DISPATCHER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.level").value("PACKED"));
    }

    @Test
    @DisplayName("GET /api/v1/eta returns every field the student UI renders")
    void getEtaReturnsFullPayload() throws Exception {
        // Seed a known position first so the ETA is deterministic.
        mockMvc.perform(post("/api/v1/location")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "latitude", 6.5210,
                                "longitude", 3.3930,
                                "speed", 20.0))))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/eta").param("lat", "6.5167").param("lng", "3.3850"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.etaMinutes").exists())
                .andExpect(jsonPath("$.distanceKm").exists())
                .andExpect(jsonPath("$.shuttleSpeed").value(20.0))
                .andExpect(jsonPath("$.confidence").value("NORMAL"))
                .andExpect(jsonPath("$.walkingMinutes").exists())
                .andExpect(jsonPath("$.walkingFaster").exists())
                .andExpect(jsonPath("$.queueWaitMinutes").exists())
                .andExpect(jsonPath("$.nearestStop").exists());
    }

    @Test
    @DisplayName("GET /api/v1/eta without coordinates returns 400, not 500")
    void getEtaRequiresCoordinates() throws Exception {
        mockMvc.perform(get("/api/v1/eta"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation failed"));
    }

    @Test
    @DisplayName("GET /api/v1/eta with a non-numeric coordinate returns 400")
    void getEtaRejectsNonNumericCoordinates() throws Exception {
        mockMvc.perform(get("/api/v1/eta").param("lat", "abc").param("lng", "3.3850"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation failed"));
    }

    @Test
    @DisplayName("GET /api/v1/routes returns seeded routes with their stops")
    void getRoutesReturnsSeededData() throws Exception {
        mockMvc.perform(get("/api/v1/routes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].name").exists())
                .andExpect(jsonPath("$[0].stops").isArray())
                .andExpect(jsonPath("$[0].stops[0].name").exists())
                .andExpect(jsonPath("$[0].stops[0].latitude").exists());
    }

    /**
     * The bare hostname is the first thing anyone opens to check a deployment
     * is alive. It used to 404 because every route is under /api/v1, which
     * looks like a broken deploy on a perfectly healthy service.
     */
    @Test
    @DisplayName("GET / returns a service index rather than 404")
    void rootReturnsServiceIndex() throws Exception {
        mockMvc.perform(get("/"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.endpoints.health").exists())
                .andExpect(jsonPath("$.endpoints.eta").exists());
    }

    /**
     * Regression: the catch-all {@code @ExceptionHandler(Exception.class)} used
     * to claim Spring's NoResourceFoundException and answer 500, so a typo in a
     * URL looked exactly like a server crash. Anyone debugging a deployment
     * would go hunting for a broken backend instead of a wrong path.
     */
    @Test
    @DisplayName("An unknown path returns 404, not 500")
    void unknownPathReturnsNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/does-not-exist"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Not found"));
    }

    /**
     * The old handler echoed the raw exception message, which for a missing
     * path was Spring's internal "No static resource ..." text. That discloses
     * how the application resolves requests, so assert it is not leaked.
     */
    @Test
    @DisplayName("A 404 body does not leak internal resolver details")
    void notFoundDoesNotLeakInternals() throws Exception {
        String responseBody = mockMvc.perform(get("/some-random-path"))
                .andExpect(status().isNotFound())
                .andReturn()
                .getResponse()
                .getContentAsString();

        org.junit.jupiter.api.Assertions.assertFalse(
                responseBody.contains("static resource"),
                "404 response leaked Spring's internal message: " + responseBody);
    }

    @Test
    @DisplayName("The wrong HTTP verb on a real endpoint returns 405")
    void wrongMethodReturnsMethodNotAllowed() throws Exception {
        // /api/v1/location exists, but only POST writes to it.
        mockMvc.perform(post("/api/v1/routes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.error").value("Method not allowed"));
    }
}
