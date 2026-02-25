from sqlalchemy import Column, Integer, String, Boolean
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False) 
    is_active = Column(Boolean, default=True)
    
    # ⛔️ ملاحظة هامة: لا تضع أي relationship هنا.
    # جميع العلاقات معرفة في ملف tournament.py باستخدام backref لتجنب التضارب.
    # ستظهر العلاقات تلقائياً في كائن User باسم:
    # - managed_team (لل فريق الذي يديره)
    # - coach_profile (إذا كان مدرباً)
    # - player_profile (إذا كان لاعباً)
    # - referee_profile (إذا كان حكماً)