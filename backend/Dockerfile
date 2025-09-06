# Optimized single-stage build for MVP - faster cold starts
FROM python:3.11-slim

# Set working directory  
WORKDIR /app

# Install minimal runtime dependencies and Python packages in one layer
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user and data directory
RUN groupadd -r appuser && useradd -r -g appuser appuser && \
    mkdir -p data && chown -R appuser:appuser /app

USER appuser

# Environment variables for Container Apps
ENV PYTHONUNBUFFERED=1 \
    ENVIRONMENT=production \
    DEBUG=false \
    BIND_HOST=0.0.0.0 \
    PORT=8000

# Expose port
EXPOSE 8000

# Optimized startup for MVP - single worker, fast startup
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]