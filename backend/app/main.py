from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base  # ✅ أعدنا استيراد engine و Base
from app.routes import auth, admin

# ✅ هذا السطر سينشئ الجداول تلقائياً عند تشغيل السيرفر
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Football Tournament System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(admin.router, prefix="/api", tags=["Management"])

@app.get("/")
def root():
    return {"message": "System Running. Tables created automatically."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)