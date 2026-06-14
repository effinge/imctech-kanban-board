from dataclasses import dataclass


@dataclass
class Task:
    id: int
    title: str
    description: str
    assignee: str
    deadline: str
    status: str
    priority: str
    created_at: str


@dataclass
class Member:
    id: int
    name: str
    role: str
