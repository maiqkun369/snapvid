FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Build ffmpeg-web toolbox
FROM node:20-alpine AS toolbox-builder

WORKDIR /app/toolbox
COPY ffmpeg-web/package.json ffmpeg-web/package-lock.json* ./
RUN npm install
COPY ffmpeg-web/ .
RUN node BuildDist.cjs --local

FROM python:3.12-slim

WORKDIR /app

# Install ffmpeg for audio post-processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ .

# Copy frontend build output to static directory
COPY --from=frontend-builder /app/frontend/dist /app/static

# Copy ffmpeg-web toolbox to /static/tools/ (same-origin serving)
COPY --from=toolbox-builder /app/toolbox/dist /app/static/tools

# Create downloads directory
RUN mkdir -p /app/downloads

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
