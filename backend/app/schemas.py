import re
from datetime import date, datetime, timezone
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, BeforeValidator, ConfigDict, Field, field_validator
from pydantic_core import PydanticCustomError

from .models import Priority, Status

Title = Annotated[str, Field(min_length=3, max_length=100)]

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _strip(v):
    return v.strip() if isinstance(v, str) else v


def _normalize_email(v):
    return v.strip().lower() if isinstance(v, str) else v


def _check_email(v: str) -> str:
    if not _EMAIL_RE.fullmatch(v):
        raise PydanticCustomError("email", "Enter a valid email address")
    return v


def _as_utc(v: datetime) -> datetime:
    # SQLite returns naive datetimes; they are stored in UTC, so label them as such for clients.
    return v.replace(tzinfo=timezone.utc) if v.tzinfo is None else v


UtcDatetime = Annotated[datetime, AfterValidator(_as_utc)]
NormalizedEmail = Annotated[str, BeforeValidator(_normalize_email), Field(min_length=1, max_length=254)]


class TaskBase(BaseModel):
    title: Title
    description: str | None = Field(default=None, max_length=2000)
    priority: Priority
    due_date: date | None = None

    @field_validator("title", mode="before")
    @classmethod
    def strip_title(cls, v):
        # Whitespace-only titles must count as empty.
        return _strip(v)

    @field_validator("description", mode="before")
    @classmethod
    def blank_description_to_none(cls, v):
        if isinstance(v, str):
            v = v.strip()
            return v or None
        return v

    @field_validator("due_date", mode="before")
    @classmethod
    def blank_due_date_to_none(cls, v):
        return None if v == "" else v


class TaskCreate(TaskBase):
    """New tasks always start as Pending; status is not accepted on create."""

    model_config = ConfigDict(extra="forbid")


class TaskUpdate(TaskBase):
    """Full update of editable fields. Status and created_at are not editable here."""

    model_config = ConfigDict(extra="forbid")


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None
    priority: Priority
    status: Status
    due_date: date | None
    created_at: UtcDatetime
    updated_at: UtcDatetime


class SignupRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Annotated[str, BeforeValidator(_strip), Field(min_length=2, max_length=100)]
    email: Annotated[NormalizedEmail, AfterValidator(_check_email)]
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: NormalizedEmail
    password: str = Field(min_length=1, max_length=128)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    created_at: UtcDatetime


class AuthResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    user: UserRead
