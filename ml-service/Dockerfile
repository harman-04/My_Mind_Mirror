FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# ⭐ FIX: Install CPU-only Torch first to override the requirements.txt version ⭐
RUN pip install --no-cache-dir torch==2.2.1+cpu --index-url https://download.pytorch.org/whl/cpu

# Install the rest of the packages (pip will skip torch because it's already installed)
RUN pip install --default-timeout=1000 --no-cache-dir -r requirements.txt

# Download NLTK data
RUN python -c "import nltk; nltk.download('stopwords'); nltk.download('wordnet'); nltk.download('punkt'); nltk.download('averaged_perceptron_tagger')"

COPY . .

ENV FLASK_ENV=production
EXPOSE 5000

CMD ["python", "app.py"]