import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "kanban.db"

STATUSES = ("backlog", "todo", "in_progress", "review", "done")
PRIORITIES = ("low", "medium", "high")
SYSTEM_ROLES = ("mentor", "student")
# Добавочные роли студента внутри проекта (назначает руководитель).
SPECIALTIES = ("backend", "frontend", "designer", "analyst")


def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def add_column_if_missing(cursor, table, column, column_type):
    cursor.execute(f"PRAGMA table_info({table})")
    existing_columns = {row["name"] for row in cursor.fetchall()}
    if column not in existing_columns:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {column_type}")


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
            mentor_comment TEXT,
            project_id INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    add_column_if_missing(cursor, "tasks", "mentor_comment", "TEXT")
    add_column_if_missing(cursor, "tasks", "project_id", "INTEGER")

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            role TEXT NOT NULL
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER NOT NULL,
            author_role TEXT NOT NULL,
            author_name TEXT NOT NULL,
            text TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
        )
        """
    )

    # --- Ролевая модель: аккаунты, проекты, участие в проектах ---
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            system_role TEXT NOT NULL,
            specialty TEXT
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
        )
        """
    )

    # Участие пользователя в проекте: ровно одна запись на пару (проект, пользователь).
    # is_lead — флаг руководителя (один на проект, назначает ментор),
    # specialty — добавочная роль (назначает руководитель).
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS project_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            is_lead INTEGER NOT NULL DEFAULT 0,
            specialty TEXT,
            UNIQUE (project_id, user_id),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """
    )

    # --- Интеграция с Telegram-ботом ---
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS telegram_links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            telegram_id INTEGER NOT NULL UNIQUE,
            username TEXT,
            linked_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS telegram_link_codes (
            code TEXT PRIMARY KEY,
            telegram_id INTEGER NOT NULL,
            username TEXT,
            expires_at TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    seed_members(cursor)
    seed_users(cursor)
    seed_projects(cursor)
    seed_tasks(cursor)
    backfill_task_projects(cursor)
    seed_project_members(cursor)

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


def seed_users(cursor):
    cursor.execute("SELECT COUNT(*) AS count FROM users")
    if cursor.fetchone()["count"] > 0:
        return

    # Демо-аккаунты для защиты: ментор + студенты с добавочными ролями.
    users = [
        ("Ольга Менторова", "mentor", None),
        ("Иван Петров", "student", "frontend"),
        ("Анна Смирнова", "student", "backend"),
        ("Максим Иванов", "student", "designer"),
        ("Екатерина Орлова", "student", "analyst"),
    ]
    cursor.executemany(
        "INSERT INTO users (name, system_role, specialty) VALUES (?, ?, ?)", users
    )


def seed_projects(cursor):
    cursor.execute("SELECT COUNT(*) AS count FROM projects")
    if cursor.fetchone()["count"] > 0:
        return

    projects = [
        ("Канбан-доска IMCTECH",),
        ("Мобильное приложение IMCTECH",),
        ("Лендинг для конференции",),
    ]
    cursor.executemany("INSERT INTO projects (name) VALUES (?)", projects)


def seed_tasks(cursor):
    cursor.execute("SELECT COUNT(*) AS count FROM tasks")
    if cursor.fetchone()["count"] > 0:
        return

    project_ids = get_project_ids(cursor)
    if len(project_ids) < 3:
        return
    p1, p2, p3 = project_ids[0], project_ids[1], project_ids[2]

    # У каждой задачи исполнитель соответствует своей добавочной роли:
    # аналитик — требования, дизайнер — макеты, backend — данные/API, frontend — вёрстка.
    tasks = [
        # Проект 1 — Канбан-доска IMCTECH
        ("Собрать требования к MVP",
         "Зафиксировать функции первой версии канбан-доски и ограничения проекта.",
         "Екатерина Орлова", "2026-06-10", "done", "high", p1),
        ("Сделать макет канбан-доски",
         "Подготовить внешний вид доски в стиле IMCTECH: тёмный фон, карточки и колонки задач.",
         "Максим Иванов", "2026-06-12", "in_progress", "high", p1),
        ("Реализовать создание задачи",
         "Сверстать форму создания задачи с названием, описанием, исполнителем, дедлайном и приоритетом.",
         "Иван Петров", "2026-06-14", "todo", "medium", p1),
        ("Подключить SQLite",
         "Сделать хранение задач в базе данных, чтобы данные сохранялись после обновления страницы.",
         "Анна Смирнова", "2026-06-15", "todo", "medium", p1),
        ("Добавить drag-and-drop",
         "Реализовать перенос карточек между колонками с автоматической сменой статуса.",
         "Иван Петров", "2026-06-18", "backlog", "high", p1),
        # Проект 2 — Мобильное приложение IMCTECH
        ("Спроектировать REST API",
         "Описать эндпоинты мобильного приложения и форматы ответов.",
         "Анна Смирнова", "2026-06-20", "todo", "high", p2),
        ("Сверстать экран входа",
         "Экран авторизации мобильного приложения по гайдлайнам IMCTECH.",
         "Иван Петров", "2026-06-21", "in_progress", "high", p2),
        ("Дизайн иконки приложения",
         "Подготовить иконку приложения в нескольких размерах.",
         "Максим Иванов", "2026-06-23", "todo", "medium", p2),
        ("Настроить push-уведомления",
         "Серверная часть отправки push-уведомлений пользователям.",
         "Анна Смирнова", "2026-06-25", "backlog", "medium", p2),
        # Проект 3 — Лендинг для конференции
        ("Прототип лендинга",
         "Собрать прототип одностраничника для конференции.",
         "Максим Иванов", "2026-06-19", "todo", "high", p3),
        ("Собрать тексты и оффер",
         "Подготовить тексты блоков и ценностное предложение лендинга.",
         "Екатерина Орлова", "2026-06-22", "backlog", "low", p3),
        ("Сверстать секцию героя",
         "Свёрстать первый экран лендинга с заголовком и кнопкой регистрации.",
         "Иван Петров", "2026-06-24", "todo", "medium", p3),
    ]
    cursor.executemany(
        """
        INSERT INTO tasks (title, description, assignee, deadline, status, priority, project_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        tasks,
    )


def backfill_task_projects(cursor):
    # Задачи, созданные до появления проектов, привязываем к первому проекту.
    project_ids = get_project_ids(cursor)
    if not project_ids:
        return
    cursor.execute(
        "UPDATE tasks SET project_id = ? WHERE project_id IS NULL", (project_ids[0],)
    )


def seed_project_members(cursor):
    cursor.execute("SELECT COUNT(*) AS count FROM project_members")
    if cursor.fetchone()["count"] > 0:
        return

    project_ids = get_project_ids(cursor)
    user_ids = {row["name"]: row["id"] for row in cursor.execute("SELECT id, name FROM users")}
    if len(project_ids) < 3:
        return
    p1, p2, p3 = project_ids[0], project_ids[1], project_ids[2]

    # (проект, имя, is_lead, specialty). Один и тот же студент — руководитель
    # в одном проекте и обычный участник в другом (расщепление ролей).
    memberships = [
        (p1, "Ольга Менторова", 0, None),
        (p1, "Иван Петров", 1, "frontend"),
        (p1, "Анна Смирнова", 0, "backend"),
        (p1, "Максим Иванов", 0, "designer"),
        (p1, "Екатерина Орлова", 0, "analyst"),
        (p2, "Ольга Менторова", 0, None),
        (p2, "Анна Смирнова", 1, "backend"),
        (p2, "Иван Петров", 0, "frontend"),
        (p2, "Максим Иванов", 0, "designer"),
        (p3, "Ольга Менторова", 0, None),
        (p3, "Максим Иванов", 1, "designer"),
        (p3, "Екатерина Орлова", 0, "analyst"),
        (p3, "Иван Петров", 0, "frontend"),
    ]
    rows = [
        (project_id, user_ids[name], is_lead, specialty)
        for project_id, name, is_lead, specialty in memberships
        if name in user_ids
    ]
    cursor.executemany(
        """
        INSERT INTO project_members (project_id, user_id, is_lead, specialty)
        VALUES (?, ?, ?, ?)
        """,
        rows,
    )


def get_project_ids(cursor):
    return [row["id"] for row in cursor.execute("SELECT id FROM projects ORDER BY id")]
