package com.example.starter_project_2025.exception;

public class BadRequestException extends RuntimeException implements LocalisedException {

    private final Object[] args;

    public BadRequestException(String message) {
        super(message);
        this.args = null;
    }

    /**
     * Localised variant — {@code messageKey} is a key in
     * {@code messages_*.properties}, {@code args} are passed to MessageFormat.
     */
    public BadRequestException(String messageKey, Object... args) {
        super(messageKey);
        this.args = args;
    }

    @Override
    public Object[] getMessageArgs() {
        return args;
    }
}
