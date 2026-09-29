FROM node:18-slim

# Install Python 3, pip, and system dependencies for opencv and sharp
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    libsm6 \
    libxext6 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install ultralytics YOLOv11 and opencv in python environment
RUN pip3 install --no-cache-dir ultralytics opencv-python-headless --break-system-packages || \
    pip3 install --no-cache-dir ultralytics opencv-python-headless

WORKDIR /app

# Copy package files and install npm dependencies
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

# Build TypeScript to dist
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
