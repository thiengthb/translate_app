package com.example.starter_project_2025.exception;

public class TooManyRequestsException extends RuntimeException implements LocalisedException {

    private final Object[] args;

    public TooManyRequestsException(String message) {
        super(message);
        this.args = null;
    }

    public TooManyRequestsException(String messageKey, Object... args) {
        super(messageKey);
        this.args = args;
    }

    @Override
    public Object[] getMessageArgs() {
        return args;
    }
}
