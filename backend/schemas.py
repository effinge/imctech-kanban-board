from typing import Literal
from pydantic import BaseModel, Field

TaskStatus = Literal["backlog", "todo", "in_progress", "done"]
TaskPriority = Literal["low", "medium", "high"]


class TaskBase(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    description: str = Field(min_length=2, max_length=1000)
    assignee: str = Field(min_length=2, max_length=120)
    deadline: str
    status: TaskStatus
    priority: TaskPriority


class TaskCreate(TaskBase):
    pass


class TaskUpdate(TaskBase):
    pass


class StatusUpdate(BaseModel):
    status: TaskStatus


class TaskOut(TaskBase):
    id: int
    created_at: str


class MemberOut(BaseModel):
    id: int
    name: str
    role: str
