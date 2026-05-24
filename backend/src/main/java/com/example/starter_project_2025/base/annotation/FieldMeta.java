package com.example.starter_project_2025.base.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Metadata annotation for entity fields.
 * Drives UI generation (form type, label, visibility, validation).
 */
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
public @interface FieldMeta {

    String label() default "";

    String type() default "text";

    boolean required() default false;

    boolean hidden() default false;

    boolean readOnly() default false;

    String placeholder() default "";

    String[] enumValues() default {};

    String relation() default "";

    String relationDisplay() default "";

    String uiType() default "";

    int order() default 0;

    int minLength() default 0;

    int maxLength() default 0;

    double min() default Double.MIN_VALUE;

    double max() default Double.MAX_VALUE;

    String pattern() default "";

    String group() default "";

    String description() default "";
}
