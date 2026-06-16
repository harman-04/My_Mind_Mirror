// src/main/java/com/mymindmirror/backend/config/properties/MySqlDataSourceProperties.java
package com.mymindmirror.backend.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.datasource.mysql")
public record MySqlDataSourceProperties(
        String url,
        String username,
        String password,
        String driverClassName
) {}