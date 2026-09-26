"""
Outbound email.

With SMTP_HOST configured, messages go out over SMTP (STARTTLS on 587 or
implicit SSL on 465). Without it, each message is written as an .eml file to
EMAIL_OUTBOX_DIR so the whole invite flow works locally with no mail server.
"""
import asyncio
import html
import logging
import smtplib
import ssl
from dataclasses import dataclass
from datetime import datetime, timezone
from email.message import EmailMessage
from pathlib import Path
from urllib.parse import urlencode

from app.core.config import settings

logger = logging.getLogger(__name__)

SEND_TIMEOUT_SECONDS = 20


@dataclass
class RenderedEmail:
    to: str
    subject: str
    html: str
    text: str


@dataclass
class DeliveryResult:
    sent: bool
    mode: str            # "smtp" | "outbox"
    detail: str = ""


def _build_message(email: RenderedEmail) -> EmailMessage:
    msg = EmailMessage()
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = email.to
    msg["Subject"] = email.subject
    msg.set_content(email.text)
    msg.add_alternative(email.html, subtype="html")
    return msg


def _send_smtp(msg: EmailMessage) -> None:
    context = ssl.create_default_context()
    if settings.SMTP_PORT == 465 and not settings.SMTP_USE_TLS:
        with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=context, timeout=SEND_TIMEOUT_SECONDS) as s:
            if settings.SMTP_USER:
                s.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            s.send_message(msg)
        return
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=SEND_TIMEOUT_SECONDS) as s:
        if settings.SMTP_USE_TLS:
            s.starttls(context=context)
        if settings.SMTP_USER:
            s.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        s.send_message(msg)


def _write_outbox(msg: EmailMessage, to: str) -> Path:
    outbox = Path(settings.EMAIL_OUTBOX_DIR)
    outbox.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%f")
    safe_to = "".join(c if c.isalnum() else "_" for c in to)
    path = outbox / f"{stamp}_{safe_to}.eml"
    path.write_bytes(bytes(msg))
    return path


async def send_email(email: RenderedEmail) -> DeliveryResult:
    msg = _build_message(email)
    if not settings.SMTP_HOST:
        path = await asyncio.to_thread(_write_outbox, msg, email.to)
        logger.info(f"SMTP not configured — wrote email for {email.to} to {path}")
        return DeliveryResult(sent=False, mode="outbox", detail=str(path))
    try:
        await asyncio.to_thread(_send_smtp, msg)
        logger.info(f"Sent '{email.subject}' to {email.to}")
        return DeliveryResult(sent=True, mode="smtp")
    except Exception as e:  # network, auth, relay refusal…
        logger.warning(f"Failed to send email to {email.to}: {e}")
        return DeliveryResult(sent=False, mode="smtp", detail=str(e))


# ── Templates ────────────────────────────────────────────────────────────────

def candidate_login_link(email: str, access_token: str) -> str:
    return f"{settings.FRONTEND_URL}/candidate/login?{urlencode({'email': email, 'token': access_token})}"


def render_invite(session, interviewer_name: str, company: str | None, problem_count: int) -> RenderedEmail:
    """Invite sent to the candidate when an interview is created (or resent)."""
    link = candidate_login_link(session.candidate_email, session.access_token)
    org = company or "the hiring team"
    when = (
        session.scheduled_at.strftime("%A, %d %B %Y at %H:%M UTC")
        if session.scheduled_at else "Any time — the timer starts when you click Begin"
    )
    e = html.escape
    name = session.candidate_name or "there"

    rows = [
        ("Assessment", session.title),
        ("Role", session.candidate_role or "—"),
        ("When", when),
        ("Duration", f"{session.duration_minutes} minutes"),
        ("Problems", str(problem_count)),
        ("Access token", session.access_token),
    ]
    rows_html = "".join(
        f'<tr><td style="padding:6px 0;color:#6b7280;width:130px">{e(k)}</td>'
        f'<td style="padding:6px 0;color:#111827;font-weight:600;'
        f'{"font-family:Menlo,Consolas,monospace;letter-spacing:1px" if k == "Access token" else ""}">{e(v)}</td></tr>'
        for k, v in rows
    )

    body_html = f"""<!doctype html>
<html><body style="margin:0;background:#f3f4f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
  <tr><td style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:24px 32px;color:#fff">
    <div style="font-size:18px;font-weight:700">InterviewLens</div>
    <div style="font-size:13px;opacity:.85;margin-top:2px">Technical assessment invitation</div>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 12px;font-size:16px;color:#111827">Hi {e(name)},</p>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#374151">
      {e(interviewer_name)} from {e(org)} has invited you to a live technical interview on InterviewLens.
      You'll solve coding problems in a browser-based editor while your interviewer follows along.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border-top:1px solid #f3f4f6;border-bottom:1px solid #f3f4f6;margin-bottom:24px">{rows_html}</table>
    <p style="text-align:center;margin:0 0 24px">
      <a href="{e(link)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 28px;border-radius:10px">Join your interview</a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#111827">Before you start</p>
    <ul style="margin:0 0 20px;padding-left:18px;font-size:13px;line-height:1.7;color:#4b5563">
      <li>Use a recent Chrome, Edge or Firefox on a laptop or desktop.</li>
      <li>Allow camera and microphone access — the session is proctored.</li>
      <li>Stay in the interview tab; tab switches and pastes are recorded.</li>
    </ul>
    <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6">
      If the button doesn't work, open {e(settings.FRONTEND_URL)}/candidate/login and sign in with
      <strong>{e(session.candidate_email)}</strong> and the access token above.
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>"""

    body_text = (
        f"Hi {name},\n\n"
        f"{interviewer_name} from {org} has invited you to a live technical interview on InterviewLens.\n\n"
        + "\n".join(f"{k}: {v}" for k, v in rows)
        + f"\n\nJoin: {link}\n\n"
        "Use a recent desktop browser and allow camera/microphone access. "
        "Tab switches and pastes are recorded during the session.\n"
    )

    return RenderedEmail(
        to=session.candidate_email,
        subject=f"Your interview invitation: {session.title}",
        html=body_html,
        text=body_text,
    )
