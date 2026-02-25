import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

load_dotenv()

async def send_reset_email(email_to: str, token: str):
    # جلب الإعدادات من ملف .env
    smtp_server = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    sender_email = os.getenv("SMTP_EMAIL")
    sender_password = os.getenv("SMTP_PASSWORD")
    
    if not sender_email or not sender_password:
        print("❌ خطأ: تأكد من إعدادات SMTP في ملف .env")
        return False

    reset_link = f"http://localhost:5173/reset-password?token={token}"
    
    # إنشاء الرسالة
    message = MIMEMultipart("alternative")
    message["Subject"] = "🔐 رابط تعيين كلمة المرور - نظام البطولات"
    message["From"] = sender_email
    message["To"] = email_to
    
    # نص الرسالة (Plain Text)
    text = f"""
    مرحباً بك في نظام إدارة البطولات!
    
    لقد تم إنشاء حساب لك. يرجى الضغط على الرابط التالي لتعيين كلمة المرور الخاصة بك:
    
    {reset_link}
    
    هذا الرابط صالح لمدة 3 أيام.
    
    مع التحية،
    فريق الدعم التقني
    """
    
    # نص الرسالة (HTML - تصميم أجمل)
    html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 10px;">
          <h2 style="color: #1e3a8a;">مرحباً بك في نظام البطولات ⚽</h2>
          <p>تم إنشاء حساب جديد لك بنجاح.</p>
          <p>لتفعيل حسابك وتعيين كلمة المرور، انقر على الزر أدناه:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_link}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              تعيين كلمة المرور الجديدة
            </a>
          </div>
          
          <p style="font-size: 12px; color: #666;">أو انسخ هذا الرابط وضعه في المتصفح:<br>{reset_link}</p>
          <hr style="border: 0; border-top: 1px solid #ddd; margin-top: 20px;">
          <p style="font-size: 12px; color: #999;">إذا لم تطلب هذا، تجاهل هذه الرسالة.</p>
        </div>
      </body>
    </html>
    """
    
    part1 = MIMEText(text, "plain", "utf-8")
    part2 = MIMEText(html, "html", "utf-8")
    
    message.attach(part1)
    message.attach(part2)
    
    try:
        # الاتصال بالسيرفر والإرسال
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()  # تأمين الاتصال
            server.login(sender_email, sender_password)
            server.send_message(message)
        
        print(f"✅ تم إرسال الإيميل بنجاح إلى: {email_to}")
        return True
        
    except Exception as e:
        print(f"❌ فشل إرسال الإيميل: {e}")
        return False