#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
tracks = json.loads((ROOT / "catalog" / "originals-manifest.json").read_text(encoding="utf-8"))["tracks"]
vals = []
tags = []
for t in tracks:
  title = t["title"].replace("'", "''")
  vals.append(
    f"('{t['id']}', '{title}', '{t['category']}', {t['duration']}, 'free', 'published', '{t['shelf']}', true, "
    f"'metadata', 'originals/{t['id']}.jpg', 'catalogue/{t['id']}.mp3', 'owned', true)"
  )
  for tag in t["tags"]:
    tags.append(f"('{t['id']}', '{tag}')")

sql = f"""insert into public.tracks (
  id, title, category, duration_seconds, access_tier, status, shelf, loop_ok,
  name_source, artwork_path, audio_path, rights_status, downloads_require_premium
) values
{',\n'.join(vals)}
on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  duration_seconds = excluded.duration_seconds,
  access_tier = excluded.access_tier,
  status = excluded.status,
  shelf = excluded.shelf,
  loop_ok = excluded.loop_ok,
  artwork_path = excluded.artwork_path,
  audio_path = excluded.audio_path,
  rights_status = excluded.rights_status,
  downloads_require_premium = excluded.downloads_require_premium;

delete from public.track_tags where track_id in ({', '.join("'"+t['id']+"'" for t in tracks)});
insert into public.track_tags (track_id, tag) values
{',\n'.join(tags)}
on conflict (track_id, tag) do nothing;
"""
out = ROOT / "catalog" / "originals-insert.sql"
out.write_text(sql, encoding="utf-8")
print(f"wrote {out} tracks={len(tracks)} tags={len(tags)}")
