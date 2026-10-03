"""
Test SMTP email configuration
Run: python test_email.py
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
import os

load_dotenv()

def test_smtp():
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    email_from = os.getenv("EMAIL_FROM", smtp_user)
    
    if not all([smtp_host, smtp_user, smtp_password]):
        print("❌ Missing SMTP configuration in .env file")
        print("\nRequired variables:")
        print("  SMTP_HOST")
        print("  SMTP_PORT")
        print("  SMTP_USER")
        print("  SMTP_PASSWORD")
        print("  EMAIL_FROM")
        return
    
    print("🔧 Testing SMTP configuration...")
    print(f"   Host: {smtp_host}")
    print(f"   Port: {smtp_port}")
    print(f"   User: {smtp_user}")
    print(f"   From: {email_from}")
    print()
    
    try:
        # Create test message
        msg = MIMEMultipart()
        msg['From'] = email_from
        msg['To'] = smtp_user  # Send to yourself
        msg['Subject'] = "InterviewLens - SMTP Test"
        
        body = """
        ✅ Success! Your SMTP configuration is working correctly.
        
        This test email was sent from your InterviewLens application.
        You can now send interview invitations to candidates.
        
        - InterviewLens
        """
        msg.attach(MIMEText(body, 'plain'))
        
        # Connect and send
        print("📧 Connecting to SMTP server...")
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            print("🔐 Logging in...")
            server.login(smtp_user, smtp_password)
            print("📤 Sending test email...")
            server.send_message(msg)
        
        print()
        print("✅ SUCCESS! Test email sent!")
        print(f"📬 Check your inbox: {smtp_user}")
        print()
        
    except smtplib.SMTPAuthenticationError:
        print()
        print("❌ Authentication failed!")
        print()
        print("Common fixes:")
        print("  1. Check your SMTP_USER (email address)")
        print("  2. Check your SMTP_PASSWORD")
        print("  3. For Gmail: Use App Password, not regular password")
        print("     - Enable 2-Step Verification first")
        print("     - Generate App Password at: https://myaccount.google.com/apppasswords")
        print()
        
    except smtplib.SMTPException as e:
        print()
        print(f"❌ SMTP Error: {e}")
        print()
        
    except Exception as e:
        print()
        print(f"❌ Error: {e}")
        print()

if __name__ == "__main__":
    test_smtp()
