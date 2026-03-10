"""
Email Digest — Layer 5
======================
Sends two types of emails via Resend:

  1. Daily digest (8am)  — what the AI did last night per property
  2. Weekly report (Mon 8am) — RevPAR vs market, occupancy trend, weekly recommendation

Setup:
  pip install resend python-dotenv
  Add RESEND_API_KEY=re_xxx to your .env file
  Add FROM_EMAIL=digest@yourdomain.com to your .env file
"""

import resend
import os
import logging
from datetime import datetime, date, timedelta
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("email_digest")

DB_URL = "postgresql://localhost:5432/airbnb_engine"
engine = create_engine(DB_URL)

# Resend setup — reads from .env
resend.api_key = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL     = os.getenv("FROM_EMAIL", "digest@revengine.ai")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_users_with_active_sync() -> list[dict]:
    """Returns all users who have at least one property with sync enabled."""
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT DISTINCT
                p.user_id,
                gs.neighborhood
            FROM properties p
            JOIN property_sync_settings pss ON p.id = pss.property_id
            LEFT JOIN sync_settings gs ON p.user_id = gs.user_id
            WHERE p.neighborhood IS NOT NULL
              AND (
                (pss.use_global = true  AND gs.enabled = true) OR
                (pss.use_global = false AND pss.enabled = true)
              )
        """)).fetchall()
    return [{"user_id": r.user_id, "neighborhood": r.neighborhood} for r in rows]


def _get_user_email(user_id: str) -> str | None:
    """
    In production this would call Clerk's API to get the user's email.
    For now we store email in sync_settings if available, else return None.
    """
    with engine.connect() as conn:
        row = conn.execute(text("""
            SELECT email FROM sync_settings WHERE user_id = :uid
        """), {"uid": user_id}).fetchone()
    return row.email if row and hasattr(row, 'email') else None


def _get_last_night_logs(user_id: str) -> list[dict]:
    """Gets sync logs from the last 24 hours for a user."""
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT action, details, status, created_at
            FROM sync_logs
            WHERE user_id = :uid
              AND created_at >= NOW() - INTERVAL '24 hours'
            ORDER BY created_at DESC
        """), {"uid": user_id}).fetchall()
    return [{"action": r.action, "details": r.details,
             "status": r.status, "created_at": r.created_at} for r in rows]


def _get_weekly_revpar(neighborhood: str) -> dict:
    """Gets RevPAR stats for the past 4 weeks for the weekly report."""
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT
                month,
                ROUND(AVG(occupancy_rate)::numeric, 1) AS occupancy,
                ROUND(AVG(
                    estimated_revenue / NULLIF(total_days, 0)
                    * (occupancy_rate / 100.0)
                )::numeric, 2) AS revpar,
                ROUND(AVG(
                    estimated_revenue / NULLIF(total_days, 0)
                )::numeric, 2) AS adr
            FROM monthly_metrics
            WHERE neighborhood = :n AND total_days > 0
            GROUP BY month
            ORDER BY month DESC
            LIMIT 4
        """), {"n": neighborhood}).fetchall()

    if not rows:
        return {}

    latest = rows[0]
    prev   = rows[1] if len(rows) > 1 else None

    revpar_change = 0.0
    if prev and prev.revpar and latest.revpar:
        revpar_change = ((float(latest.revpar) - float(prev.revpar)) / float(prev.revpar)) * 100

    return {
        "month":         latest.month,
        "occupancy":     float(latest.occupancy or 0),
        "revpar":        float(latest.revpar or 0),
        "adr":           float(latest.adr or 0),
        "revpar_change": round(revpar_change, 1),
        "trend":         [{"month": r.month, "revpar": float(r.revpar or 0),
                           "occupancy": float(r.occupancy or 0)} for r in rows],
    }


def _get_property_count(user_id: str) -> dict:
    """Gets property counts for the digest header."""
    with engine.connect() as conn:
        total = conn.execute(text(
            "SELECT COUNT(*) FROM properties WHERE user_id = :uid"
        ), {"uid": user_id}).scalar() or 0

        active = conn.execute(text("""
            SELECT COUNT(*) FROM properties p
            JOIN property_sync_settings pss ON p.id = pss.property_id
            LEFT JOIN sync_settings gs ON p.user_id = gs.user_id
            WHERE p.user_id = :uid
              AND ((pss.use_global=true AND gs.enabled=true) OR
                   (pss.use_global=false AND pss.enabled=true))
        """), {"uid": user_id}).scalar() or 0

    return {"total": int(total), "active": int(active)}


# ── Email HTML builders ───────────────────────────────────────────────────────

def _build_daily_html(user_id: str, logs: list[dict], props: dict) -> str:
    today = date.today().strftime("%A, %d %B %Y")

    # Build log rows
    log_rows = ""
    if logs:
        for log in logs[:10]:  # Max 10 rows
            status_color = "#16a34a" if log["status"] == "success" else \
                           "#d97706" if log["status"] == "warning" else "#dc2626"
            status_dot = f'<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:{status_color};margin-right:6px;vertical-align:middle;"></span>'
            log_rows += f"""
            <tr>
              <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#111827;">
                {status_dot}{log['action']}
              </td>
              <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#6b7280;max-width:300px;">
                {log.get('details','') or '—'}
              </td>
            </tr>"""
    else:
        log_rows = """
        <tr>
          <td colspan="2" style="padding:24px;text-align:center;color:#9ca3af;font-size:13px;">
            No sync activity in the last 24 hours.
          </td>
        </tr>"""

    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#111827;padding:32px 40px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
        <div style="width:32px;height:32px;background:#FF385C;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:900;color:white;font-size:16px;">R</div>
        <span style="color:white;font-weight:700;font-size:18px;letter-spacing:-0.5px;">RevEngine AI</span>
      </div>
      <h1 style="color:white;margin:0;font-size:22px;font-weight:800;letter-spacing:-0.5px;">
        Your Nightly Sync Report
      </h1>
      <p style="color:#9ca3af;margin:6px 0 0;font-size:14px;">{today}</p>
    </div>

    <!-- Stats row -->
    <div style="display:flex;border-bottom:1px solid #f3f4f6;">
      <div style="flex:1;padding:20px 24px;text-align:center;border-right:1px solid #f3f4f6;">
        <div style="font-size:28px;font-weight:900;color:#111827;">{props['total']}</div>
        <div style="font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Total Properties</div>
      </div>
      <div style="flex:1;padding:20px 24px;text-align:center;border-right:1px solid #f3f4f6;">
        <div style="font-size:28px;font-weight:900;color:#FF385C;">{props['active']}</div>
        <div style="font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Auto-Sync Active</div>
      </div>
      <div style="flex:1;padding:20px 24px;text-align:center;">
        <div style="font-size:28px;font-weight:900;color:#16a34a;">{len([l for l in logs if l['status']=='success'])}</div>
        <div style="font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Syncs Successful</div>
      </div>
    </div>

    <!-- Sync log table -->
    <div style="padding:24px 32px 8px;">
      <h2 style="font-size:15px;font-weight:700;color:#111827;margin:0 0 16px;">
        Last Night's Activity
      </h2>
    </div>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Action</th>
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Details</th>
        </tr>
      </thead>
      <tbody>{log_rows}</tbody>
    </table>

    <!-- CTA -->
    <div style="padding:32px;text-align:center;border-top:1px solid #f3f4f6;margin-top:16px;">
      <a href="http://localhost:5173/settings"
         style="display:inline-block;padding:12px 28px;background:#FF385C;color:white;font-weight:700;font-size:14px;border-radius:10px;text-decoration:none;">
        View Full Dashboard →
      </a>
    </div>

    <!-- Footer -->
    <div style="padding:20px 32px;background:#f9fafb;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">
        © 2026 RevEngine AI · You're receiving this because auto-sync is enabled.
      </p>
    </div>
  </div>
</body>
</html>"""


def _build_weekly_html(user_id: str, neighborhood: str, stats: dict) -> str:
    week_start = date.today().strftime("%d %B %Y")

    # Trend bars (simple visual)
    trend_bars = ""
    if stats.get("trend"):
        max_revpar = max(t["revpar"] for t in stats["trend"]) or 1
        for t in reversed(stats["trend"]):
            width = int((t["revpar"] / max_revpar) * 100)
            trend_bars += f"""
            <div style="margin-bottom:10px;">
              <div style="display:flex;align-items:center;gap:10px;">
                <span style="font-size:12px;color:#6b7280;width:60px;text-align:right;">{t['month']}</span>
                <div style="flex:1;background:#f3f4f6;border-radius:4px;height:20px;position:relative;">
                  <div style="width:{width}%;background:#FF385C;border-radius:4px;height:100%;"></div>
                </div>
                <span style="font-size:12px;font-weight:700;color:#111827;width:50px;">£{t['revpar']}</span>
              </div>
            </div>"""

    # RevPAR change badge
    change = stats.get("revpar_change", 0)
    change_color  = "#16a34a" if change >= 0 else "#dc2626"
    change_symbol = "▲" if change >= 0 else "▼"
    change_text   = f"{change_symbol} {abs(change):.1f}% vs last month"

    # Weekly recommendation
    occ = stats.get("occupancy", 0)
    if occ < 65:
        recommendation = "⚠️ Occupancy is below 65%. Consider enabling price drop for the next 2 weeks to fill gaps."
    elif occ >= 80:
        recommendation = "🚀 Occupancy is above 80%. You're in peak demand — the AI is raising prices. No action needed."
    else:
        recommendation = "✅ Occupancy is healthy. Pricing is well-calibrated. Consider raising min price slightly for weekend dates."

    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#111827;padding:32px 40px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
        <div style="width:32px;height:32px;background:#FF385C;border-radius:8px;font-weight:900;color:white;font-size:16px;display:flex;align-items:center;justify-content:center;">R</div>
        <span style="color:white;font-weight:700;font-size:18px;">RevEngine AI</span>
      </div>
      <h1 style="color:white;margin:0;font-size:22px;font-weight:800;">Weekly Market Report</h1>
      <p style="color:#9ca3af;margin:6px 0 0;font-size:14px;">Week of {week_start} · {neighborhood}</p>
    </div>

    <!-- KPI cards -->
    <div style="display:flex;border-bottom:1px solid #f3f4f6;">
      <div style="flex:1;padding:20px;text-align:center;border-right:1px solid #f3f4f6;">
        <div style="font-size:26px;font-weight:900;color:#FF385C;">£{stats.get('revpar', 0):.2f}</div>
        <div style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;margin-top:2px;">RevPAR</div>
        <div style="font-size:12px;font-weight:700;color:{change_color};margin-top:4px;">{change_text}</div>
      </div>
      <div style="flex:1;padding:20px;text-align:center;border-right:1px solid #f3f4f6;">
        <div style="font-size:26px;font-weight:900;color:#111827;">{stats.get('occupancy', 0):.1f}%</div>
        <div style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;margin-top:2px;">Occupancy</div>
      </div>
      <div style="flex:1;padding:20px;text-align:center;">
        <div style="font-size:26px;font-weight:900;color:#111827;">£{stats.get('adr', 0):.2f}</div>
        <div style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;margin-top:2px;">Avg Nightly Rate</div>
      </div>
    </div>

    <!-- RevPAR trend chart -->
    <div style="padding:28px 32px;">
      <h2 style="font-size:15px;font-weight:700;color:#111827;margin:0 0 16px;">4-Month RevPAR Trend</h2>
      {trend_bars or '<p style="color:#9ca3af;font-size:13px;">No historical data available yet.</p>'}
    </div>

    <!-- AI Recommendation -->
    <div style="margin:0 32px 28px;padding:16px 20px;background:#f9fafb;border-radius:12px;border-left:4px solid #FF385C;">
      <p style="font-size:12px;font-weight:700;color:#FF385C;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 6px;">
        AI Weekly Recommendation
      </p>
      <p style="font-size:14px;color:#374151;margin:0;line-height:1.6;">{recommendation}</p>
    </div>

    <!-- CTA -->
    <div style="padding:24px 32px;text-align:center;border-top:1px solid #f3f4f6;">
      <a href="http://localhost:5173/market"
         style="display:inline-block;padding:12px 28px;background:#FF385C;color:white;font-weight:700;font-size:14px;border-radius:10px;text-decoration:none;">
        View Market Intel →
      </a>
    </div>

    <!-- Footer -->
    <div style="padding:20px 32px;background:#f9fafb;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">© 2026 RevEngine AI</p>
    </div>
  </div>
</body>
</html>"""


# ── Send functions ────────────────────────────────────────────────────────────

def send_daily_digest(to_email: str, user_id: str):
    """Sends the daily sync summary to one user."""
    if not resend.api_key:
        logger.warning("RESEND_API_KEY not set — skipping email")
        return False

    logs  = _get_last_night_logs(user_id)
    props = _get_property_count(user_id)
    html  = _build_daily_html(user_id, logs, props)

    try:
        resend.Emails.send({
            "from":    FROM_EMAIL,
            "to":      [to_email],
            "subject": f"RevEngine: {props['active']} properties synced last night ✓",
            "html":    html,
        })
        logger.info(f"Daily digest sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send daily digest to {to_email}: {e}")
        return False


def send_weekly_report(to_email: str, user_id: str, neighborhood: str):
    """Sends the weekly RevPAR report to one user."""
    if not resend.api_key:
        logger.warning("RESEND_API_KEY not set — skipping email")
        return False

    stats = _get_weekly_revpar(neighborhood)
    if not stats:
        logger.info(f"No RevPAR data for {neighborhood} — skipping weekly report")
        return False

    html = _build_weekly_html(user_id, neighborhood, stats)

    try:
        resend.Emails.send({
            "from":    FROM_EMAIL,
            "to":      [to_email],
            "subject": f"RevEngine Weekly: {neighborhood} RevPAR £{stats['revpar']:.2f} ({stats['revpar_change']:+.1f}%)",
            "html":    html,
        })
        logger.info(f"Weekly report sent to {to_email} for {neighborhood}")
        return True
    except Exception as e:
        logger.error(f"Failed to send weekly report to {to_email}: {e}")
        return False


# ── Batch senders (called by scheduler) ──────────────────────────────────────

def send_all_daily_digests(user_email_map: dict):
    """
    Called by scheduler at 8am daily.
    user_email_map: { user_id: email_address }
    """
    users = _get_users_with_active_sync()
    sent = 0
    for u in users:
        email = user_email_map.get(u["user_id"])
        if email:
            if send_daily_digest(email, u["user_id"]):
                sent += 1
        else:
            logger.warning(f"No email found for user {u['user_id']} — skipping")
    logger.info(f"Daily digest: sent {sent}/{len(users)} emails")


def send_all_weekly_reports(user_email_map: dict):
    """
    Called by scheduler on Monday 8am.
    user_email_map: { user_id: email_address }
    """
    users = _get_users_with_active_sync()
    sent = 0
    for u in users:
        email = user_email_map.get(u["user_id"])
        if email and u.get("neighborhood"):
            if send_weekly_report(email, u["user_id"], u["neighborhood"]):
                sent += 1
    logger.info(f"Weekly report: sent {sent}/{len(users)} emails")
