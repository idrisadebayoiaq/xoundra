import json
import pathlib
import secrets

root = pathlib.Path(__file__).resolve().parents[1]
fb = (root / "xoundora-firebase-adminsdk-fbsvc-bafca2d61e.json").read_text(encoding="utf-8")
json.loads(fb)
cron = secrets.token_hex(24)


def dq(tag: str, value: str) -> str:
    if tag in value:
        raise SystemExit(f"tag {tag} appears in value")
    return f"${tag}${value}${tag}$"


sql = "\n".join(
    [
        "insert into private.app_secrets(name, value) values",
        f"('CHECK_IN_CRON_SECRET', {dq('cronsec', cron)}),",
        f"('PUSH_DISPATCH_SECRET', {dq('cronsec', cron)}),",
        f"('FIREBASE_SERVICE_ACCOUNT', {dq('fbjson', fb)})",
        "on conflict (name) do update set value = excluded.value, updated_at = now();",
        "select name, length(value) as bytes from private.app_secrets",
        "where name in ('CHECK_IN_CRON_SECRET','PUSH_DISPATCH_SECRET','FIREBASE_SERVICE_ACCOUNT')",
        "order by name;",
    ]
)
out = root / "_seed_app_secrets.sql"
out.write_text(sql, encoding="utf-8")
print(f"wrote {out.name} bytes={out.stat().st_size} cron_len={len(cron)}")
