"""
Scheduler — Layer 2 + Layer 5
Runs:
  00:00 daily  → nightly pricing sync for all active properties
  08:00 daily  → send daily digest emails
  08:00 Monday → send weekly RevPAR report emails
"""
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import create_engine, text
from pricing_engine import PricingContext, calculate_price
from datetime import datetime, date
import logging

logger = logging.getLogger("scheduler")
DB_URL = "postgresql://localhost:5432/airbnb_engine"
engine = create_engine(DB_URL)


def _get_user_email_map() -> dict:
    """
    Builds { user_id: email } from sync_settings table.
    In production this would call Clerk's API. For now hosts
    provide their email when saving settings.
    """
    with engine.connect() as conn:
        rows = conn.execute(text(
            "SELECT user_id, email FROM sync_settings WHERE email IS NOT NULL"
        )).fetchall()
    return {r.user_id: r.email for r in rows}


def sync_property(property_id: int, user_id: str, neighborhood: str,
                  min_price: float, max_price: float):
    try:
        ctx = PricingContext(
            neighborhood=neighborhood, target_date=date.today(),
            min_price=min_price, max_price=max_price,
        )
        result = calculate_price(ctx)
        with engine.begin() as conn:
            conn.execute(text("""
                INSERT INTO sync_logs (user_id, action, details, status)
                VALUES (:uid, :action, :details, 'success')
            """), {
                "uid":    user_id,
                "action": f"[Property {property_id}] Nightly sync — {result.summary}",
                "details": f"Base: £{result.base_price} → Final: £{result.final_price} | Occ: {result.occupancy_rate}% | {result.clamp_reason or 'Within guardrails'}"
            })
        logger.info(f"[Sync] Property {property_id} → £{result.final_price}")
    except Exception as e:
        logger.error(f"[Sync] Property {property_id} failed: {e}")
        with engine.begin() as conn:
            conn.execute(text("""
                INSERT INTO sync_logs (user_id, action, details, status)
                VALUES (:uid, :action, :details, 'error')
            """), {"uid": user_id,
                   "action": f"[Property {property_id}] Sync failed",
                   "details": str(e)})


def run_nightly_sync():
    logger.info(f"[Scheduler] Nightly sync started — {datetime.now().isoformat()}")
    try:
        with engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT p.id, p.user_id, p.neighborhood,
                       pss.use_global, pss.enabled AS prop_enabled,
                       pss.min_price AS prop_min, pss.max_price AS prop_max,
                       gs.enabled AS global_enabled,
                       gs.min_price AS global_min, gs.max_price AS global_max
                FROM properties p
                JOIN property_sync_settings pss ON p.id = pss.property_id
                LEFT JOIN sync_settings gs ON p.user_id = gs.user_id
                WHERE p.neighborhood IS NOT NULL AND p.neighborhood != ''
            """)).fetchall()

        active = []
        for r in rows:
            if r.use_global:
                should_sync = bool(r.global_enabled)
                min_p, max_p = float(r.global_min or 30), float(r.global_max or 500)
            else:
                should_sync = bool(r.prop_enabled)
                min_p, max_p = float(r.prop_min or 30), float(r.prop_max or 500)
            if should_sync:
                active.append((r.id, r.user_id, r.neighborhood, min_p, max_p))

        logger.info(f"[Scheduler] Syncing {len(active)} properties")
        for args in active:
            sync_property(*args)
        logger.info(f"[Scheduler] Done — {len(active)} synced")
    except Exception as e:
        logger.error(f"[Scheduler] Nightly sync failed: {e}")


def run_daily_digest():
    """8am daily — send sync summary emails."""
    logger.info("[Scheduler] Sending daily digest emails...")
    try:
        from email_digest import send_all_daily_digests
        email_map = _get_user_email_map()
        send_all_daily_digests(email_map)
    except Exception as e:
        logger.error(f"[Scheduler] Daily digest failed: {e}")


def run_weekly_report():
    """Monday 8am — send weekly RevPAR report emails."""
    logger.info("[Scheduler] Sending weekly report emails...")
    try:
        from email_digest import send_all_weekly_reports
        email_map = _get_user_email_map()
        send_all_weekly_reports(email_map)
    except Exception as e:
        logger.error(f"[Scheduler] Weekly report failed: {e}")


def create_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler(timezone="Europe/London")

    # 00:00 daily — pricing sync
    scheduler.add_job(
        run_nightly_sync,
        CronTrigger(hour=0, minute=0),
        id="nightly_sync",
        name="Nightly Pricing Sync",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    # 08:00 daily — daily digest email
    scheduler.add_job(
        run_daily_digest,
        CronTrigger(hour=8, minute=0),
        id="daily_digest",
        name="Daily Email Digest",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    # 08:00 Monday — weekly report email
    scheduler.add_job(
        run_weekly_report,
        CronTrigger(day_of_week="mon", hour=8, minute=0),
        id="weekly_report",
        name="Weekly RevPAR Report",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    return scheduler


def get_scheduler_status(scheduler: BackgroundScheduler) -> dict:
    jobs = []
    for job_id in ["nightly_sync", "daily_digest", "weekly_report"]:
        job = scheduler.get_job(job_id)
        if job:
            jobs.append({
                "id":       job.id,
                "name":     job.name,
                "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
            })

    nightly = scheduler.get_job("nightly_sync")
    return {
        "status":   "running" if scheduler.running else "stopped",
        "next_run": nightly.next_run_time.isoformat() if nightly and nightly.next_run_time else None,
        "timezone": "Europe/London",
        "jobs":     jobs,
    }