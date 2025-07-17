#!/bin/bash
set -e

echo "🔧 Atualizando APT e instalando dependências básicas..."
apt-get update && apt-get install -y curl gnupg ca-certificates

echo "📦 Criando arquivo do repositório Debian Bookworm..."
cat <<EOF > /etc/apt/sources.list.d/debian-bookworm.list
deb http://deb.debian.org/debian bookworm main
EOF

echo "🔑 Baixando e instalando as chaves GPG do Debian Bookworm..."
mkdir -p /tmp/debian-keys
cd /tmp/debian-keys

for key in 0E98404D386FA1D9 6ED0E7B82643E131 F8D2585B8783D481; do
    gpg --no-default-keyring --keyring ./debian-archive-keyring.gpg \
        --keyserver keyserver.ubuntu.com --recv-keys "$key"
done

gpg --no-default-keyring --keyring ./debian-archive-keyring.gpg --export \
    > /etc/apt/trusted.gpg.d/debian-bookworm.gpg

echo "🔄 Atualizando repositórios com Debian Bookworm..."
apt-get update

echo "🌐 Instalando Chromium (sem Snap)..."
apt-get install -y chromium

echo "🧹 Limpando repositório temporário do Debian para evitar conflitos futuros..."
rm /etc/apt/sources.list.d/debian-bookworm.list
apt-get update

echo "📦 Instalando pacotes Node.js (omitindo dev)..."
npm install --omit=dev

echo "✅ Setup concluído com sucesso!"
