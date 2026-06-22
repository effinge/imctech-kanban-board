# IMCTECH Kanban Board

Role-based kanban board for managing team projects with mentor oversight. Built as an MVP for educational teams.

![Preview](https://raw.githubusercontent.com/myfreeqn/imctech-kanban-board/main/preview.png)

## Features

- **No-auth demo login** — select from pre-seeded accounts to explore different roles
- **Role-based access** — Mentor, Project Lead, and Member each see different controls
- **Drag-and-drop kanban** — move tasks through statuses; dragging to Done sends to mentor for approval
- **Three board views** — group by Status, Priority, or Deadline
- **Markdown comments** — task comments support GitHub-flavored markdown with image uploads
- **Dashboard** — project analytics: completion %, member stats, overdue count (mentor/lead only)
- **Multi-project** — switch between projects from the sidebar

## Roles

| Role | Can do |
|------|--------|
| Mentor | Review/approve tasks, assign project lead, add members |
| Project Lead | Create/edit/delete tasks, assign member specialties |
| Member | Drag-reorder tasks, comment, view own tasks |

## Tech Stack

**Frontend:** React + Vite, React Markdown, Remark-GFM

**Backend:** FastAPI, Uvicorn, Pydantic v2, SQLite3

## Getting Started

### Requirements

- Python 3.8+
- Node.js 16+
- Bash (on Windows: WSL or Git Bash)

### Quick Start (recommended)

```bash
git clone https://github.com/myfreeqn/imctech-kanban-board.git
cd imctech-kanban-board
./run.sh
```

The script handles everything: creates the Python venv, installs all dependencies, and starts both servers.

- Frontend: http://localhost:5173
- Backend API docs: http://localhost:8000/docs

### Manual Start

```bash
# Backend
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

## Demo Accounts

The database auto-seeds on first launch with 5 accounts:

| Account | Role | Notes |
|---------|------|-------|
| Mentor | Mentor | Full access, approves tasks |
| Student 1–4 | Student | Assigned to different demo projects |

No passwords — just click a name on the login screen.

## Project Structure

```
imctech-kanban-board/
├── frontend/
│   └── src/
│       ├── components/   # React components (KanbanBoard, TaskCard, etc.)
│       ├── api/          # Backend API client
│       └── constants/    # Role definitions
├── backend/
│   ├── main.py           # FastAPI routes (24 endpoints)
│   ├── database.py       # SQLite schema + seed data
│   ├── crud.py           # Data access layer
│   └── schemas.py        # Pydantic models
└── run.sh                # One-command startup script
```

## Board Views

| View | Columns | Drag-and-drop |
|------|---------|---------------|
| Статусы | Бэклог → Нужно сделать → В процессе → На проверке → Выполнено | Yes |
| Приоритеты | Низкий / Средний / Высокий | No (read-only grouping) |
| Дедлайны | На этой неделе / Через неделю / Через две недели / В течении месяца | No (overdue tasks hidden) |
