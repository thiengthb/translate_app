package com.example.starter_project_2025.init.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
public @interface ResourceMenu {

    String title();

    String group();

    String icon() default "circle";

    String url();

    int order() default 0;

    String permission() default "";

    /**
     * Short, human-friendly explanation of what this page/resource is for.
     * Surfaced in the UI as a tooltip (the ⓘ next to a breadcrumb / card
     * title) so the visible label can stay terse. Copied into
     * {@code Module.description} by {@code AutoMenuInitializer}.
     */
    String description() default "";
}
