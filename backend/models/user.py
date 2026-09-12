from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from core.database import Base

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(150), unique=True, index=True, nullable=False)
    email = Column(String(254), unique=True, index=True, nullable=False)
    password = Column(String(128), nullable=False)  # Stored password hash
    
    # Django User fields
    first_name = Column(String(150), nullable=True)
    last_name = Column(String(150), nullable=True)
    is_active = Column(Boolean, default=True)
    is_staff = Column(Boolean, default=False)
    is_superuser = Column(Boolean, default=False)
    date_joined = Column(DateTime, default=func.now())
    last_login = Column(DateTime, nullable=True)
    
    # Custom fields
    role = Column(String(20), default='student')
    avatar_url = Column(String(200), nullable=True)
    phone = Column(String(15), nullable=True)
    is_verified = Column(Boolean, default=False)
    updated_at = Column(DateTime, onupdate=func.now(), default=func.now())
