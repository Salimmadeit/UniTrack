package com.unitrack.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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

        // The GET must return the second reading, and the id must still be 1:
        // the spec calls for the latest position only, not a history table.
        mockMvc.perform(get("/api/v1/location"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.latitude").value(6.5300))
                .andExpect(jsonPath("$.longitude").value(3.4000));
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
