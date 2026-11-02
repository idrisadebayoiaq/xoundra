#!/usr/bin/env python3
"""Upload generated originals to Supabase storage using the anon key (temp RLS window)."""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "catalog" / "originals-manifest.json"


def load_env() -> dict[str, str]:
  env = {}
  path = ROOT / ".env"
  for line in path.read_text(encoding="utf-8").splitlines():
    if not line or line.startswith("#") or "=" not in line:
      continue
    key, value = line.split("=", 1)
    env[key.strip()] = value.strip().strip('"').strip("'")
  return env


def upload(url: str, key: str, bucket: str, object_path: str, file_path: Path, content_type: str) -> None:
  endpoint = f"{url}/storage/v1/object/{bucket}/{object_path}"
  data = file_path.read_bytes()
  req = urllib.request.Request(
    endpoint,
    data=data,
    method="POST",
    headers={
      "Authorization": f"Bearer {key}",
      "apikey": key,
      "Content-Type": content_type,
      "x-upsert": "true",
    },
  )
  try:
    with urllib.request.urlopen(req) as resp:
      resp.read()
  except urllib.error.HTTPError as err:
    body = err.read().decode("utf-8", errors="replace")
    # retry as PUT for upsert on some setups
    if err.code in (400, 409):
      req = urllib.request.Request(
        endpoint,
        data=data,
        method="PUT",
        headers={
          "Authorization": f"Bearer {key}",
          "apikey": key,
          "Content-Type": content_type,
          "x-upsert": "true",
        },
      )
      with urllib.request.urlopen(req) as resp:
        resp.read()
      return
    raise RuntimeError(f"{object_path}: {err.code} {body}") from err


def main() -> int:
  env = load_env()
  url = env.get("EXPO_PUBLIC_SUPABASE_URL") or env.get("NEXT_PUBLIC_SUPABASE_URL")
  key = env.get("EXPO_PUBLIC_SUPABASE_ANON_KEY") or env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  if not url or not key:
    print("missing supabase url/anon key", file=sys.stderr)
    return 1
  tracks = json.loads(MANIFEST.read_text(encoding="utf-8"))["tracks"]
  for track in tracks:
    audio = ROOT / track["audio_file"]
    art = ROOT / track["artwork_file"]
    upload(url, key, "track-audio", f"catalogue/{track['id']}.mp3", audio, "audio/mpeg")
    upload(url, key, "artwork", f"originals/{track['id']}.jpg", art, "image/jpeg")
    print("uploaded", track["id"])
  print(f"done {len(tracks)}")
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
