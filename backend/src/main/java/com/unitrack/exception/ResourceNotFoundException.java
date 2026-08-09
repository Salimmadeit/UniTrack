package com.unitrack.exception;

/**
 * Signals that a requested resource does not exist yet (for example, no driver
 * has broadcast a location).
 *
 * <p>This replaces the previous {@code RuntimeException} + try/catch in the
 * controller. Using a dedicated type lets {@code GlobalExceptionHandler}
 * produce the documented {@code {error, details}} body for every 404 in one
 * place, instead of each controller inventing its own response shape.</p>
 */
public class ResourceNotFoundException extends RuntimeException {

    private final String detail;

    public ResourceNotFoundException(String message, String detail) {
        super(message);
        this.detail = detail;
    }

    public String getDetail() {
        return detail;
    }
}
