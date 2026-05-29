package com.example.starter_project_2025.base.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marker annotation for entities that participate in the auto-CRUD system.
 * Combined with @ResourcePermission, @ResourceMenu, and other annotations,
 * this enables fully automatic API + UI generation.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
public @interface AutoCrud {

    String path() default "";

    boolean enableExport() default true;

    boolean enableImport() default true;

    boolean enableBulkDelete() default true;

    /**
     * Set false to skip both the auto-registered Service bean and the auto-
     * registered HTTP endpoints — useful when you ship a custom controller
     * but still want metadata / menus.
     */
    boolean autoRegister() default true;
}
