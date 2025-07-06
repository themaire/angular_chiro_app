#!/bin/bash

# Script pour servir l'application Angular en HTTPS avec accès mobile
# Usage: ./serve-mobile.sh

echo "🚀 Démarrage du serveur Angular avec HTTPS..."
echo "📱 Accessible depuis votre mobile à l'adresse :"
echo "   https://192.168.0.120:4200"
echo ""
echo "⚠️  Acceptez le certificat auto-signé sur votre téléphone"
echo "💡 Ctrl+C pour arrêter le serveur"
echo ""

ng serve --ssl --host 0.0.0.0 --port 4200
