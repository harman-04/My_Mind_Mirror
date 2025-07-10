# 🧠 MyMindMirror: AI-Powered Mood Diary & Smart Journal

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
