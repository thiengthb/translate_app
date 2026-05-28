package com.example.starter_project_2025.exception;

/**
 * Marker interface for exceptions that carry MessageFormat arguments to be
 * substituted into a localised message bundle.
 *
 * Implementations expose the raw key (via {@code getMessage()}) and the
 * args used for {@code MessageFormat} substitution. The
 * {@link GlobalExceptionHandler} resolves the final user-facing string at
 * the controller boundary using the active request locale.
 *
 * The exception's {@code message} field doubles as the key. Spring's
 * {@link org.springframework.context.MessageSource MessageSource} is
 * configured with {@code useCodeAsDefaultMessage=true} so callers that
 * still pass a free-form English string keep working — the key just
 * "resolves" to itself.
 */
public interface LocalisedException {
    Object[] getMessageArgs();
}
