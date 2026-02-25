import sys
import os

# ضمان وجود المسار الصحيح
# هذا السطر يجعل بايثون يفهم أننا نعمل داخل حزمة app
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# الآن الاستيراد سيكون صحيحاً باستخدام app.module_name
from app.database import engine, Base
from app.models.user import User
from app.models.tournament import Tournament, Team, Match, Player, Coach, Referee, Stadium, PlayerStat

def init_db():
    print("🔄 جاري الاتصال بقاعدة البيانات وإنشاء الجداول...")
    try:
        # هذا السطر هو السحر: ينشئ كل الجداول في MySQL
        Base.metadata.create_all(bind=engine)
        print("✅ تم إنشاء الجداول بنجاح!")
        print("💡 يمكنك الآن تشغيل السيرفر وتجربة التسجيل.")
    except Exception as e:
        print(f"❌ حدث خطأ فادح: {e}")
        # طباعة تفاصيل الخطأ للمساعدة في التشخيص
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    init_db()