from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import crud
from database import init_db
from schemas import (
    CommentCreate,
    CommentOut,
    MemberOut,
    ReviewDecision,
    StatusUpdate,
    TaskCreate,
    TaskOut,
    TaskUpdate,
)

app = FastAPI(title="IMCTECH Kanban MVP")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/api/tasks", response_model=list[TaskOut])
def read_tasks():
    return crud.get_tasks()


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
