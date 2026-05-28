package com.example.starter_project_2025.config;

import com.atilika.kuromoji.ipadic.Tokenizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class KuromojiConfig {

    @Bean
    public Tokenizer kuromojiTokenizer() {
        return new Tokenizer();
    }
}
