#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/Users/alzettebrown/Documents/New project"
VENV_DIR="$PROJECT_DIR/.venv"

cd "$PROJECT_DIR"

if [ ! -d "$VENV_DIR" ]; then
  python3 -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"

pip install -q -r embeddings_service/requirements.txt

# Start embeddings service if not already running
if ! lsof -i:8001 -sTCP:LISTEN >/dev/null 2>&1; then
  uvicorn embeddings_service.app:app --host 127.0.0.1 --port 8001 >/tmp/embeddings_service.log 2>&1 &
  echo "Embeddings service started (log: /tmp/embeddings_service.log)"
else
  echo "Embeddings service already running on port 8001"
fi

npm install
npm run dev &

sleep 2
open http://localhost:3000
