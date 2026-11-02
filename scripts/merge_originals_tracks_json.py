#!/usr/bin/env python3
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / "catalog" / "originals-manifest.json").read_text(encoding="utf-8"))["tracks"]
tracks = json.loads((root / "src" / "data" / "tracks.json").read_text(encoding="utf-8"))
existing = {t["id"] for t in tracks}
added = 0
for t in manifest:
  if t["id"] in existing:
    continue
  category = t["category"][:1].upper() + t["category"][1:]
  tracks.append(
    {
      "id": t["id"],
      "title": t["title"],
      "category": category,
      "tags": t["tags"],
      "shelf": t["shelf"],
      "access": "free",
      "duration": int(t["duration"]),
      "durationLabel": t["durationLabel"],
      "artwork": f"originals/{t['id']}.jpg",
    }
  )
  added += 1
(root / "src" / "data" / "tracks.json").write_text(json.dumps(tracks, indent=2) + "\n", encoding="utf-8")
print(f"tracks={len(tracks)} added={added}")
