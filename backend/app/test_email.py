from app.utils.email_service import send_reset_email

result = send_reset_email("hafudyhui@gmail.com", "test-token-123")
print("Result:", result)