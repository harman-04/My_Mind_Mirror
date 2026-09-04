~~# 🧠 MyMindMirror: AI-Powered Mood Diary & Smart Journal

MyMindMirror is a powerful and innovative journaling web application that uses Artificial Intelligence to analyze your daily thoughts and emotional patterns. Designed for self-reflection and growth, it provides intelligent insights such as mood trends, emotion recognition, and personalized wellness tips — all wrapped in a beautifully responsive UI.

---

## 🔍 Project Overview

- ✨ AI-analyzed journal entries
- 📊 Mood trend visualizations
- 🧩 Personalized tips for emotional well-being
- 📱 Mobile-friendly and theme adaptive
- 🔐 Secure login & user data storage

---

## 🚀 Key Features (MVP)

- 🔐 Secure User Authentication (JWT-based)
- 📝 Daily Journal Entry (free-form)
- 🤖 AI-Powered Analysis:
  - Mood Score (−1.0 to +1.0)
  - Dominant Emotions (with confidence)
  - Core Concerns (recurring themes)
  - Concise Summary
  - Personalized Growth Tips
- 📈 Mood Trend Visualization (interactive chart)
- 🗂 Journal History (with full AI insights)
- 🌓 Dark/Light Mode toggle
- 💻 Responsive Design (desktop & mobile)

---

## 🛠️ Technology Stack

### 🖥 Frontend

- ReactJS
- Vite
- Tailwind CSS
- axios
- react-router-dom
- chart.js & react-chartjs-2
- jwt-decode

### ⚙️ Backend (Spring Boot)

- Spring Boot (Java)
- Spring Security + JWT
- Spring Data JPA (MySQL)
- WebClient (Spring WebFlux)
- Lombok

### 🤖 AI/ML Service (Python)

- Flask
- Flask-CORS
- Hugging Face Transformers
- PyTorch
- NumPy

---

## ⚙️ Setup Instructions

### ✅ Prerequisites

- Java 17+
- Maven
- Node.js (LTS recommended)
- Python 3.8+
- pip
- MySQL Server

---

### 1️⃣ Database Setup (MySQL)

1. Start MySQL and create database:

   ```sql
   CREATE DATABASE mymindmirror_db;



   Update your credentials in:
   backend/src/main/resources/application.properties
   ```

## 🛠️ Configuration & Setup

### 🔧 Backend Configuration (`application.properties`)

Create this file in `backend/src/main/resources/application.properties`:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/mymindmirror_db
spring.datasource.username=yourUsername
spring.datasource.password=yourPassword
jwt.secret=yourVerySecretJWTKey  # Generate with: openssl rand -base64 32
app.ml-service.url=http://localhost:5000
spring.jpa.hibernate.ddl-auto=update

# 🤖 AI/ML Service Setup (Flask - Python)
bash
Copy
Edit
cd MyMindMirror/ml-service
python -m venv venv
Activate the virtual environment:

Windows CMD:

bash
Copy
Edit
.\venv\Scripts\activate
PowerShell:

bash
Copy
Edit
.\venv\Scripts\Activate.ps1
macOS/Linux:

bash
Copy
Edit
source venv/bin/activate
Install Python dependencies:

bash
Copy
Edit
pip install Flask flask-cors transformers torch numpy
Start the Flask service:

bash
Copy
Edit
python app.py

# Running on http://127.0.0.1:5000/

# 🚀 Backend Setup (Spring Boot - Java)
bash
Copy
Edit
cd MyMindMirror/backend
mvn spring-boot:run

# Running on http://localhost:8080/

Or open the backend folder in IntelliJ or Eclipse and run the main class.

# 💻 Frontend Setup (React - Vite)
bash
Copy
Edit
cd MyMindMirror/frontend/mymindmirror-app
npm install
npm run dev

# Running on http://localhost:5173/

vbnet
Copy
Edit

# 📦 Now your full setup steps are cleanly documented in one box and fully formatted for GitHub README.md usage.


### Key Features:
1. **Clean Markdown Formatting** - Proper code blocks with syntax highlighting
2. **OS-Specific Commands** - Clearly separated activation commands
3. **Port Notifications** - Each service's port clearly noted
4. **Security Tip** - Comment for JWT secret generation
5. **Copy-Paste Friendly** - No line breaks in commands
6. **Visual Hierarchy** - Emoji icons for quick scanning

# To use:
1. Simply copy this entire block
2. Paste into your README.md file
3. Replace placeholder values (username/password/JWT secret)
4. The backticks and formatting will be preserved

# Would you like me to provide this as:
1. A complete README.md template with this section integrated?
2. A separate .md file you can download?
3. Or any specific modifications to this format?
```


## Summary Table


## Step‑by‑Step Guide to Recreate Summary Table, Triggers & Procedures in Aiven MySQL (via DBeaver)

Your automatic script didn’t work because DBeaver (and many MySQL clients) does **not** support the `DELIMITER` command – it’s a feature of the MySQL CLI, not a SQL statement.  
We will execute the creation of stored procedures and triggers **without using `DELIMITER`**, by splitting the statements.

Below is a safe, tested sequence that you can run one by one in DBeaver’s SQL editor.

---

### 1. Ensure you are connected to the correct database

In DBeaver, select your Aiven MySQL database. Run:

```sql
SELECT DATABASE();
```

It should return your database name (e.g., `mymindmirror_db`).

---

### 2. Add `word_count` column to `journal_entries` (if missing)

```sql
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS word_count INT NOT NULL DEFAULT 0;
```

*(`IF NOT EXISTS` is supported in MySQL 8.0.29+; if you get an error, just run `ALTER TABLE journal_entries ADD COLUMN word_count INT NOT NULL DEFAULT 0;` and ignore the error if it already exists.)*

---

### 3. Create the `daily_journal_summary` table

```sql
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
```

---

### 4. Drop old triggers and procedures (clean start)

```sql
DROP TRIGGER IF EXISTS after_journal_entry_insert;
DROP TRIGGER IF EXISTS after_journal_entry_update;
DROP TRIGGER IF EXISTS after_journal_entry_delete;
DROP PROCEDURE IF EXISTS recalc_daily_summary;
DROP PROCEDURE IF EXISTS insert_journal_entry_summary;
DROP PROCEDURE IF EXISTS update_journal_entry_summary;
```

---

### 5. Create stored procedures (without `DELIMITER`)

In DBeaver, you can create procedures using the **CREATE PROCEDURE** syntax without changing the delimiter. However, you must ensure that the procedure body does **not** contain semicolons that would be misinterpreted as statement terminators. The safest way is to use DBeaver’s **“Create Procedure”** wizard or run each procedure as a separate script with `//` as delimiter? Actually, DBeaver supports `DELIMITER` only in its “Script” mode. Easier: use the `CREATE PROCEDURE` statement with `BEGIN ... END` and ensure you send the whole block as a single statement. In DBeaver, you can select the whole procedure text and execute it (it will be sent as one command). Let’s provide each procedure as a single SQL block that you select and execute.

#### Procedure `recalc_daily_summary`

```sql
/*!50003 CREATE PROCEDURE recalc_daily_summary(
    IN p_user_id BINARY(16), 
    IN p_date DATE
)
BEGIN
    DECLARE v_avg_mood DOUBLE;
    DECLARE v_total_words BIGINT;
    DECLARE v_entry_count INT;

    -- Calculate aggregates for the specific user and day
    SELECT AVG(mood_score), SUM(word_count), COUNT(*)
    INTO v_avg_mood, v_total_words, v_entry_count
    FROM journal_entries
    WHERE user_id = p_user_id AND entry_date = p_date;

    -- If no records exist, clean up the summary table row
    IF v_avg_mood IS NULL OR v_entry_count = 0 THEN
        DELETE FROM daily_journal_summary 
        WHERE user_id = p_user_id AND date = p_date;
    ELSE
        -- Upsert directly. The uk_user_date unique key ensures this updates instead of duplicating!
        INSERT INTO daily_journal_summary (user_id, date, avg_mood, total_words, entry_count)
        VALUES (p_user_id, p_date, v_avg_mood, IFNULL(v_total_words, 0), v_entry_count)
        ON DUPLICATE KEY UPDATE
            avg_mood = v_avg_mood,
            total_words = IFNULL(v_total_words, 0),
            entry_count = v_entry_count;
    END IF;
END */ ;

```

#### Procedure `insert_journal_entry_summary`

```sql
CREATE PROCEDURE insert_journal_entry_summary(
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
END
```

#### Procedure `update_journal_entry_summary`

```sql
CREATE PROCEDURE update_journal_entry_summary(
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
END
```

**How to execute each in DBeaver:**
- Select the entire `CREATE PROCEDURE ... END` block (including the final `END`).
- Right-click → **Execute Selected Text** (or press Ctrl+Shift+X).
- DBeaver will send the whole block as a single statement.
- Repeat for each procedure.

---

### 6. Create triggers

Triggers have a similar issue with semicolons inside the body. In DBeaver, you can execute each trigger as a single statement by selecting the whole block.

#### Trigger `after_journal_entry_insert`

```sql
CREATE TRIGGER after_journal_entry_insert
AFTER INSERT ON journal_entries
FOR EACH ROW
CALL insert_journal_entry_summary(NEW.user_id, NEW.entry_date, NEW.mood_score, NEW.word_count);
```

#### Trigger `after_journal_entry_update`

```sql
CREATE TRIGGER after_journal_entry_update
AFTER UPDATE ON journal_entries
FOR EACH ROW
CALL update_journal_entry_summary(OLD.user_id, OLD.entry_date, NEW.user_id, NEW.entry_date);
```

#### Trigger `after_journal_entry_delete`

```sql
CREATE TRIGGER after_journal_entry_delete
AFTER DELETE ON journal_entries
FOR EACH ROW
CALL recalc_daily_summary(OLD.user_id, OLD.entry_date);
```

Execute each trigger block similarly.

---

### 7. Test the setup

After creation, run the following checks:

#### 7.1 Verify table exists

```sql
DESCRIBE daily_journal_summary;
```

#### 7.2 Verify procedures exist

```sql
SHOW PROCEDURE STATUS WHERE Db = DATABASE();
```

#### 7.3 Verify triggers exist

```sql
SHOW TRIGGERS WHERE `Table` = 'journal_entries';
```

#### 7.4 Test with sample data

Insert a test journal entry (use existing user ID from your `users` table). Replace `'uuid-bin'` with an actual user UUID in binary format. **Note:** In MySQL, you can convert a UUID string to binary using `UUID_TO_BIN('uuid-string')`. Example:

```sql
SET @user_uuid = (SELECT id FROM users LIMIT 1);
INSERT INTO journal_entries (id, user_id, entry_date, raw_text, mood_score, word_count, creation_timestamp)
VALUES (UUID_TO_BIN(UUID()), @user_uuid, CURDATE(), 'Test entry', 0.8, 50, NOW());
```

Then check the summary table:

```sql
SELECT * FROM daily_journal_summary WHERE user_id = @user_uuid;
```

It should show one row for today’s date with `avg_mood` = 0.8, `total_words` = 50, `entry_count` = 1.

#### 7.5 Test update trigger

Update the same entry with a different mood score and word count:

```sql
UPDATE journal_entries SET mood_score = 0.9, word_count = 60 WHERE raw_text = 'Test entry' LIMIT 1;
```

Check summary table again – the `avg_mood` should become 0.9, `total_words` = 60, `entry_count` still 1.

#### 7.6 Test delete trigger

Delete the test entry:

```sql
DELETE FROM journal_entries WHERE raw_text = 'Test entry';
```

The summary row for that day should be removed (because `entry_count` becomes 0, and the procedure deletes the row).

---

### 8. Backfill existing data

After recreating the summary table, you need to populate it from your existing journal entries (if any). Run the backfill runner if you have it (or run a manual aggregation query). Example backfill:

```sql
INSERT INTO daily_journal_summary (user_id, date, avg_mood, total_words, entry_count)
SELECT 
    user_id, 
    entry_date, 
    AVG(mood_score), 
    SUM(word_count), 
    COUNT(*)
FROM journal_entries
WHERE mood_score IS NOT NULL
GROUP BY user_id, entry_date
ON DUPLICATE KEY UPDATE
    avg_mood = VALUES(avg_mood),
    total_words = VALUES(total_words),
    entry_count = VALUES(entry_count);
```

---

## Summary of Commands to Run in DBeaver (order matters)

1. `ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS word_count INT NOT NULL DEFAULT 0;`
2. Create summary table (as above)
3. Drop old triggers & procedures
4. Create `recalc_daily_summary` procedure
5. Create `insert_journal_entry_summary` procedure
6. Create `update_journal_entry_summary` procedure
7. Create three triggers
8. Verify with tests

**Important:** Always back up your database before running DDL scripts. Since you already lost data, ensure you have recovered what you can.

---

## Why the Automatic Script Didn’t Work

Your original script used `DELIMITER` and prepared statements inside a single execution block. DBeaver does not support `DELIMITER`, and the script likely failed at the first `DELIMITER $$`. By breaking it into individual statements, you gain full control and can see which step fails.

Would you like me to also provide a **single SQL script** that you can run from the MySQL command line (using `mysql` client) that works with `DELIMITER`? That would be easier for future runs.


## Testing the Summary Table & Triggers – Step by Step (DBeaver)

Your schema, procedures, and triggers are now correctly created. Let's test them to ensure they work as expected.

---

### 1. Insert a test journal entry

First, get a binary user ID from your `users` table:

```sql
SELECT BIN_TO_UUID(id) AS readable_uuid, username FROM users LIMIT 10;~~

```

Copy the returned `id` (it will be a UUID like `6cf71d1d-ecea-4d12-8401-5ecc85b3a33e`). Then run the insert:

The error happens because DBeaver does not save session variables across separate lines if you execute them one-by-one with standard keybinds, or if you run them without standard grouping.
Your first line (SET @user_uuid_bin = ...;) is running as an independent statement. When DBeaver moves to line 4, it forgets what @user_uuid_bin is, or it chokes on the whitespace gaps between your testing blocks.
## The Fix: Wrap It Cleanly
To test your code seamlessly in DBeaver, you must combine the variable definition and the insert action into a single execution block so DBeaver sends them to MySQL together.
Copy this combined test script, highlight the entire block, and press Alt + X (Execute SQL Script):

-- 1. Run the Insert test block togetherSET @user_uuid_bin = (SELECT id FROM users LIMIT 1);
INSERT INTO journal_entries (id, user_id, entry_date, raw_text, mood_score, word_count, creation_timestamp)VALUES (UUID_TO_BIN(UUID()), @user_uuid_bin, CURDATE(), 'Test', 0.85, 50, NOW());
-- Check summary directly after (If you used the Triggers method, this will have 1 row)SELECT * FROM daily_journal_summary WHERE user_id = @user_uuid_bin AND date = CURDATE();

------------------------------
## Step 2: Running the Update & Delete Tests
Once the row is safely inserted, you can highlight and run these individual blocks using Ctrl + Enter:
The Update Test:

UPDATE journal_entries SET mood_score = 0.92, word_count = 70 WHERE raw_text = 'Test';
-- Check summary changesSELECT * FROM daily_journal_summary WHERE user_id = (SELECT id FROM users LIMIT 1) AND date = CURDATE();

The Delete Test:

DELETE FROM journal_entries WHERE raw_text = 'Test';
-- Check summary is now emptySELECT * FROM daily_journal_summary WHERE user_id = (SELECT id FROM users LIMIT 1) AND date = CURDATE();

Did the combined execution script pass through DBeaver without throwing the syntax error this time?

---

## 📱 Mobile Web Testing (Wireless Port Forwarding)

To test this full-stack application on a physical Android device over Wi-Fi without cables, follow these steps using Android Debug Bridge (ADB):

### 1. Prerequisites (Poco/Redmi/Xiaomi Devices)
* Ensure both your laptop and phone are on the **same Wi-Fi network**.
* Enable **Developer Options** on your phone.
* Toggle **ON** the following settings:
    * `Wireless debugging`
    * `Disable adb authorization timeout` (Prevents connection drops)
    * `USB debugging (Security settings)` (Required by MIUI/HyperOS to allow reverse tunneling)

### 2. Expose Local Servers
Start both servers configured to listen to all network hosts (`0.0.0.0`):
* **Frontend (Vite):** Run `npm run dev -- --host 0.0.0.0` (launches on port `5173`)
* **Backend (Spring Boot):** Ensure `server.address=0.0.0.0` is present in `application.properties` (launches on port `8080`)

### 3. Establish the Wireless Tunnel
Navigate to your local system's `platform-tools` folder where `adb` is installed, open your terminal, and run:

```bash
# 1. Flush background processes
adb kill-server
adb start-server

Step 3: Pair via Terminal/Command PromptOpen your terminal or Command Prompt inside your computer's platform-tools folder.Run the pairing command using the exact IP and port from Step 2:bash

adb pair IP_ADDRESS:PORT
Use code with caution.

# 2. Connect to your phone (Find the dynamic IP:PORT on your phone's Wireless Debugging screen)
adb connect <PHONE_IP>:<WIRELESS_DEBUG_PORT>

# 3. Create reverse port tunnels for Frontend and Backend
adb -s <PHONE_IP>:<WIRELESS_DEBUG_PORT> reverse tcp:5173 tcp:5173
adb -s <PHONE_IP>:<WIRELESS_DEBUG_PORT> reverse tcp:8080 tcp:8080
```

### 4. Run on Device
Open Google Chrome on your phone and navigate to:
👉 **`http://localhost:5173`**

### 5. Cleanup
When finished testing, teardown the active tunnels by running:
```bash
adb -s <PHONE_IP>:<WIRELESS_DEBUG_PORT> reverse --remove-all
adb kill-server
```
