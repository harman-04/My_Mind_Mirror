-- ==============================================
-- 1. Add word_count column (if not exists)
-- ==============================================
SET @dbname = DATABASE();
SET @tablename = 'journal_entries';
SET @colname = 'word_count';
SET @preparedStatement = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @colname) = 0,
    CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @colname, ' INT NOT NULL DEFAULT 0'),
    'SELECT 1'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ==============================================
-- 2. Create summary table (if not exists)
-- ==============================================
CREATE TABLE IF NOT EXISTS daily_journal_summary (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BINARY(16) NOT NULL,
    date DATE NOT NULL,
    avg_mood DOUBLE,
    total_words BIGINT,
    entry_count INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_date (user_id, date)
);

-- ==============================================
-- 3. Drop old triggers (if any)
-- ==============================================
DROP TRIGGER IF EXISTS after_journal_entry_insert;
DROP TRIGGER IF EXISTS after_journal_entry_update;
DROP TRIGGER IF EXISTS after_journal_entry_delete;

-- ==============================================
-- 4. Create stored procedure (idempotent)
-- ==============================================
DELIMITER $$
CREATE PROCEDURE IF NOT EXISTS recalc_daily_summary(IN p_user_id BINARY(16), IN p_date DATE)
BEGIN
    DECLARE v_avg_mood DOUBLE;
    DECLARE v_total_words BIGINT;
    DECLARE v_entry_count INT;

    SELECT AVG(mood_score), SUM(word_count), COUNT(*)
    INTO v_avg_mood, v_total_words, v_entry_count
    FROM journal_entries
    WHERE user_id = p_user_id AND entry_date = p_date;

    IF v_entry_count IS NULL THEN
        DELETE FROM daily_journal_summary WHERE user_id = p_user_id AND date = p_date;
    ELSE
        INSERT INTO daily_journal_summary (user_id, date, avg_mood, total_words, entry_count)
        VALUES (p_user_id, p_date, v_avg_mood, v_total_words, v_entry_count)
        ON DUPLICATE KEY UPDATE
            avg_mood = v_avg_mood,
            total_words = v_total_words,
            entry_count = v_entry_count;
    END IF;
END$$

CREATE PROCEDURE IF NOT EXISTS insert_journal_entry_summary(
    IN p_user_id BINARY(16),
    IN p_date DATE,
    IN p_mood_score DOUBLE,
    IN p_word_count INT
)
BEGIN
    INSERT INTO daily_journal_summary (user_id, date, avg_mood, total_words, entry_count)
    VALUES (p_user_id, p_date, p_mood_score, p_word_count, 1)
    ON DUPLICATE KEY UPDATE
        avg_mood = (avg_mood * entry_count + p_mood_score) / (entry_count + 1),
        total_words = total_words + p_word_count,
        entry_count = entry_count + 1;
END$$

CREATE PROCEDURE IF NOT EXISTS update_journal_entry_summary(
    IN old_user_id BINARY(16),
    IN old_date DATE,
    IN new_user_id BINARY(16),
    IN new_date DATE
)
BEGIN
    IF old_date != new_date THEN
        CALL recalc_daily_summary(old_user_id, old_date);
        CALL recalc_daily_summary(new_user_id, new_date);
    ELSE
        CALL recalc_daily_summary(new_user_id, new_date);
    END IF;
END$$

-- ==============================================
-- 5. Create triggers
-- ==============================================
CREATE TRIGGER after_journal_entry_insert
AFTER INSERT ON journal_entries
FOR EACH ROW
CALL insert_journal_entry_summary(NEW.user_id, NEW.entry_date, NEW.mood_score, NEW.word_count);

CREATE TRIGGER after_journal_entry_update
AFTER UPDATE ON journal_entries
FOR EACH ROW
CALL update_journal_entry_summary(OLD.user_id, OLD.entry_date, NEW.user_id, NEW.entry_date);

CREATE TRIGGER after_journal_entry_delete
AFTER DELETE ON journal_entries
FOR EACH ROW
CALL recalc_daily_summary(OLD.user_id, OLD.entry_date);

DELIMITER ;