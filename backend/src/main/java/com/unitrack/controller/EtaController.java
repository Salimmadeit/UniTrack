package com.unitrack.controller;

import com.unitrack.dto.EtaResponse;
import com.unitrack.service.EtaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/eta")
public class EtaController {

    private final EtaService etaService;

    public EtaController(EtaService etaService) {
        this.etaService = etaService;
    }

    /**
     * No try/catch here on purpose: {@code EtaService} throws
     * {@code ResourceNotFoundException}, which {@code GlobalExceptionHandler}
     * renders as the documented 404 body. The previous version returned a bare
     * string, so the frontend could not parse the error consistently.
     *
     * <p>The return type is {@code EtaResponse} rather than {@code ?} so the
     * contract is visible in the signature.</p>
     */
    @GetMapping
    public ResponseEntity<EtaResponse> getEta(@RequestParam double lat, @RequestParam double lng) {
        return ResponseEntity.ok(etaService.calculateEta(lat, lng));
    }
}
