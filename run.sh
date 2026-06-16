#!/usr/bin/env bash
# Запуск проекта IMCTECH Kanban: backend (FastAPI) + frontend (Vite).
# Использование: ./run.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_PORT=8000
FRONTEND_PORT=5173

# --- Backend: venv + зависимости ---
if [ ! -d "$BACKEND_DIR/venv" ]; then
  echo "→ Создаю виртуальное окружение Python…"
  python3 -m venv "$BACKEND_DIR/venv"
  "$BACKEND_DIR/venv/bin/pip" install --quiet --upgrade pip
  "$BACKEND_DIR/venv/bin/pip" install --quiet -r "$BACKEND_DIR/requirements.txt"
fi

# --- Frontend: зависимости ---
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo "→ Устанавливаю npm-зависимости…"
  (cd "$FRONTEND_DIR" && npm install)
fi

# Останавливаем оба процесса при выходе (Ctrl+C).
cleanup() {
  echo ""
  echo "→ Останавливаю сервисы…"
  kill 0 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "→ Backend:  http://localhost:$BACKEND_PORT (docs: /docs)"
(cd "$BACKEND_DIR" && exec ./venv/bin/uvicorn main:app --reload --port "$BACKEND_PORT") &

echo "→ Frontend: http://localhost:$FRONTEND_PORT"
(cd "$FRONTEND_DIR" && exec npm run dev -- --port "$FRONTEND_PORT") &

# Ждём, пока работает любой из процессов; Ctrl+C остановит оба.
wait
