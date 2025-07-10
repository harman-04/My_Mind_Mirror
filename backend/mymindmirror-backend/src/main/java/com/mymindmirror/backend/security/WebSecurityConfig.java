package com.mymindmirror.backend.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder; // Industry standard password encoder
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

/**
 * Main Spring Security configuration class.
 * Defines security rules, password encoder, and JWT filter integration.
 */
@Configuration // Marks this as a Spring configuration class
@EnableWebSecurity // Enables Spring Security's web security features
public class WebSecurityConfig {

    private final JwtRequestFilter jwtRequestFilter; // Our custom JWT filter

    // Constructor injection for JwtRequestFilter
    public WebSecurityConfig(JwtRequestFilter jwtRequestFilter) {
        this.jwtRequestFilter = jwtRequestFilter;
    }

    /**
     * Configures the security filter chain.
     * This defines which endpoints are public and which require authentication,
     * and sets up session management and CORS.
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable()) // Disable CSRF for stateless REST APIs (JWT handles security)
                .cors(cors -> {}) // Enable CORS configured by the corsFilter bean
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints: registration and login
                        .requestMatchers("/api/auth/**").permitAll()
                        // All other requests require authentication
                        .anyRequest().authenticated()
                )
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS) // Use stateless sessions (no HttpSession)
                );

        // Add our custom JWT filter before Spring Security's default UsernamePasswordAuthenticationFilter
        http.addFilterBefore(jwtRequestFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * Defines the password encoder bean.
     * BCryptPasswordEncoder is the recommended industry standard for hashing passwords.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Exposes the AuthenticationManager bean.
     * This is used by the AuthController to perform user authentication.
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }

    /**
     * Configures CORS (Cross-Origin Resource Sharing) for the application.
     * This allows your React frontend (on a different port/domain) to make requests to this backend.
     * Configuration values are read from application.properties.
     */
    @Bean
    public CorsFilter corsFilter(@org.springframework.beans.factory.annotation.Value("${spring.web.cors.allowed-origins}") String allowedOrigins) {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true); // Allow credentials (cookies, auth headers)
        config.addAllowedOrigin(allowedOrigins); // Your frontend URL from properties
        config.addAllowedHeader("*"); // Allow all headers
        config.addAllowedMethod("*"); // Allow all HTTP methods (GET, POST, PUT, DELETE, OPTIONS)
        source.registerCorsConfiguration("/**", config); // Apply this CORS config to all paths
        return new CorsFilter(source);
    }
}
