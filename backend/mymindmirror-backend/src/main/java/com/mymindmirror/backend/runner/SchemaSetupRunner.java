package com.mymindmirror.backend.runner;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.Resource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.util.StreamUtils;

import java.nio.charset.StandardCharsets;

@Component
@Order(0)  // Runs before other runners
@RequiredArgsConstructor
@Slf4j
public class SchemaSetupRunner implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Value("classpath:schema.sql")
    private Resource schemaSql;

    @Override
    public void run(String... args) throws Exception {
        // Check if the summary table already exists
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'daily_journal_summary'",
                Integer.class);
        if (count != null && count > 0) {
            log.info("Summary table already exists. Skipping schema.sql execution.");
            return;
        }

        log.info("Executing schema.sql to create summary table, procedures, and triggers...");
        String sqlScript = StreamUtils.copyToString(schemaSql.getInputStream(), StandardCharsets.UTF_8);
        // Execute the whole script as a single statement
        jdbcTemplate.execute(sqlScript);
        log.info("Schema setup completed.");
    }
}