import secrets
import string
from datetime import date, datetime, timedelta

from database import get_connection
from schemas import CommentCreate, TaskCreate, TaskUpdate


def row_to_dict(row):
    return dict(row) if row else None


def get_tasks(project_id: int | None = None):
    connection = get_connection()
    cursor = connection.cursor()
    if project_id is None:
        cursor.execute("SELECT * FROM tasks ORDER BY id DESC")
    else:
        cursor.execute(
            "SELECT * FROM tasks WHERE project_id = ? ORDER BY id DESC", (project_id,)
        )
    tasks = [row_to_dict(row) for row in cursor.fetchall()]
    connection.close()
    return tasks


def get_task(task_id: int):
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
    task = row_to_dict(cursor.fetchone())
    connection.close()
    return task


def create_task(task: TaskCreate):
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute(
        """
        INSERT INTO tasks (title, description, assignee, deadline, status, priority, project_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            task.title,
            task.description,
            task.assignee,
            task.deadline,
            task.status,
            task.priority,
            task.project_id,
        ),
    )
    connection.commit()
    task_id = cursor.lastrowid
    connection.close()
    created = get_task(task_id)
    enqueue_task_added(created)
    return created


def update_task(task_id: int, task: TaskUpdate):
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute(
        """
        UPDATE tasks
        SET title = ?, description = ?, assignee = ?, deadline = ?, status = ?, priority = ?
        WHERE id = ?
        """,
        (
            task.title,
            task.description,
            task.assignee,
            task.deadline,
            task.status,
            task.priority,
            task_id,
        ),
    )
    connection.commit()
    connection.close()
    return get_task(task_id)


def update_task_status(task_id: int, status: str):
    connection = get_connection()
    cursor = connection.cursor()
    if status == "review":
        cursor.execute(
            "UPDATE tasks SET status = ?, mentor_comment = NULL WHERE id = ?",
            (status, task_id),
        )
    else:
        cursor.execute("UPDATE tasks SET status = ? WHERE id = ?", (status, task_id))
    connection.commit()
    connection.close()
    return get_task(task_id)


def review_task(task_id: int, action: str, comment: str):
    connection = get_connection()
    cursor = connection.cursor()
    if action == "approve":
        cursor.execute(
            "UPDATE tasks SET status = 'done', mentor_comment = NULL WHERE id = ?",
            (task_id,),
        )
    else:
        cursor.execute(
            "UPDATE tasks SET status = 'in_progress', mentor_comment = ? WHERE id = ?",
            (comment, task_id),
        )
    connection.commit()
    connection.close()
    return get_task(task_id)


def delete_task(task_id: int):
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    connection.commit()
    deleted_count = cursor.rowcount
    connection.close()
    return deleted_count > 0


def get_members():
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute("SELECT * FROM members ORDER BY id")
    members = [row_to_dict(row) for row in cursor.fetchall()]
    connection.close()
    return members


def get_comments(task_id: int):
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute(
        "SELECT * FROM comments WHERE task_id = ? ORDER BY id ASC", (task_id,)
    )
    comments = [row_to_dict(row) for row in cursor.fetchall()]
    connection.close()
    return comments


def create_comment(task_id: int, comment: CommentCreate):
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute(
        """
        INSERT INTO comments (task_id, author_role, author_name, text)
        VALUES (?, ?, ?, ?)
        """,
        (task_id, comment.author_role, comment.author_name, comment.text),
    )
    connection.commit()
    comment_id = cursor.lastrowid
    cursor.execute("SELECT * FROM comments WHERE id = ?", (comment_id,))
    created = row_to_dict(cursor.fetchone())
    connection.close()
    return created


# --- Проекты, пользователи и участие в проектах ---

def get_projects():
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute("SELECT * FROM projects ORDER BY id")
    projects = [row_to_dict(row) for row in cursor.fetchall()]
    connection.close()
    return projects


def get_project(project_id: int):
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
    project = row_to_dict(cursor.fetchone())
    connection.close()
    return project


def get_users():
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute(
        """
        SELECT * FROM users
        ORDER BY CASE WHEN system_role = 'mentor' THEN 0 ELSE 1 END, name
        """
    )
    users = [row_to_dict(row) for row in cursor.fetchall()]
    connection.close()
    return users


def get_user(user_id: int):
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = row_to_dict(cursor.fetchone())
    connection.close()
    return user


def get_project_members(project_id: int):
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute(
        """
        SELECT
            pm.id AS id,
            pm.project_id AS project_id,
            pm.user_id AS user_id,
            pm.is_lead AS is_lead,
            pm.specialty AS specialty,
            u.name AS name,
            u.system_role AS system_role
        FROM project_members pm
        JOIN users u ON u.id = pm.user_id
        WHERE pm.project_id = ?
        ORDER BY
            CASE WHEN u.system_role = 'mentor' THEN 0 ELSE 1 END,
            pm.is_lead DESC,
            u.name
        """,
        (project_id,),
    )
    members = [row_to_dict(row) for row in cursor.fetchall()]
    connection.close()
    return members


def get_membership(project_id: int, user_id: int):
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute(
        "SELECT * FROM project_members WHERE project_id = ? AND user_id = ?",
        (project_id, user_id),
    )
    membership = row_to_dict(cursor.fetchone())
    connection.close()
    return membership


def add_project_member(project_id: int, user_id: int, specialty: str | None = None):
    # Добавление участника в проект (ментором или руководителем).
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute(
        """
        INSERT OR IGNORE INTO project_members (project_id, user_id, is_lead, specialty)
        VALUES (?, ?, 0, ?)
        """,
        (project_id, user_id, specialty),
    )
    connection.commit()
    connection.close()
    return get_project_members(project_id)


def set_project_lead(project_id: int, user_id: int):
    # Ровно один руководитель на проект: снимаем флаг у всех, ставим выбранному.
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute(
        "INSERT OR IGNORE INTO project_members (project_id, user_id, is_lead) VALUES (?, ?, 0)",
        (project_id, user_id),
    )
    cursor.execute(
        "UPDATE project_members SET is_lead = 0 WHERE project_id = ?", (project_id,)
    )
    cursor.execute(
        "UPDATE project_members SET is_lead = 1 WHERE project_id = ? AND user_id = ?",
        (project_id, user_id),
    )
    connection.commit()
    connection.close()
    return get_project_members(project_id)


def set_member_specialty(project_id: int, user_id: int, specialty: str):
    # Назначение добавочной роли участнику (делает руководитель).
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute(
        "UPDATE project_members SET specialty = ? WHERE project_id = ? AND user_id = ?",
        (specialty, project_id, user_id),
    )
    connection.commit()
    connection.close()
    return get_project_members(project_id)


# --- Интеграция с Telegram-ботом ---

TELEGRAM_CODE_TTL_MINUTES = 15


def _generate_telegram_code(length: int = 6) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def create_telegram_code(telegram_id: int, username: str | None):
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute(
        "DELETE FROM telegram_link_codes WHERE telegram_id = ? OR expires_at < ?",
        (telegram_id, datetime.utcnow().isoformat()),
    )

    code = _generate_telegram_code()
    while cursor.execute(
        "SELECT 1 FROM telegram_link_codes WHERE code = ?", (code,)
    ).fetchone():
        code = _generate_telegram_code()

    expires_at = (
        datetime.utcnow() + timedelta(minutes=TELEGRAM_CODE_TTL_MINUTES)
    ).isoformat()
    cursor.execute(
        """
        INSERT INTO telegram_link_codes (code, telegram_id, username, expires_at)
        VALUES (?, ?, ?, ?)
        """,
        (code, telegram_id, username, expires_at),
    )
    connection.commit()
    connection.close()
    return {"code": code, "expires_in_minutes": TELEGRAM_CODE_TTL_MINUTES}


def confirm_telegram_code(code: str, user_id: int):
    connection = get_connection()
    cursor = connection.cursor()
    now = datetime.utcnow().isoformat()
    cursor.execute("DELETE FROM telegram_link_codes WHERE expires_at < ?", (now,))

    row = cursor.execute(
        "SELECT telegram_id, username FROM telegram_link_codes WHERE code = ?",
        (code.upper(),),
    ).fetchone()
    if row is None:
        connection.close()
        return None

    telegram_id = row["telegram_id"]
    username = row["username"]

    cursor.execute(
        "DELETE FROM telegram_links WHERE user_id = ? OR telegram_id = ?",
        (user_id, telegram_id),
    )
    cursor.execute(
        """
        INSERT INTO telegram_links (user_id, telegram_id, username)
        VALUES (?, ?, ?)
        """,
        (user_id, telegram_id, username),
    )
    cursor.execute("DELETE FROM telegram_link_codes WHERE code = ?", (code.upper(),))
    connection.commit()
    connection.close()
    return get_telegram_link_by_user(user_id)


def _telegram_link_row(where_field: str, value):
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute(
        f"""
        SELECT
            tl.user_id AS user_id,
            tl.telegram_id AS telegram_id,
            tl.username AS username,
            u.name AS name,
            u.system_role AS system_role
        FROM telegram_links tl
        JOIN users u ON u.id = tl.user_id
        WHERE tl.{where_field} = ?
        """,
        (value,),
    )
    link = row_to_dict(cursor.fetchone())
    connection.close()
    return link


def get_telegram_link_by_user(user_id: int):
    return _telegram_link_row("user_id", user_id)


def get_telegram_link_by_telegram(telegram_id: int):
    return _telegram_link_row("telegram_id", telegram_id)


def delete_telegram_link_by_user(user_id: int):
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute("DELETE FROM telegram_links WHERE user_id = ?", (user_id,))
    connection.commit()
    deleted_count = cursor.rowcount
    connection.close()
    return deleted_count > 0


def get_telegram_tasks(telegram_id: int, only_open: bool = False):
    link = get_telegram_link_by_telegram(telegram_id)
    if link is None:
        return None

    connection = get_connection()
    cursor = connection.cursor()
    query = """
        SELECT
            t.id AS id,
            t.title AS title,
            t.description AS description,
            t.deadline AS deadline,
            t.status AS status,
            t.priority AS priority,
            t.project_id AS project_id,
            p.name AS project_name,
            t.mentor_comment AS mentor_comment
        FROM tasks t
        LEFT JOIN projects p ON p.id = t.project_id
        WHERE t.assignee = ?
    """
    if only_open:
        query += " AND t.status != 'done'"
    query += " ORDER BY t.deadline ASC, t.id ASC"
    cursor.execute(query, (link["name"],))
    tasks = [row_to_dict(row) for row in cursor.fetchall()]
    connection.close()
    return tasks


PRIORITY_LABELS = {"low": "низкий", "medium": "средний", "high": "высокий"}


def get_telegram_id_by_name(name: str):
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute(
        """
        SELECT tl.telegram_id AS telegram_id
        FROM telegram_links tl
        JOIN users u ON u.id = tl.user_id
        WHERE u.name = ?
        """,
        (name,),
    )
    row = cursor.fetchone()
    connection.close()
    return row["telegram_id"] if row else None


def enqueue_notification(telegram_id: int, text: str, kind: str, dedup_key: str | None = None):
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute(
        """
        INSERT OR IGNORE INTO telegram_notifications (telegram_id, text, kind, dedup_key)
        VALUES (?, ?, ?, ?)
        """,
        (telegram_id, text, kind, dedup_key),
    )
    connection.commit()
    connection.close()


def enqueue_task_added(task):
    if not task:
        return
    telegram_id = get_telegram_id_by_name(task["assignee"])
    if telegram_id is None:
        return
    project = get_project(task["project_id"]) if task.get("project_id") else None
    project_name = project["name"] if project else "—"
    priority = PRIORITY_LABELS.get(task["priority"], task["priority"])
    text = (
        "🆕 Тебе назначена новая задача\n\n"
        f"#{task['id']} {task['title']}\n"
        f"Проект: {project_name}\n"
        f"Дедлайн: {task['deadline']}\n"
        f"Приоритет: {priority}"
    )
    enqueue_notification(telegram_id, text, "task_added", f"task_added:{task['id']}")


def enqueue_due_deadline_reminders(days_ahead: int = 2):
    today = date.today()
    today_str = today.isoformat()
    horizon = (today + timedelta(days=days_ahead)).isoformat()

    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute(
        """
        SELECT
            t.id AS id,
            t.title AS title,
            t.deadline AS deadline,
            tl.telegram_id AS telegram_id
        FROM tasks t
        JOIN users u ON u.name = t.assignee
        JOIN telegram_links tl ON tl.user_id = u.id
        WHERE t.status != 'done'
          AND t.deadline IS NOT NULL
          AND t.deadline != ''
          AND t.deadline <= ?
        """,
        (horizon,),
    )
    rows = [row_to_dict(row) for row in cursor.fetchall()]
    connection.close()

    for row in rows:
        overdue = row["deadline"] < today_str
        if overdue:
            text = f"⏰ Просрочена задача\n\n{row['title']}\nДедлайн был: {row['deadline']}"
        else:
            text = f"⏰ Скоро дедлайн\n\n{row['title']}\nДедлайн: {row['deadline']}"
        dedup = f"deadline:{row['id']}:{today_str}"
        enqueue_notification(row["telegram_id"], text, "deadline", dedup)


def get_pending_notifications():
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute(
        """
        SELECT id, telegram_id, text, kind
        FROM telegram_notifications
        WHERE delivered = 0
        ORDER BY id ASC
        """
    )
    items = [row_to_dict(row) for row in cursor.fetchall()]
    connection.close()
    return items


def ack_notifications(ids):
    if not ids:
        return 0
    connection = get_connection()
    cursor = connection.cursor()
    placeholders = ",".join("?" for _ in ids)
    cursor.execute(
        f"UPDATE telegram_notifications SET delivered = 1 WHERE id IN ({placeholders})",
        tuple(ids),
    )
    connection.commit()
    updated = cursor.rowcount
    connection.close()
    return updated
