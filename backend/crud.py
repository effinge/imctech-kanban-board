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
    return get_task(task_id)


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
