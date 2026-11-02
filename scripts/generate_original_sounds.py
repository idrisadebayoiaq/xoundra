#!/usr/bin/env python3
"""Generate 31 copyright-free Xoundra originals (procedural audio + unique covers)."""
from __future__ import annotations

import json
import math
import struct
import subprocess
import wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT_AUDIO = ROOT / "catalog" / "audio" / "originals"
OUT_ART = ROOT / "catalog" / "artwork" / "originals"
MANIFEST = ROOT / "catalog" / "originals-manifest.json"
SR = 44100
DURATION = 150  # seconds — loop-friendly beds

TRACKS = [
  # 10 Meditation
  {"id": "soft-temple-bell", "title": "Soft Temple Bell", "category": "meditation", "tags": ["meditation", "bell", "calm"], "shelf": "home", "kind": "bells", "palette": (34, 58, 94)},
  {"id": "bronze-bowl-wave", "title": "Bronze Bowl Wave", "category": "meditation", "tags": ["meditation", "bowl", "focus"], "shelf": "home", "kind": "bowl", "palette": (92, 64, 40)},
  {"id": "quiet-chime-path", "title": "Quiet Chime Path", "category": "meditation", "tags": ["meditation", "chime", "calm"], "shelf": "home", "kind": "chimes", "palette": (56, 90, 78)},
  {"id": "still-breath-tone", "title": "Still Breath Tone", "category": "meditation", "tags": ["meditation", "drone", "breath"], "shelf": "home", "kind": "drone", "palette": (48, 72, 88)},
  {"id": "morning-gong-soft", "title": "Morning Gong Soft", "category": "meditation", "tags": ["meditation", "gong", "morning"], "shelf": "explore", "kind": "gong", "palette": (120, 86, 46)},
  {"id": "sandalwood-drift", "title": "Sandalwood Drift", "category": "meditation", "tags": ["meditation", "warm", "calm"], "shelf": "home", "kind": "warm_drone", "palette": (110, 78, 58)},
  {"id": "deep-root-hum", "title": "Deep Root Hum", "category": "meditation", "tags": ["meditation", "low", "ground"], "shelf": "home", "kind": "low_hum", "palette": (28, 44, 36)},
  {"id": "lotus-pond-ripple", "title": "Lotus Pond Ripple", "category": "meditation", "tags": ["meditation", "water", "soft"], "shelf": "explore", "kind": "water_soft", "palette": (46, 98, 110)},
  {"id": "empty-room-bell", "title": "Empty Room Bell", "category": "meditation", "tags": ["meditation", "bell", "space"], "shelf": "home", "kind": "sparse_bell", "palette": (70, 70, 86)},
  {"id": "warm-overtones", "title": "Warm Overtones", "category": "meditation", "tags": ["meditation", "harmonic", "calm"], "shelf": "home", "kind": "overtones", "palette": (140, 96, 72)},
  # 10 Focus
  {"id": "steady-study-pulse", "title": "Steady Study Pulse", "category": "focus", "tags": ["focus", "study", "pulse"], "shelf": "home", "kind": "pulse", "palette": (40, 70, 120)},
  {"id": "soft-pink-desk", "title": "Soft Pink Desk", "category": "focus", "tags": ["focus", "pinknoise", "study"], "shelf": "home", "kind": "pink", "palette": (160, 110, 120)},
  {"id": "clear-page-flow", "title": "Clear Page Flow", "category": "focus", "tags": ["focus", "reading", "clear"], "shelf": "home", "kind": "bright_pad", "palette": (90, 130, 150)},
  {"id": "low-library-air", "title": "Low Library Air", "category": "focus", "tags": ["focus", "library", "quiet"], "shelf": "home", "kind": "roomtone", "palette": (70, 78, 68)},
  {"id": "quiet-desk-loop", "title": "Quiet Desk Loop", "category": "focus", "tags": ["focus", "desk", "loop"], "shelf": "home", "kind": "brown", "palette": (88, 84, 76)},
  {"id": "paper-soft-noise", "title": "Paper Soft Noise", "category": "focus", "tags": ["focus", "noise", "reading"], "shelf": "explore", "kind": "paper", "palette": (180, 170, 150)},
  {"id": "deep-focus-bed", "title": "Deep Focus Bed", "category": "focus", "tags": ["focus", "deep", "work"], "shelf": "home", "kind": "deep_pad", "palette": (30, 40, 70)},
  {"id": "quiet-corridor-hum", "title": "Quiet Corridor Hum", "category": "focus", "tags": ["focus", "hum", "study"], "shelf": "explore", "kind": "corridor", "palette": (60, 66, 80)},
  {"id": "soft-pencil-rain", "title": "Soft Pencil Rain", "category": "focus", "tags": ["focus", "soft", "reading"], "shelf": "home", "kind": "light_clicks", "palette": (130, 140, 128)},
  {"id": "amber-lamp-tone", "title": "Amber Lamp Tone", "category": "focus", "tags": ["focus", "warm", "night"], "shelf": "home", "kind": "amber", "palette": (170, 110, 50)},
  # 5 Children
  {"id": "cloud-pillow-song", "title": "Cloud Pillow Song", "category": "children", "tags": ["children", "soft", "calm"], "shelf": "home", "kind": "kids_pad", "palette": (150, 190, 220)},
  {"id": "tiny-rain-garden", "title": "Tiny Rain Garden", "category": "children", "tags": ["children", "rain", "gentle"], "shelf": "home", "kind": "tiny_rain", "palette": (120, 170, 150)},
  {"id": "friendly-forest-walk", "title": "Friendly Forest Walk", "category": "children", "tags": ["children", "forest", "walk"], "shelf": "home", "kind": "kids_birds", "palette": (90, 150, 90)},
  {"id": "gentle-star-night", "title": "Gentle Star Night", "category": "children", "tags": ["children", "night", "sleep"], "shelf": "home", "kind": "kids_stars", "palette": (40, 50, 110)},
  {"id": "soft-toybox-chimes", "title": "Soft Toybox Chimes", "category": "children", "tags": ["children", "chime", "play"], "shelf": "explore", "kind": "toy_chimes", "palette": (220, 160, 100)},
  # 6 mixed
  {"id": "velvet-night-rest", "title": "Velvet Night Rest", "category": "sleep", "tags": ["sleep", "night", "rest"], "shelf": "home", "kind": "sleep_bed", "palette": (24, 28, 48)},
  {"id": "slow-heart-drift", "title": "Slow Heart Drift", "category": "sleep", "tags": ["sleep", "slow", "calm"], "shelf": "home", "kind": "slow_pulse", "palette": (50, 36, 56)},
  {"id": "soft-porch-rain", "title": "Soft Porch Rain", "category": "rain", "tags": ["rain", "porch", "sleep"], "shelf": "home", "kind": "rain", "palette": (70, 90, 110)},
  {"id": "quiet-shore-foam", "title": "Quiet Shore Foam", "category": "ocean", "tags": ["ocean", "shore", "calm"], "shelf": "home", "kind": "ocean", "palette": (40, 90, 130)},
  {"id": "moss-path-wind", "title": "Moss Path Wind", "category": "forest", "tags": ["forest", "wind", "nature"], "shelf": "home", "kind": "forest", "palette": (50, 90, 55)},
  {"id": "warm-room-glow", "title": "Warm Room Glow", "category": "ambient", "tags": ["ambient", "warm", "room"], "shelf": "home", "kind": "glow", "palette": (160, 120, 80)},
]


def fade(n: int, ms: float = 80) -> np.ndarray:
  edge = max(1, int(SR * ms / 1000))
  env = np.ones(n, dtype=np.float64)
  env[:edge] *= np.linspace(0, 1, edge)
  env[-edge:] *= np.linspace(1, 0, edge)
  return env


def pink_noise(n: int, seed: int) -> np.ndarray:
  rng = np.random.default_rng(seed)
  white = rng.standard_normal(n)
  # Voss-McCartney-ish via FFT 1/f
  spectrum = np.fft.rfft(white)
  freqs = np.fft.rfftfreq(n, 1 / SR)
  spectrum /= np.maximum(freqs, 1.0) ** 0.5
  out = np.fft.irfft(spectrum, n)
  return out / (np.max(np.abs(out)) + 1e-9)


def brown_noise(n: int, seed: int) -> np.ndarray:
  rng = np.random.default_rng(seed)
  white = rng.standard_normal(n)
  brown = np.cumsum(white)
  brown -= brown.mean()
  return brown / (np.max(np.abs(brown)) + 1e-9)


def sine(freq: float, n: int, phase: float = 0.0) -> np.ndarray:
  t = np.arange(n) / SR
  return np.sin(2 * math.pi * freq * t + phase)


def bell_hits(n: int, seed: int, base: float = 440.0, gap: float = 6.5) -> np.ndarray:
  rng = np.random.default_rng(seed)
  out = np.zeros(n)
  t = 0.0
  while int(t * SR) < n - SR:
    i = int(t * SR)
    length = min(int(4.5 * SR), n - i)
    f = base * (2 ** (rng.integers(0, 5) / 12))
    env = np.exp(-np.linspace(0, 5.5, length))
    tone = (
      0.55 * sine(f, length)
      + 0.25 * sine(f * 2.01, length)
      + 0.12 * sine(f * 3.02, length)
      + 0.08 * sine(f * 4.2, length)
    ) * env
    out[i : i + length] += tone
    t += gap + float(rng.random()) * 2.2
  return out / (np.max(np.abs(out)) + 1e-9)


def make_audio(kind: str, seed: int) -> np.ndarray:
  n = SR * DURATION
  rng = np.random.default_rng(seed)
  if kind == "bells":
    out = 0.7 * bell_hits(n, seed, 392.0, 7.0) + 0.15 * brown_noise(n, seed)
  elif kind == "bowl":
    out = 0.65 * bell_hits(n, seed, 220.0, 9.0) + 0.2 * sine(110, n) * 0.15 + 0.1 * pink_noise(n, seed)
  elif kind == "chimes":
    out = 0.75 * bell_hits(n, seed, 523.25, 5.0) + 0.08 * pink_noise(n, seed)
  elif kind == "drone":
    out = 0.35 * sine(65.4, n) + 0.25 * sine(98.0, n) + 0.15 * sine(130.8, n) + 0.12 * pink_noise(n, seed)
  elif kind == "gong":
    out = 0.8 * bell_hits(n, seed, 98.0, 11.0) + 0.12 * brown_noise(n, seed)
  elif kind == "warm_drone":
    out = 0.3 * sine(82.4, n) + 0.25 * sine(123.5, n, 0.4) + 0.18 * sine(164.8, n) + 0.15 * pink_noise(n, seed)
  elif kind == "low_hum":
    out = 0.45 * sine(55, n) + 0.25 * sine(82.5, n) + 0.2 * brown_noise(n, seed)
  elif kind == "water_soft":
    out = 0.55 * pink_noise(n, seed)
    out = np.convolve(out, np.ones(80) / 80, mode="same")
    out += 0.08 * sine(180, n) * (0.5 + 0.5 * sine(0.05, n))
  elif kind == "sparse_bell":
    out = 0.85 * bell_hits(n, seed, 349.23, 12.0)
  elif kind == "overtones":
    out = sum((0.22 / (i + 1)) * sine(110 * (i + 1), n, i * 0.3) for i in range(6))
    out += 0.1 * pink_noise(n, seed)
  elif kind == "pulse":
    pulse = (sine(0.2, n) > 0).astype(float)
    out = (0.25 * sine(220, n) + 0.2 * sine(330, n)) * (0.35 + 0.65 * pulse) + 0.2 * pink_noise(n, seed)
  elif kind == "pink":
    out = pink_noise(n, seed)
  elif kind == "bright_pad":
    out = 0.28 * sine(196, n) + 0.22 * sine(247, n) + 0.18 * sine(294, n) + 0.2 * pink_noise(n, seed)
  elif kind == "roomtone":
    out = 0.7 * brown_noise(n, seed) + 0.15 * pink_noise(n, seed + 1)
  elif kind == "brown":
    out = brown_noise(n, seed)
  elif kind == "paper":
    out = pink_noise(n, seed)
    out = np.convolve(out, np.ones(12) / 12, mode="same")
  elif kind == "deep_pad":
    out = 0.4 * sine(49, n) + 0.28 * sine(73.5, n) + 0.18 * sine(98, n) + 0.12 * brown_noise(n, seed)
  elif kind == "corridor":
    out = 0.35 * sine(120, n) + 0.45 * brown_noise(n, seed)
  elif kind == "light_clicks":
    out = 0.35 * pink_noise(n, seed)
    clicks = np.zeros(n)
    for i in rng.integers(0, n - 200, size=180):
      clicks[i : i + 40] += rng.uniform(-0.4, 0.4) * np.linspace(1, 0, 40)
    out += 0.15 * clicks
  elif kind == "amber":
    out = 0.3 * sine(146.8, n) + 0.25 * sine(220.0, n) + 0.2 * sine(293.7, n) + 0.15 * pink_noise(n, seed)
  elif kind == "kids_pad":
    out = 0.25 * sine(261.6, n) + 0.2 * sine(329.6, n) + 0.18 * sine(392.0, n) + 0.12 * pink_noise(n, seed)
  elif kind == "tiny_rain":
    out = pink_noise(n, seed)
    out = np.convolve(out, np.ones(20) / 20, mode="same") * 0.7
  elif kind == "kids_birds":
    out = 0.25 * pink_noise(n, seed)
    for i in rng.integers(SR, n - SR, size=40):
      length = int(0.18 * SR)
      f = float(rng.uniform(1200, 2400))
      env = np.exp(-np.linspace(0, 6, length))
      out[i : i + length] += 0.2 * sine(f, length) * env
  elif kind == "kids_stars":
    out = 0.2 * sine(174, n) + 0.15 * sine(220, n) + 0.25 * pink_noise(n, seed) * 0.4
    out += 0.35 * bell_hits(n, seed, 659.25, 8.0) * 0.45
  elif kind == "toy_chimes":
    out = 0.8 * bell_hits(n, seed, 587.33, 4.0)
  elif kind == "sleep_bed":
    out = 0.4 * brown_noise(n, seed) + 0.25 * sine(55, n) + 0.15 * sine(82, n)
  elif kind == "slow_pulse":
    breath = 0.5 + 0.5 * sine(0.08, n)
    out = (0.3 * sine(65, n) + 0.25 * sine(98, n) + 0.2 * brown_noise(n, seed)) * breath
  elif kind == "rain":
    out = pink_noise(n, seed)
    out = np.convolve(out, np.ones(8) / 8, mode="same")
  elif kind == "ocean":
    surf = brown_noise(n, seed)
    surf = np.convolve(surf, np.ones(200) / 200, mode="same")
    out = 0.7 * surf + 0.2 * pink_noise(n, seed + 3) * (0.4 + 0.6 * (0.5 + 0.5 * sine(0.07, n)))
  elif kind == "forest":
    out = 0.45 * pink_noise(n, seed) + 0.25 * brown_noise(n, seed)
    for i in rng.integers(0, n - SR // 2, size=25):
      length = int(0.25 * SR)
      f = float(rng.uniform(800, 1800))
      out[i : i + length] += 0.12 * sine(f, length) * np.exp(-np.linspace(0, 5, length))
  elif kind == "glow":
    out = 0.28 * sine(130.8, n) + 0.22 * sine(196.0, n) + 0.18 * sine(261.6, n) + 0.18 * pink_noise(n, seed)
  else:
    out = pink_noise(n, seed)

  out = np.asarray(out, dtype=np.float64)
  out *= fade(len(out), 120)
  peak = np.max(np.abs(out)) + 1e-9
  out = 0.85 * out / peak
  return out.astype(np.float32)


def write_wav(path: Path, audio: np.ndarray) -> None:
  pcm = np.clip(audio * 32767, -32768, 32767).astype(np.int16)
  with wave.open(str(path), "wb") as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(SR)
    wf.writeframes(pcm.tobytes())


def to_mp3(wav: Path, mp3: Path) -> None:
  subprocess.run(
    ["ffmpeg", "-y", "-i", str(wav), "-codec:a", "libmp3lame", "-qscale:a", "4", str(mp3)],
    check=True,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
  )


def make_cover(path: Path, title: str, rgb: tuple[int, int, int], seed: int) -> None:
  rng = np.random.default_rng(seed)
  w = h = 1024
  img = Image.new("RGB", (w, h), rgb)
  draw = ImageDraw.Draw(img, "RGBA")
  r, g, b = rgb
  for _ in range(18):
    x0, y0 = int(rng.integers(0, w)), int(rng.integers(0, h))
    x1, y1 = x0 + int(rng.integers(80, 420)), y0 + int(rng.integers(80, 420))
    color = (
      int(np.clip(r + rng.integers(-40, 50), 0, 255)),
      int(np.clip(g + rng.integers(-40, 50), 0, 255)),
      int(np.clip(b + rng.integers(-40, 50), 0, 255)),
      int(rng.integers(40, 110)),
    )
    draw.ellipse([x0, y0, x1, y1], fill=color)
  for _ in range(8):
    pts = [(int(rng.integers(0, w)), int(rng.integers(0, h))) for _ in range(4)]
    color = (255, 255, 255, int(rng.integers(20, 70)))
    draw.line(pts, fill=color, width=int(rng.integers(2, 8)))
  img = img.filter(ImageFilter.GaussianBlur(radius=float(rng.uniform(0.6, 2.4))))
  # unique corner mark from title hash
  mark = abs(hash(title)) % 200
  draw = ImageDraw.Draw(img)
  draw.rectangle([40, 40, 120 + mark // 2, 56], fill=(255, 255, 255))
  draw.rectangle([w - 160, h - 70, w - 40, h - 40], fill=(0, 0, 0))
  img.save(path, "JPEG", quality=88)


def main() -> None:
  OUT_AUDIO.mkdir(parents=True, exist_ok=True)
  OUT_ART.mkdir(parents=True, exist_ok=True)
  rows = []
  for i, track in enumerate(TRACKS):
    seed = 1000 + i * 97
    audio = make_audio(track["kind"], seed)
    wav = OUT_AUDIO / f"{track['id']}.wav"
    mp3 = OUT_AUDIO / f"{track['id']}.mp3"
    art = OUT_ART / f"{track['id']}.jpg"
    write_wav(wav, audio)
    to_mp3(wav, mp3)
    wav.unlink(missing_ok=True)
    make_cover(art, track["title"], track["palette"], seed)
    duration = float(DURATION)
    mins = int(duration // 60)
    secs = int(duration % 60)
    rows.append(
      {
        **{k: track[k] for k in ("id", "title", "category", "tags", "shelf")},
        "access": "free",
        "duration": duration,
        "durationLabel": f"{mins}:{secs:02d}",
        "artwork": track["id"],
        "audio": f"catalogue/{track['id']}.mp3",
        "artwork_file": str(art.relative_to(ROOT)).replace("\\", "/"),
        "audio_file": str(mp3.relative_to(ROOT)).replace("\\", "/"),
        "loop_ok": True,
      }
    )
    print(f"ok {track['id']}")
  MANIFEST.write_text(json.dumps({"tracks": rows, "rights": "Xoundra procedural originals — no third-party samples."}, indent=2), encoding="utf-8")
  print(f"wrote {len(rows)} tracks -> {MANIFEST}")


if __name__ == "__main__":
  main()
