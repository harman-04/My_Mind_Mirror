package com.mymindmirror.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.mymindmirror.backend.config.properties.MySqlDataSourceProperties;
import com.mymindmirror.backend.config.properties.VectorDataSourceProperties;
import org.springframework.ai.vectorstore.pgvector.autoconfigure.PgVectorStoreAutoConfiguration;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.retry.annotation.EnableRetry;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication(exclude = PgVectorStoreAutoConfiguration.class)

@EnableRetry
@EnableAsync
@EnableConfigurationProperties({MySqlDataSourceProperties.class, VectorDataSourceProperties.class})
public class BackendApplication {
    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }
    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        // Registering this module because you use Java 8+ Dates (LocalDate, etc.)
        mapper.registerModule(new JavaTimeModule());
        return mapper;
    }
}