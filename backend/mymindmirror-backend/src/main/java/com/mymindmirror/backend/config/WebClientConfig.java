// src/main/java/com/mymindmirror/backend/config/WebClientConfig.java
package com.mymindmirror.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration // Marks this class as a source of bean definitions
public class WebClientConfig {

    // Inject the URL from application.properties
    @Value("${app.ml-service.url}")
    private String mlServiceBaseUrl;

    /**
     * Defines a WebClient bean that will be used to communicate with the ML service.
     * Spring will automatically inject WebClient.Builder.
     */
    @Bean // Marks this method's return value as a Spring Bean
    public WebClient mlServiceWebClient(WebClient.Builder webClientBuilder) {
        // At this point, mlServiceBaseUrl will have been correctly injected by Spring.
        return webClientBuilder.baseUrl(mlServiceBaseUrl).build();
    }
}