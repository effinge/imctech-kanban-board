import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "kanban.db"

STATUSES = ("backlog", "todo", "in_progress", "done")
PRIORITIES = ("low", "medium", "high")


def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            assignee TEXT NOT NULL,
            deadline TEXT NOT NULL,
            status TEXT NOT NULL,
            priority TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            role TEXT NOT NULL
        )
        """
    )

    seed_members(cursor)
    seed_tasks(cursor)

    connection.commit()
    connection.close()


def seed_members(cursor):
    cursor.execute("SELECT COUNT(*) AS count FROM members")
    if cursor.fetchone()["count"] > 0:
        return

    members = [
        ("Иван Петров", "Frontend"),
        ("Анна Смирнова", "Backend"),
        ("Максим Иванов", "Дизайн"),
        ("Екатерина Орлова", "Аналитика"),
    ]
    cursor.executemany("INSERT INTO members (name, role) VALUES (?, ?)", members)


def seed_tasks(cursor):
    cursor.execute("SELECT COUNT(*) AS count FROM tasks")
    if cursor.fetchone()["count"] > 0:
        return

    tasks = [
        (
            "Собрать требования к MVP",
            "Зафиксировать функции первой версии канбан-доски и ограничения проекта.",
            "Екатерина Орлова",
            "2026-06-10",
            "done",
            "high",
        ),
        (
            "Сделать макет канбан-доски",
            "Подготовить внешний вид доски в стиле IMCTECH: темный фон, карточки и колонки задач.",
            "Максим Иванов",
            "2026-06-12",
            "in_progress",
            "high",
        ),
        (
            "Реализовать создание задачи",
            "Добавить форму создания задачи с названием, описанием, исполнителем, дедлайном, статусом и приоритетом.",
            "Иван Петров",
            "2026-06-14",
            "todo",
            "medium",
        ),
        (
            "Подключить SQLite",
            "Сделать хранение задач в базе данных, чтобы данные сохранялись после обновления страницы.",
            "Анна Смирнова",
            "2026-06-15",
            "todo",
            "medium",
        ),
        (
            "Добавить drag-and-drop",
            "Реализовать перенос карточек между колонками с автоматической сменой статуса.",
            "Иван Петров",
            "2026-06-18",
            "backlog",
            "high",
        ),
    ]
    cursor.executemany(
        """
        INSERT INTO tasks (title, description, assignee, deadline, status, priority)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        tasks,
    )
