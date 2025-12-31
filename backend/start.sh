#!/bin/sh
# Get PORT from environment variable (Cloud Run sets this to 8080)
PORT=${PORT:-8080}

echo "Starting application on port $PORT..."

# Start uvicorn with proper error handling
exec python -m uvicorn main:app --host 0.0.0.0 --port $PORT --log-level info

