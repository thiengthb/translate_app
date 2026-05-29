package com.example.starter_project_2025.config;

import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.support.ReloadableResourceBundleMessageSource;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver;

import java.util.List;
import java.util.Locale;

/**
 * Locale + i18n infrastructure.
 *
 *   1. {@link #localeResolver()} reads {@code Accept-Language} on every request
 *      so anywhere that calls {@code LocaleContextHolder.getLocale()} sees the
 *      user's choice. FE axios sends this header from the active locale.
 *   2. {@link #messageSource()} loads {@code messages_*.properties} bundles for
 *      server-side error and validation messages.
 *   3. {@link #getValidator()} wires Hibernate Validator to the same
 *      MessageSource so {@code @NotBlank(message = "{key}")} resolves through
 *      our bundles.
 */
@Configuration
public class LocaleConfig {

    public static final Locale DEFAULT_LOCALE = Locale.ENGLISH;
    public static final List<Locale> SUPPORTED = List.of(
            Locale.ENGLISH,
            Locale.forLanguageTag("vi"),
            Locale.JAPANESE
    );

    @Bean
    public LocaleResolver localeResolver() {
        AcceptHeaderLocaleResolver resolver = new AcceptHeaderLocaleResolver();
        resolver.setDefaultLocale(DEFAULT_LOCALE);
        resolver.setSupportedLocales(SUPPORTED);
        return resolver;
    }

    @Bean
    public MessageSource messageSource() {
        ReloadableResourceBundleMessageSource source = new ReloadableResourceBundleMessageSource();
        source.setBasename("classpath:messages");
        source.setDefaultEncoding("UTF-8");
        // When a key isn't in the bundle we want the *key itself* back (so the
        // caller — usually GlobalExceptionHandler — can fall through to the
        // raw exception message). Without this, MessageSource would throw
        // NoSuchMessageException on lookups.
        source.setUseCodeAsDefaultMessage(true);
        source.setFallbackToSystemLocale(false);
        return source;
    }

    @Bean
    public LocalValidatorFactoryBean getValidator() {
        LocalValidatorFactoryBean factory = new LocalValidatorFactoryBean();
        factory.setValidationMessageSource(messageSource());
        return factory;
    }
}
