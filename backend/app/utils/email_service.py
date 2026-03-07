"""
app/utils/email_service.py
"""

import smtplib
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv()

EMAIL_USER   = os.getenv("SMTP_EMAIL", "")
EMAIL_PASS   = os.getenv("SMTP_PASSWORD", "")
EMAIL_FROM   = os.getenv("SMTP_EMAIL", EMAIL_USER)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


def _build_html(name: str, role: str, reset_link: str) -> str:
    ROLES = {
        "referee":      ("⚖️", "Match Referee",   "#f59e0b"),
        "team_manager": ("🛡️", "Team Manager",    "#3b82f6"),
        "coach":        ("🎽", "Team Coach",       "#10b981"),
        "player":       ("⚽", "Player",           "#ef4444"),
    }
    icon, label, color = ROLES.get(role, ("👤", role, "#6366f1"))

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  body{{font-family:Arial,sans-serif;background:#f0f4f8;padding:24px}}
  .card{{max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1)}}
  .hdr{{background:linear-gradient(135deg,#0f172a,#1e3a5f);padding:32px;text-align:center;color:#fff}}
  .hdr-icon{{font-size:48px;display:block;margin-bottom:12px}}
  .hdr h1{{font-size:20px;font-weight:900;margin-bottom:4px}}
  .hdr p{{color:rgba(255,255,255,0.5);font-size:13px}}
  .badge{{display:inline-block;margin-top:14px;padding:6px 18px;border-radius:99px;font-size:13px;font-weight:700;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2)}}
  .body{{padding:32px}}
  .greeting{{font-size:17px;font-weight:700;margin-bottom:8px}}
  .text{{font-size:14px;color:#64748b;line-height:1.8;margin-bottom:24px}}
  .btn{{display:block;text-align:center;padding:14px;border-radius:12px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;margin-bottom:24px;background:{color}}}
  .warn{{background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;font-size:12px;color:#92400e;margin-bottom:20px}}
  .link-box{{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px}}
  .link-box p{{font-size:11px;color:#94a3b8;margin-bottom:6px}}
  .link-val{{font-size:11px;word-break:break-all;color:#475569;font-family:monospace}}
  .ftr{{background:#f8fafc;border-top:1px solid #f1f5f9;padding:16px;text-align:center;font-size:11px;color:#94a3b8}}
</style>
</head>
<body>
<div class="card">
  <div class="hdr">
    <span class="hdr-icon">{icon}</span>
    <h1>You're invited to join the platform</h1>
    <p>Sports Tournament Management Platform</p>
    <span class="badge">{icon} {label}</span>
  </div>
  <div class="body">
    <p class="greeting">Hello {name or 'there'},</p>
    <p class="text">Your account on the <strong>Tournament Platform</strong> has been created as a <strong>{label}</strong>.<br/>
    Click the button below to activate your account and set a password.</p>
    <a href="{reset_link}" class="btn">🔐 Activate My Account</a>
    <div class="warn">⏳ This link is valid for <strong>3 days</strong> only.</div>
    <div class="link-box">
      <p>Or copy the link:</p>
      <div class="link-val">{reset_link}</div>
    </div>
  </div>
  <div class="ftr">Automated message · © 2025 Tournament Platform</div>
</div>
</body>
</html>"""


def send_invite_email_sync(to_email: str, token: str, name: str = "", role: str = "user"):
    reset_link = f"{FRONTEND_URL}/reset-password?token={token}"

    if not EMAIL_USER or not EMAIL_PASS:
        print("━" * 55)
        print("⚠️  EMAIL not configured — link printed to terminal:")
        print(f"   To   : {to_email}  ({role})")
        print(f"   Link : {reset_link}")
        print("━" * 55)
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "🏆 You're invited to join the Tournament Platform"
    msg["From"]    = f"Tournament Platform <{EMAIL_FROM}>"
    msg["To"]      = to_email

    plain = f"Hello {name},\nActivate your account: {reset_link}\nValid for 3 days."
    msg.attach(MIMEText(plain, "plain", "utf-8"))
    msg.attach(MIMEText(_build_html(name, role, reset_link), "html", "utf-8"))

    try:
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(EMAIL_USER, EMAIL_PASS)
            server.sendmail(EMAIL_FROM, to_email, msg.as_string())
        print(f"✅ [EMAIL] Sent to {to_email} ({role})")

    except smtplib.SMTPAuthenticationError:
        print("❌ [EMAIL] Gmail authentication failed — check your App Password")
        raise
    except Exception as e:
        print(f"❌ [EMAIL] {type(e).__name__}: {e}")
        raise


async def send_reset_email(to_email: str, token: str, name: str = "", role: str = "user"):
    send_invite_email_sync(to_email, token, name=name, role=role)