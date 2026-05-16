"""Generate lightweight synthetic WAV sfx (mono 22050 Hz) for Monster Dice Battle."""
import math
import random
import struct
import wave
from pathlib import Path

SR = 22050


def clamp16(x):
    x = int(x)
    if x > 32767:
        return 32767
    if x < -32768:
        return -32768
    return x


def write_wav(path: Path, samples):
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        for s in samples:
            w.writeframes(struct.pack("<h", clamp16(s)))


def synth_attack_pitch(high=True):
    """Percussive digital square-tone zap with exponential pitch drop."""
    length = int(SR * 0.155)
    out = []
    f0 = 1650 if high else 940
    for i in range(length):
        t = i / SR
        freq = f0 * math.exp(-t * 11.0) + (150 if high else 110)
        phase = freq * t
        env = math.exp(-t * 16.5)
        s = math.copysign(1.0, math.sin(2 * math.pi * phase))
        out.append(32000 * 0.38 * env * s)
    return out


def synth_super_zap():
    """Wide digital blast with noisy ring."""
    length = int(SR * 0.28)
    out = []
    seed = random.Random(7)
    for i in range(length):
        t = i / SR
        base = math.sin(2 * math.pi * (380 * math.exp(-t * 4.8) + 90) * t)
        hiss = seed.uniform(-1, 1) * (0.42 * math.exp(-t * 22))
        env = math.exp(-t * 5.8)
        spike = math.exp(-((t - 0.038) ** 2) / 0.00009) * 1.05
        s = env * base * 0.9 + hiss + spike * math.sin(2 * math.pi * 980 * t) * 0.35
        out.append(32767 * 0.62 * max(-1.0, min(1.0, s)))
    return out


def synth_dice_roll():
    """Short multi-click digital dice chatter."""
    out = [0] * int(SR * 0.24)
    random.seed(21)
    for _ in range(7):
        start = random.uniform(0.0, 0.18)
        start_i = int(start * SR)
        fc = random.uniform(480, 1040)
        dur = int(0.026 * SR)
        for i in range(dur):
            idx = start_i + i
            if idx >= len(out):
                break
            t = i / SR
            trem = fc * (1 + 3.2 * math.sin(110 * t))
            env = math.exp(-t * 95)
            s = math.sin(2 * math.pi * trem * t)
            out[idx] += int(24000 * env * s * 0.55)
    return out


def synth_win_arpeggio(root_freq, bright=True):
    """Four-note upbeat digital-ish fanfare (square+sine blend)."""
    steps = [0, 4, 7, 12][:4]
    ratios = [(2 ** (s / 12.0)) for s in steps]
    note_hz = [root_freq * r for r in ratios]
    if bright:
        note_hz[-1] *= 1.02

    dur_note = int(0.105 * SR)
    gap = int(0.010 * SR)
    total_slots = len(note_hz) * (dur_note + gap) + int(0.04 * SR)
    out = [0] * total_slots
    pos = 0
    for hz in note_hz:
        for i in range(dur_note):
            if pos + i >= len(out):
                break
            t = i / SR
            envelope = math.sin(math.pi * (i / max(dur_note - 1, 1))) ** 2
            tone = math.sin(2 * math.pi * hz * t)
            gritty = math.copysign(1.0, tone) * 0.28
            mix = tone * (1 - 0.28) + gritty
            out[pos + i] += int(29000 * envelope * mix * 0.9)
        pos += dur_note + gap
    return out


OUT = Path(__file__).parent.parent / "assets" / "sounds"

write_wav(OUT / "dice.wav", synth_dice_roll())
write_wav(OUT / "attack_p1.wav", synth_attack_pitch(high=True))
write_wav(OUT / "attack_p2.wav", synth_attack_pitch(high=False))
write_wav(OUT / "super.wav", synth_super_zap())
write_wav(OUT / "win_p1.wav", synth_win_arpeggio(523.25, bright=True))
write_wav(OUT / "win_p2.wav", synth_win_arpeggio(415.30, bright=False))
