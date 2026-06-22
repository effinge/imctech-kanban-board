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
    project_id: int | None = None


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


Specialty = Literal["backend", "frontend", "designer", "analyst"]


class ProjectOut(BaseModel):
    id: int
    name: str


class UserOut(BaseModel):
    id: int
    name: str
    system_role: str
    specialty: str | None = None


class ProjectMemberOut(BaseModel):
    id: int
    project_id: int
    user_id: int
    is_lead: bool
    specialty: str | None = None
    name: str
    system_role: str


class AddMember(BaseModel):
    user_id: int


class LeadAssignment(BaseModel):
    user_id: int


class SpecialtyAssignment(BaseModel):
    user_id: int
    specialty: Specialty


CommentRole = Literal["student", "mentor"]


class CommentCreate(BaseModel):
    author_role: CommentRole
    author_name: str = Field(min_length=1, max_length=120)
    text: str = Field(min_length=1, max_length=500_000)


class CommentOut(BaseModel):
    id: int
    task_id: int
    author_role: str
    author_name: str
    text: str
    created_at: str


class TelegramCodeRequest(BaseModel):
    telegram_id: int
    username: str | None = None


class TelegramCodeOut(BaseModel):
    code: str
    expires_in_minutes: int


class TelegramConfirm(BaseModel):
    code: str = Field(min_length=4, max_length=12)
    user_id: int


class TelegramLinkOut(BaseModel):
    user_id: int
    telegram_id: int
    username: str | None = None
    name: str
    system_role: str


class TelegramTaskOut(BaseModel):
    id: int
    title: str
    description: str
    deadline: str
    status: str
    priority: str
    project_id: int | None = None
    project_name: str | None = None
    mentor_comment: str | None = None
