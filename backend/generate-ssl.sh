#!/bin/bash

# SSL Certificate Generation Script for Строительная система управления
# This script creates self-signed certificates for development and staging

set -e

echo "🔐 Generating SSL certificates for Строй-Контроль..."

# Create SSL directory if it doesn't exist
mkdir -p nginx/ssl

# Generate private key
openssl genrsa -out nginx/ssl/privkey.pem 2048

# Create certificate request
openssl req -new -key nginx/ssl/privkey.pem -out nginx/ssl/cert.csr -subj "/C=RU/ST=Moscow/L=Moscow/O=Строй-Контроль/OU=IT/CN=stroy-control.local"

# Generate self-signed certificate (valid for 365 days)
openssl x509 -req -in nginx/ssl/cert.csr -signkey nginx/ssl/privkey.pem -out nginx/ssl/fullchain.pem -days 365

# Set proper permissions
chmod 600 nginx/ssl/privkey.pem
chmod 644 nginx/ssl/fullchain.pem

# Clean up CSR file
rm nginx/ssl/cert.csr

echo "✅ SSL certificates generated successfully!"
echo "📍 Location: $(pwd)/nginx/ssl/"
echo ""
echo "📋 Certificate Details:"
echo "   - Certificate: fullchain.pem"
echo "   - Private Key: privkey.pem"
echo "   - Valid for: 365 days"
echo "   - Common Name: stroy-control.local"
echo ""
echo "⚠️  IMPORTANT: For production use, replace these with certificates from a trusted CA"
echo "   such as Let's Encrypt, using a tool like certbot or manual installation."
echo ""
echo "🔧 To use in production:"
echo "   1. Obtain SSL certificates from a trusted CA"
echo "   2. Replace fullchain.pem and privkey.pem with your certificates"
echo "   3. Update your domain names in nginx.conf"