import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

load_dotenv()

def send_reset_email(email_to: str, token: str):
    smtp_server = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    sender_email = os.getenv("SMTP_EMAIL")
    sender_password = os.getenv("SMTP_PASSWORD")

    if not sender_email or not sender_password:
        raise ValueError("❌ SMTP_EMAIL أو SMTP_PASSWORD ناقصين في .env")

    reset_link = f"http://localhost:5173/reset-password?token={token}"

    message = MIMEMultipart("alternative")
    message["Subject"] = "🔐 رابط تعيين كلمة المرور"
    message["From"] = sender_email
    message["To"] = email_to

    html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 10px;">
          <h2 style="color: #1e3a8a;">مرحباً بك في نظام البطولات ⚽</h2>
          <p>تم إنشاء حساب جديد لك بنجاح.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_link}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              تعيين كلمة المرور
            </a>
          </div>
          <p style="font-size: 12px; color: #666;">{reset_link}</p>
        </div>
      </body>
    </html>
    """

    message.attach(MIMEText(html, "html", "utf-8"))

    # ✅ هنا كيبان الخطأ الحقيقي
    with smtplib.SMTP(smtp_server, smtp_port) as server:
        server.starttls()
        server.login(sender_email, sender_password)
        server.send_message(message)

    print(f"✅ إرسال ناجح: {email_to}")
    return True