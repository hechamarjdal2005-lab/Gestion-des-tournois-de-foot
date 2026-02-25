from datetime import datetime, timedelta
from jose import JWTError, jwt
import os
from dotenv import load_dotenv
import bcrypt

# تحميل المتغيرات من ملف .env
load_dotenv()

# قراءة SECRET_KEY من ملف .env
# إذا لم يجدها، سيستخدم هذا المفتاح الافتراضي للتجربة فقط
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    print("⚠️ تحذير: لم يتم العثور على SECRET_KEY في ملف .env، جاري استخدام مفتاح افتراضي!")
    SECRET_KEY = "default_secret_key_for_testing_purposes_only_123456789"

ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

def verify_password(plain_password, hashed_password):
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token(token: str):
    try:
        # فك التشفير باستخدام نفس المفتاح والخوارزمية
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        print(f"❌ خطأ في فك التوكن: {e}")
        return None