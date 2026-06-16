from database import get_connection
from schemas import CommentCreate, TaskCreate, TaskUpdate


def row_to_dict(row):
    return dict(row) if row else None


def get_tasks():
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute("SELECT * FROM tasks ORDER BY id DESC")
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
        INSERT INTO tasks (title, description, assignee, deadline, status, priority)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            task.title,
            task.description,
            task.assignee,
            task.deadline,
            task.status,
            task.priority,
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
