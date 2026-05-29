package com.example.starter_project_2025.base.crud.autoregister;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Wires the {@link AutoCrudBeanRegistrar} as a static {@code @Bean} so it
 * is created early enough to act as a {@code BeanDefinitionRegistryPostProcessor}
 * (before regular bean instantiation).
 *
 * The runtime HTTP endpoint registration happens later, in
 * {@link AutoCrudEndpointRegistrar} (a regular {@code @Component} listening for
 * {@code ContextRefreshedEvent}).
 */
@Configuration
public class AutoCrudAutoConfig {

    @Bean
    public static AutoCrudBeanRegistrar autoCrudBeanRegistrar() {
        return new AutoCrudBeanRegistrar();
    }
}
