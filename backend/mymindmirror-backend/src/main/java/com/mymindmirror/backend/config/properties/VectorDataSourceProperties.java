// src/main/java/com/mymindmirror/backend/config/properties/VectorDataSourceProperties.java
package com.mymindmirror.backend.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.datasource.vector")
public record VectorDataSourceProperties(
        String url,
        String username,
        String password,
        String driverClassName
) {}