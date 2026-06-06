package com.example.starter_project_2025.exception;

import com.example.starter_project_2025.exception.error.ErrorResponse;
import com.example.starter_project_2025.exception.error.ValidationErrorResponse;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.MessageSource;
import org.springframework.context.NoSuchMessageException;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Slf4j
@RestControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler {

    private final MessageSource messageSource;

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFoundException(ResourceNotFoundException ex) {
        String message = resolve(ex);
        log.warn("[404] ResourceNotFound: {}", message);
        ErrorResponse error = new ErrorResponse(
                HttpStatus.NOT_FOUND.value(),
                message,
                LocalDateTime.now());
        return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ErrorResponse> handleBadRequestException(BadRequestException ex) {
        String message = resolve(ex);
        log.warn("[400] BadRequest: {}", message);
        ErrorResponse error = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                message,
                LocalDateTime.now());
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentialsException(BadCredentialsException ex) {
        ErrorResponse error = new ErrorResponse(
                HttpStatus.UNAUTHORIZED.value(),
                resolveKey("error.auth.invalidCredentials", null),
                LocalDateTime.now());
        return new ResponseEntity<>(error, HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(TooManyRequestsException.class)
    public ResponseEntity<ErrorResponse> handleTooManyRequests(TooManyRequestsException ex) {
        String message = resolve(ex);
        log.warn("[429] TooManyRequests: {}", message);
        ErrorResponse error = new ErrorResponse(
                HttpStatus.TOO_MANY_REQUESTS.value(),
                message,
                LocalDateTime.now());
        return new ResponseEntity<>(error, HttpStatus.TOO_MANY_REQUESTS);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDeniedException(AccessDeniedException ex) {
        ErrorResponse error = new ErrorResponse(
                HttpStatus.FORBIDDEN.value(),
                resolveKey("error.accessDenied", null),
                LocalDateTime.now());
        return new ResponseEntity<>(error, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ValidationErrorResponse> handleValidation(MethodArgumentNotValidException ex) {

        Map<String, List<String>> errors = new HashMap<>();

        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {

            errors.computeIfAbsent(
                    fieldError.getField(),
                    key -> new ArrayList<>()
            ).add(fieldError.getDefaultMessage());
        }

        ValidationErrorResponse response = new ValidationErrorResponse(
                resolveKey("error.validationFailed", null),
                errors
        );

        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ValidationErrorResponse> handleConstraintViolation(ConstraintViolationException ex) {

        Map<String, List<String>> errors = new HashMap<>();

        for (ConstraintViolation<?> violation : ex.getConstraintViolations()) {

            String field = violation.getPropertyPath().toString();

            errors.computeIfAbsent(field, k -> new ArrayList<>())
                    .add(violation.getMessage());
        }

        ValidationErrorResponse response =
                new ValidationErrorResponse(resolveKey("error.validationFailed", null), errors);

        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(BusinessValidationException.class)
    public ResponseEntity<ValidationErrorResponse> handleBusiness(BusinessValidationException ex) {

        ValidationErrorResponse response =
                new ValidationErrorResponse(resolveKey("error.validationFailed", null), ex.getErrors());

        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgumentException(IllegalArgumentException ex) {
        log.warn("[400] IllegalArgument: {}", ex.getMessage());
        ErrorResponse error = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                ex.getMessage(),
                LocalDateTime.now());
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    // Honour the status carried by a thrown ResponseStatusException (e.g. the
    // drill's 503 "AI offline") instead of letting it fall to the 500 catch-all.
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ErrorResponse> handleResponseStatus(ResponseStatusException ex) {
        HttpStatusCode status = ex.getStatusCode();
        String message = ex.getReason() != null ? ex.getReason() : status.toString();
        log.warn("[{}] ResponseStatus: {}", status.value(), message);
        ErrorResponse error = new ErrorResponse(status.value(), message, LocalDateTime.now());
        return new ResponseEntity<>(error, status);
    }

    // Catch-all — keep last so the specific 4xx handlers above run first.
    // No separate RuntimeException handler that returns 400: it would mask
    // genuine 500 errors (NPE, IllegalState, DB failures, etc.).
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGlobalException(Exception ex) {
        log.error("[500] Unhandled exception", ex);
        String detail = ex.getMessage() != null ? ex.getMessage() : ex.getClass().getSimpleName();
        ErrorResponse error = new ErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                resolveKey("error.unexpected", new Object[]{detail}),
                LocalDateTime.now());
        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    /**
     * Resolve the message on an exception that may carry a translation key.
     * Falls through to the raw {@code getMessage()} text when:
     *   - the bundle key doesn't exist (MessageSource returns the key
     *     unchanged because useCodeAsDefaultMessage=true);
     *   - the exception's args are null (legacy raw-string call sites).
     */
    private String resolve(Throwable ex) {
        String raw = ex.getMessage();
        if (raw == null) return null;

        Object[] args = ex instanceof LocalisedException le ? le.getMessageArgs() : null;
        return resolveKey(raw, args);
    }

    private String resolveKey(String key, Object[] args) {
        Locale locale = LocaleContextHolder.getLocale();
        try {
            return messageSource.getMessage(key, args, locale);
        } catch (NoSuchMessageException ignored) {
            // useCodeAsDefaultMessage=true should prevent this, but be defensive.
            return key;
        }
    }
}
