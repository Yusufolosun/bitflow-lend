FROM ubuntu:22.04

# Clarinet version — bump this arg when upgrading
ARG CLARINET_VERSION=2.10.0

# Avoid prompts from apt
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    wget \
    build-essential \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20.x LTS
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Clarinet
RUN wget -nv https://github.com/hirosystems/clarinet/releases/download/v${CLARINET_VERSION}/clarinet-linux-x64.tar.gz \
    && tar -xzf clarinet-linux-x64.tar.gz \
    && mv clarinet /usr/local/bin/ \
    && rm clarinet-linux-x64.tar.gz \
    && clarinet --version

# Set working directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN if [ -f package.json ]; then npm install; fi
RUN cd frontend && npm install

# Copy the rest of the application
COPY . .

# Expose ports
# 3000 - Frontend dev server
# 20443 - Stacks node API
EXPOSE 3000 20443

# Default command
CMD ["bash"]
