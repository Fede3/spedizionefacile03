#!/bin/bash

# Script di preparazione per deploy Netlify
# Esegui questo prima di pushare su Git

echo "=========================================="
echo "PREPARAZIONE DEPLOY NETLIFY"
echo "=========================================="
echo ""

# 1. Installa dipendenze
echo "[1/5] Installazione dipendenze..."
npm install --legacy-peer-deps

# 2. Verifica che il build funzioni
echo ""
echo "[2/5] Test build locale..."
npm run build

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ ERRORE: Build fallito!"
    echo "Risolvi gli errori prima di deployare su Netlify."
    exit 1
fi

# 3. Verifica file necessari
echo ""
echo "[3/5] Verifica file configurazione..."

if [ ! -f "netlify.toml" ]; then
    echo "❌ ERRORE: netlify.toml mancante!"
    exit 1
fi

if [ ! -f ".env.production" ]; then
    echo "⚠️  WARNING: .env.production mancante (opzionale)"
fi

echo "✅ File configurazione OK"

# 4. Crea .gitignore se non esiste
echo ""
echo "[4/5] Verifica .gitignore..."

if [ ! -f ".gitignore" ]; then
    cat > .gitignore << 'EOF'
# Nuxt
.nuxt
.output
.env
.env.local

# Node
node_modules
npm-debug.log
yarn-error.log

# OS
.DS_Store
Thumbs.db

# IDE
.vscode
.idea
*.swp
*.swo

# Build
dist
.cache
EOF
    echo "✅ .gitignore creato"
else
    echo "✅ .gitignore esistente"
fi

# 5. Riepilogo
echo ""
echo "=========================================="
echo "✅ PREPARAZIONE COMPLETATA"
echo "=========================================="
echo ""
echo "PROSSIMI PASSI:"
echo ""
echo "1. Crea repository Git (se non esiste):"
echo "   git init"
echo "   git add ."
echo "   git commit -m 'Initial commit'"
echo ""
echo "2. Pusha su GitHub/GitLab:"
echo "   git remote add origin <URL_REPO>"
echo "   git push -u origin main"
echo ""
echo "3. Vai su Netlify (https://app.netlify.com):"
echo "   - New site from Git"
echo "   - Seleziona il tuo repository"
echo "   - Build command: npm run build"
echo "   - Publish directory: .output/public"
echo ""
echo "4. Aggiungi variabili d'ambiente su Netlify:"
echo "   - NUXT_PUBLIC_API_BASE"
echo "   - NUXT_PUBLIC_STRIPE_KEY"
echo ""
echo "5. Aggiorna Laravel .env con dominio Netlify"
echo ""
echo "=========================================="
