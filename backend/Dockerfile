# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Copy and set permissions for startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Note: google_service.json should be copied here
# If using Secret Manager, you can remove this file and mount it as a secret instead

# Expose port
EXPOSE 8080

# Run the application - Cloud Run sets PORT=8080 automatically
# Use the startup script which properly handles the PORT env var
CMD ["/start.sh"]

