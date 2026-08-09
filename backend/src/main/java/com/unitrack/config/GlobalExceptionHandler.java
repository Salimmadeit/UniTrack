package com.unitrack.config;

import com.unitrack.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Translates every exception into the single error shape documented in
 * {@code docs/api.md}:
 *
 * <pre>{ "error": "...", "details": ["...", "..."] }</pre>
 *
 * <p>Keeping this in one place means the frontend can parse errors with one
 * code path regardless of which endpoint failed.</p>
 */
@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Builds the response body.
     *
     * <p>{@code LinkedHashMap} rather than {@code Map.of} for two reasons:
     * {@code Map.of} does not preserve key order (so responses would look
     * inconsistent between calls) and it rejects null values, which would turn
     * a null exception message into a second, confusing failure.</p>
     */
    private static Map<String, Object> body(String error, List<String> details) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("error", error);
        payload.put("details", details);
        return payload;
    }

    /** 400 - bean validation failed on a @Valid request body. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        List<String> details = ex.getBindingResult()
                .getAllErrors()
                .stream()
                .map(error -> {
                    String fieldName = error instanceof FieldError fieldError
                            ? fieldError.getField()
                            : error.getObjectName();
                    return fieldName + ": " + error.getDefaultMessage();
                })
                .collect(Collectors.toList());

        return ResponseEntity.badRequest().body(body("Validation failed", details));
    }

    /** 400 - a required query parameter (?lat=/?lng=) was omitted. */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Map<String, Object>> handleMissingParameter(MissingServletRequestParameterException ex) {
        return ResponseEntity.badRequest().body(body(
                "Validation failed",
                List.of(ex.getParameterName() + " is required")
        ));
    }

    /** 400 - a query parameter was present but the wrong type (?lat=abc). */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return ResponseEntity.badRequest().body(body(
                "Validation failed",
                List.of(ex.getName() + " must be a valid number")
        ));
    }

    /** 404 - the resource genuinely does not exist yet. */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body(
                ex.getMessage(),
                List.of(ex.getDetail())
        ));
    }

    /**
     * 404 - the URL matched no handler at all (a typo, or a stale client).
     *
     * <p>Without this, the catch-all below claims the request as an
     * {@code Exception} and answers 500, so a misspelled endpoint looks like a
     * server crash. That is actively misleading when debugging a deployment: it
     * sends you looking for a broken server when the real problem is the path.
     * It also echoed Spring's internal "No static resource ..." text back to
     * the caller, which discloses how the app resolves requests.</p>
     */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNoHandler(NoResourceFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body(
                "Not found",
                List.of("No endpoint matches this path")
        ));
    }

    /** 405 - right path, wrong verb (e.g. GET on a POST-only endpoint). */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Map<String, Object>> handleMethodNotAllowed(HttpRequestMethodNotSupportedException ex) {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(body(
                "Method not allowed",
                List.of(ex.getMethod() + " is not supported on this endpoint")
        ));
    }

    /**
     * 500 - anything unforeseen, normalised to the same shape.
     *
     * <p>The exception message is logged rather than returned. A raw message can
     * carry a SQL fragment, a file path or a class name, none of which help the
     * client and all of which help an attacker map the system. The stack trace
     * goes to the server log, where it is actually useful.</p>
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneralExceptions(Exception ex) {
        log.error("Unhandled exception", ex);
        return ResponseEntity.internalServerError().body(body(
                "Internal server error",
                List.of("An unexpected error occurred")
        ));
    }
}
