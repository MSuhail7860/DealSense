from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_current_user
from backend.core.database import get_db
from backend.core.security.auth import (
    create_access_token,
    hash_password,
    verify_password,
)
from backend.models.user import User
from backend.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    UserResponse,
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.email == data.email)
    )

    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists",
        )

    hashed_password = hash_password(data.password)

    user = User(
        email=data.email,
        hashed_password=hashed_password,
    )

    db.add(user)

    await db.commit()
    await db.refresh(user)

    return UserResponse(
        id=str(user.id),
        email=user.email,
        role=user.role,
    )


@router.post(
    "/login",
    response_model=LoginResponse,
)
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.email == data.email)
    )

    user = result.scalar_one_or_none()

    if user is None or not verify_password(
        data.password,
        user.hashed_password,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(user.id)

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=str(user.id),
            email=user.email,
            role=user.role,
        ),
    )


@router.get(
    "/me",
    response_model=UserResponse,
)
async def get_me(
    current_user: User = Depends(get_current_user),
):
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        role=current_user.role,
    )