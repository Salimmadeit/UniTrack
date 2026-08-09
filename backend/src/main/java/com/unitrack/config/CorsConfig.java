package com.unitrack.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * CORS policy for the API.
 *
 * <p>The allowlist is injected from configuration rather than hardcoded, so a
 * deployment can be locked down to its real frontend origin through an
 * environment variable instead of a recompile.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    private final String allowedOrigins;

    public CorsConfig(@Value("${unitrack.cors.allowed-origins:*}") String allowedOrigins) {
        this.allowedOrigins = allowedOrigins;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        String[] origins = allowedOrigins.split("\\s*,\\s*");

        registry.addMapping("/api/**")
                // allowedOriginPatterns, not allowedOrigins: the plain variant
                // rejects "*" outright once credentials are ever enabled, and
                // it cannot express wildcards like https://*.netlify.app. The
                // pattern variant handles both, so the same code works for a
                // permissive default and a locked-down production allowlist.
                .allowedOriginPatterns(origins)
                // No PUT or DELETE: the API only reads and appends.
                .allowedMethods("GET", "POST", "OPTIONS")
                .allowedHeaders("*")
                // Cache the preflight response. The student page polls every 6
                // seconds; without this the browser could re-preflight far
                // more often than necessary.
                .maxAge(3600);
    }
}
