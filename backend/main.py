from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import crud
from database import init_db
from schemas import MemberOut, StatusUpdate, TaskCreate, TaskOut, TaskUpdate

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


@app.delete("/api/tasks/{task_id}")
def remove_task(task_id: int):
    if not crud.delete_task(task_id):
        raise HTTPException(status_code=404, detail="Задача не найдена")
    return {"message": "Задача удалена"}


@app.get("/api/members", response_model=list[MemberOut])
def read_members():
    return crud.get_members()
