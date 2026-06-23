import os

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import crud
from database import init_db
from schemas import (
    AddMember,
    CommentCreate,
    CommentOut,
    LeadAssignment,
    MemberOut,
    ProjectMemberOut,
    ProjectOut,
    ReviewDecision,
    SpecialtyAssignment,
    StatusUpdate,
    TaskCreate,
    TaskOut,
    TaskUpdate,
    TelegramAck,
    TelegramCodeOut,
    TelegramCodeRequest,
    TelegramConfirm,
    TelegramLinkOut,
    TelegramNotificationOut,
    TelegramTaskOut,
    UserOut,
)

BOT_API_SECRET = os.getenv("BOT_API_SECRET", "dev-bot-secret")


def require_bot_secret(x_bot_secret: str = Header(default="")):
    if x_bot_secret != BOT_API_SECRET:
        raise HTTPException(status_code=401, detail="Неверный секрет бота")

app = FastAPI(title="IMCTECH Kanban MVP")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/api/tasks", response_model=list[TaskOut])
def read_tasks(project_id: int | None = None):
    return crud.get_tasks(project_id)


@app.post("/api/tasks", response_model=TaskOut)
def add_task(task: TaskCreate):
    return crud.create_task(task)


@app.put("/api/tasks/{task_id}", response_model=TaskOut)
def edit_task(task_id: int, task: TaskUpdate):
    if not crud.get_task(task_id):
        raise HTTPException(status_code=404, detail="Задача не найдена")
    return crud.update_task(task_id, task)


@app.patch("/api/tasks/{task_id}/status", response_model=TaskOut)
def change_task_status(task_id: int, status_data: StatusUpdate):
    if not crud.get_task(task_id):
        raise HTTPException(status_code=404, detail="Задача не найдена")
    return crud.update_task_status(task_id, status_data.status)


@app.patch("/api/tasks/{task_id}/review", response_model=TaskOut)
def review_task(task_id: int, decision: ReviewDecision):
    task = crud.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Задача не найдена")
    if task["status"] != "review":
        raise HTTPException(status_code=409, detail="Задача не находится на проверке")
    if decision.action == "return" and not decision.comment.strip():
        raise HTTPException(status_code=422, detail="Нужен комментарий для возврата задачи")
    return crud.review_task(task_id, decision.action, decision.comment.strip())


@app.delete("/api/tasks/{task_id}")
def remove_task(task_id: int):
    if not crud.delete_task(task_id):
        raise HTTPException(status_code=404, detail="Задача не найдена")
    return {"message": "Задача удалена"}


@app.get("/api/tasks/{task_id}/comments", response_model=list[CommentOut])
def read_comments(task_id: int):
    if not crud.get_task(task_id):
        raise HTTPException(status_code=404, detail="Задача не найдена")
    return crud.get_comments(task_id)


@app.post("/api/tasks/{task_id}/comments", response_model=CommentOut)
def add_comment(task_id: int, comment: CommentCreate):
    if not crud.get_task(task_id):
        raise HTTPException(status_code=404, detail="Задача не найдена")
    return crud.create_comment(task_id, comment)


@app.get("/api/members", response_model=list[MemberOut])
def read_members():
    return crud.get_members()


@app.get("/api/projects", response_model=list[ProjectOut])
def read_projects():
    return crud.get_projects()


@app.get("/api/users", response_model=list[UserOut])
def read_users():
    return crud.get_users()


@app.get("/api/projects/{project_id}/members", response_model=list[ProjectMemberOut])
def read_project_members(project_id: int):
    if not crud.get_project(project_id):
        raise HTTPException(status_code=404, detail="Проект не найден")
    return crud.get_project_members(project_id)


@app.post("/api/projects/{project_id}/members", response_model=list[ProjectMemberOut])
def add_project_member(project_id: int, payload: AddMember):
    # Добавить участника в проект (ментор или руководитель).
    if not crud.get_project(project_id):
        raise HTTPException(status_code=404, detail="Проект не найден")
    if not crud.get_user(payload.user_id):
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return crud.add_project_member(project_id, payload.user_id)


@app.patch("/api/projects/{project_id}/lead", response_model=list[ProjectMemberOut])
def assign_project_lead(project_id: int, payload: LeadAssignment):
    # Назначение руководителя проекта — действие ментора.
    if not crud.get_project(project_id):
        raise HTTPException(status_code=404, detail="Проект не найден")
    user = crud.get_user(payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    if user["system_role"] != "student":
        raise HTTPException(
            status_code=422, detail="Руководителем можно назначить только студента"
        )
    return crud.set_project_lead(project_id, payload.user_id)


@app.patch("/api/projects/{project_id}/specialty", response_model=list[ProjectMemberOut])
def assign_member_specialty(project_id: int, payload: SpecialtyAssignment):
    # Назначение добавочной роли участнику — действие руководителя.
    if not crud.get_project(project_id):
        raise HTTPException(status_code=404, detail="Проект не найден")
    membership = crud.get_membership(project_id, payload.user_id)
    if not membership:
        raise HTTPException(status_code=404, detail="Участник не найден в проекте")
    return crud.set_member_specialty(project_id, payload.user_id, payload.specialty)


@app.post(
    "/api/telegram/request-code",
    response_model=TelegramCodeOut,
    dependencies=[Depends(require_bot_secret)],
)
def telegram_request_code(payload: TelegramCodeRequest):
    return crud.create_telegram_code(payload.telegram_id, payload.username)


@app.post("/api/telegram/confirm", response_model=TelegramLinkOut)
def telegram_confirm(payload: TelegramConfirm):
    if not crud.get_user(payload.user_id):
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    link = crud.confirm_telegram_code(payload.code, payload.user_id)
    if link is None:
        raise HTTPException(status_code=404, detail="Код недействителен или истёк")
    return link


@app.get(
    "/api/telegram/{telegram_id}/me",
    response_model=TelegramLinkOut,
    dependencies=[Depends(require_bot_secret)],
)
def telegram_me(telegram_id: int):
    link = crud.get_telegram_link_by_telegram(telegram_id)
    if link is None:
        raise HTTPException(status_code=404, detail="Telegram не привязан")
    return link


@app.get(
    "/api/telegram/{telegram_id}/tasks",
    response_model=list[TelegramTaskOut],
    dependencies=[Depends(require_bot_secret)],
)
def telegram_tasks(telegram_id: int):
    tasks = crud.get_telegram_tasks(telegram_id)
    if tasks is None:
        raise HTTPException(status_code=404, detail="Telegram не привязан")
    return tasks


@app.get(
    "/api/telegram/{telegram_id}/deadlines",
    response_model=list[TelegramTaskOut],
    dependencies=[Depends(require_bot_secret)],
)
def telegram_deadlines(telegram_id: int):
    tasks = crud.get_telegram_tasks(telegram_id, only_open=True)
    if tasks is None:
        raise HTTPException(status_code=404, detail="Telegram не привязан")
    return tasks


@app.delete("/api/telegram/link/{user_id}")
def telegram_unlink(user_id: int):
    if not crud.delete_telegram_link_by_user(user_id):
        raise HTTPException(status_code=404, detail="Привязка не найдена")
    return {"message": "Telegram отвязан"}


@app.get("/api/users/{user_id}/telegram", response_model=TelegramLinkOut)
def telegram_status(user_id: int):
    link = crud.get_telegram_link_by_user(user_id)
    if link is None:
        raise HTTPException(status_code=404, detail="Telegram не привязан")
    return link


@app.get(
    "/api/telegram/notifications/pending",
    response_model=list[TelegramNotificationOut],
    dependencies=[Depends(require_bot_secret)],
)
def telegram_pending_notifications():
    crud.enqueue_due_deadline_reminders()
    return crud.get_pending_notifications()


@app.post(
    "/api/telegram/notifications/ack",
    dependencies=[Depends(require_bot_secret)],
)
def telegram_ack_notifications(payload: TelegramAck):
    count = crud.ack_notifications(payload.ids)
    return {"acknowledged": count}
