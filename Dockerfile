FROM node:18

# Instala Chromium antes do npm install
RUN apt-get update && \
    apt-get install -y chromium && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./

# Pula o download automático do Chromium pelo Puppeteer
ENV PUPPETEER_SKIP_DOWNLOAD=true

RUN npm install

COPY . .

CMD ["npm", "run", "dev"]

