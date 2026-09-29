FROM node:18-slim

# Prevent prompts and allow pip to install system-wide in container
ENV DEBIAN_FRONTEND=noninteractive
ENV PIP_BREAK_SYSTEM_PACKAGES=1

# Install Python 3, pip, and system dependencies for opencv and sharp
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip for proper wheel compatibility
RUN pip3 install --no-cache-dir --upgrade pip

# Install PyTorch CPU first (prevents downloading ~4.5GB of CUDA packages and build timeout)
RUN pip3 install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Install ultralytics YOLOv11 and opencv in python environment
RUN pip3 install --no-cache-dir ultralytics opencv-python-headless

WORKDIR /app

# Copy package files and install npm dependencies (with retry configuration to handle network drops)
COPY package*.json ./
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000 && \
    (npm ci || npm install)

# Copy application source code
COPY . .

# Build TypeScript to dist
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
