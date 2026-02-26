from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles  # ✅ 1. استيراد مكتبة الملفات الثابتة
import os
from app.database import engine, Base
from app.routes import auth, admin

# ✅ 2. إنشاء مجلد uploads إذا لم يكن موجوداً (لحفظ الصور)
os.makedirs("uploads", exist_ok=True)

# ✅ 3. إنشاء جداول قاعدة البيانات تلقائياً
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Football Tournament System")

# ✅ 4. إعدادات CORS للسماح للاتصال من الـ Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # منفذ Vite الافتراضي
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ 5. ربط مجلد uploads ليصبح متاحاً عبر الرابط /uploads
# الآن أي صورة في مجلد uploads يمكن الوصول إليها عبر http://127.0.0.1:8000/uploads/...
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ✅ 6. تضمين المسارات (Routers)
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(admin.router, prefix="/api", tags=["Management"])

@app.get("/")
def root():
    return {
        "message": "System Running Successfully! 🚀",
        "status": "Database tables created.",
        "uploads": "Available at /uploads"
    }

if __name__ == "__main__":
    import uvicorn
    # تشغيل السيرفر على المنفذ 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)