# Game audio (web)

Files in `public/audio/` are served at `/audio/…` (public-relative paths only).

## Menu music (`bgm/`)

| File | URL |
|------|-----|
| `Main1.mp3` | `/audio/bgm/Main1.mp3` |
| `Main 2.mp3` | `/audio/bgm/Main%202.mp3` |

Random pick on app start, **loops** on home / lobby / game over. Fades out when battle starts; resumes when battle ends.

## Battle music (`bgm/`)

| File | URL |
|------|-----|
| `Main_Battle_1.mp3` | `/audio/bgm/Main_Battle_1.mp3` |
| `Main_Battle_2.mp3` | `/audio/bgm/Main_Battle_2.mp3` |

Random pick when battle starts, **loops** during battle only.

## Sound effects (`sfx/`)

| File | URL | Used for |
|------|-----|----------|
| `Button.wav` | `/audio/sfx/Button.wav` | Buttons, menu navigation |
| `Attack.wav` | `/audio/sfx/Attack.wav` | Attacks, magic launch, impacts |
| `Critical_Hit.wav` | `/audio/sfx/Critical_Hit.wav` | Critical hits (with Attack) |
| `Dodge.wav` | `/audio/sfx/Dodge.wav` | Successful dodge |
| `Level_Up.wav` | `/audio/sfx/Level_Up.wav` | Level up |
| `Shop.wav` | `/audio/sfx/Shop.wav` | Purchases |
| `You_Win.wav` | `/audio/sfx/You_Win.wav` | Victory |
| `You_Lose.wav` | `/audio/sfx/You_Lose.wav` | Defeat |

Settings (`muted`, `bgmVolume`, `sfxVolume`) persist in `localStorage` key `mdb_audio_settings`.
