#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_PORT=8000
FRONTEND_PORT=5173

VENV_PYTHON="$BACKEND_DIR/venv/bin/python"

# --- Backend: venv + зависимости ---
# venv считаем рабочим ТОЛЬКО если и python, и uvicorn реально запускаются.
# Перенесённый из другой папки venv проходит проверку python, но падает на
# uvicorn (битый shebang с путём вида ~/Downloads/.../python3.13) —
# поэтому проверяем именно запуск uvicorn как модуля.
if [ ! -x "$VENV_PYTHON" ] \
   || ! "$VENV_PYTHON" -c '' 2>/dev/null \
   || ! "$VENV_PYTHON" -m uvicorn --version >/dev/null 2>&1; then
  echo "→ Создаю/чиню виртуальное окружение Python…"
  rm -rf "$BACKEND_DIR/venv"
  python3 -m venv "$BACKEND_DIR/venv"
  "$VENV_PYTHON" -m pip install --upgrade pip
  "$VENV_PYTHON" -m pip install -r "$BACKEND_DIR/requirements.txt"
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

# Бэкенд запускаем через `python -m uvicorn`, чтобы не зависеть от shebang
# консольного скрипта venv/bin/uvicorn. trap внутри сбрасываем, чтобы
# подпроцессы не печатали "Останавливаю сервисы" по нескольку раз.
echo "→ Backend:  http://localhost:$BACKEND_PORT (docs: /docs)"
(trap - EXIT INT TERM; cd "$BACKEND_DIR" && exec ./venv/bin/python -m uvicorn main:app --reload --port "$BACKEND_PORT") &
backend_pid=$!

echo "→ Frontend: http://localhost:$FRONTEND_PORT"
(trap - EXIT INT TERM; cd "$FRONTEND_DIR" && exec npm run dev -- --port "$FRONTEND_PORT") &
frontend_pid=$!

# Ждём, пока живы оба. Как только любой умирает — выходим,
# trap cleanup гасит второй. Работает и на старом bash 3.2 (без wait -n).
while kill -0 "$backend_pid" 2>/dev/null && kill -0 "$frontend_pid" 2>/dev/null; do
  sleep 1
done