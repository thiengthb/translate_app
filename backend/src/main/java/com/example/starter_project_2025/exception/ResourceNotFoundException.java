package com.example.starter_project_2025.exception;

public class ResourceNotFoundException extends RuntimeException implements LocalisedException {

    private final Object[] args;

    public ResourceNotFoundException(String message) {
        super(message);
        this.args = null;
    }

    public ResourceNotFoundException(String resource, String field, Object value) {
        super(String.format("%s not found with %s: '%s'", resource, field, value));
        this.args = null;
    }

    public ResourceNotFoundException(String messageKey, Object... args) {
        super(messageKey);
        this.args = args;
    }

    @Override
    public Object[] getMessageArgs() {
        return args;
    }
}
