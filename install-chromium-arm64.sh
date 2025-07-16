#!/bin/bash

set -e

echo "📦 Baixando Chromium para ARM64 direto do Debian repo..."

wget http://ftp.us.debian.org/debian/pool/main/c/chromium/chromium_90.0.4430.212-1~deb10u1_arm64.deb

echo "⚙️ Instalando dependências..."
sudo apt-get install -y libatk-bridge2.0-0 libatk1.0-0 libatspi2.0-0 libcups2 libgbm1 libnspr4 libnss3 libxss1 libxcomposite1 libxrandr2 libxdamage1 libxfixes3 libxkbcommon0 libx11-xcb1 libxshmfence1 libxext6 libx11-6 libxcb1 fonts-liberation libappindicator3-1 libasound2 libcurl4 curl xdg-utils

echo "📥 Instalando Chromium real..."
sudo apt install -y ./chromium_90.0.4430.212-1~deb10u1_arm64.deb

echo "✅ Concluído! Teste com: chromium --version"
