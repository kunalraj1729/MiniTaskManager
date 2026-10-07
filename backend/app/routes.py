from fastapi import APIRouter, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import CurrentUser
from .database import DbSession
from .models import Priority, Status, Task, User
from .schemas import TaskCreate, TaskRead, TaskUpdate

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def _get_or_404(db: Session, task_id: int, user: User) -> Task:
    task = db.get(Task, task_id)
    # Another user's task is reported as missing so task ids can't be probed.
    if task is None or task.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Task {task_id} not found")
    return task


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


@router.get("", response_model=list[TaskRead])
def list_tasks(
    db: DbSession,
    user: CurrentUser,
    search: str | None = Query(default=None, max_length=100, description="Case-insensitive title search"),
    status_: Status | None = Query(default=None, alias="status"),
    priority: Priority | None = Query(default=None),
):
    stmt = select(Task).where(Task.user_id == user.id)
    if search and search.strip():
        stmt = stmt.where(Task.title.ilike(f"%{_escape_like(search.strip())}%", escape="\\"))
    if status_ is not None:
        stmt = stmt.where(Task.status == status_)
    if priority is not None:
        stmt = stmt.where(Task.priority == priority)
    stmt = stmt.order_by(Task.created_at.desc(), Task.id.desc())
    return db.scalars(stmt).all()


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate, db: DbSession, user: CurrentUser):
    task = Task(**payload.model_dump(), status=Status.PENDING, user_id=user.id)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/{task_id}", response_model=TaskRead)
def get_task(task_id: int, db: DbSession, user: CurrentUser):
    return _get_or_404(db, task_id, user)


@router.put("/{task_id}", response_model=TaskRead)
def update_task(task_id: int, payload: TaskUpdate, db: DbSession, user: CurrentUser):
    task = _get_or_404(db, task_id, user)
    for field, value in payload.model_dump().items():
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    return task


@router.patch("/{task_id}/complete", response_model=TaskRead)
def complete_task(task_id: int, db: DbSession, user: CurrentUser):
    task = _get_or_404(db, task_id, user)
    if task.status == Status.COMPLETED:
        raise HTTPException(status.HTTP_409_CONFLICT, "Task is already completed")
    task.status = Status.COMPLETED
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, db: DbSession, user: CurrentUser):
    task = _get_or_404(db, task_id, user)
    db.delete(task)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
