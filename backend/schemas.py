from typing import Literal
from pydantic import BaseModel, Field

TaskStatus = Literal["backlog", "todo", "in_progress", "review", "done"]
TaskPriority = Literal["low", "medium", "high"]
ReviewAction = Literal["approve", "return"]


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


class ReviewDecision(BaseModel):
    action: ReviewAction
    comment: str = Field(default="", max_length=1000)


class TaskOut(TaskBase):
    id: int
    mentor_comment: str | None = None
    created_at: str


class MemberOut(BaseModel):
    id: int
    name: str
    role: str


CommentRole = Literal["student", "mentor"]


class CommentCreate(BaseModel):
    author_role: CommentRole
    author_name: str = Field(min_length=1, max_length=120)
    text: str = Field(min_length=1, max_length=1000)


class CommentOut(BaseModel):
    id: int
    task_id: int
    author_role: str
    author_name: str
    text: str
    created_at: str
