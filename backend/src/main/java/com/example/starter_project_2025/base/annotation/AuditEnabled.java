package com.example.starter_project_2025.base.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Enables detailed audit logging (before/after JSON diff) for an entity.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
public @interface AuditEnabled {

    boolean trackDiff() default true;

    boolean trackRelations() default false;
}
