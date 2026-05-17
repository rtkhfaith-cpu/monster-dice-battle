# Game audio (web)

Served from the site root (`public/` → `/audio/…`).

## Menu music (`bgm/`)

| File | URL |
|------|-----|
| `Main1.mp3` | `/audio/bgm/Main1.mp3` |
| `Main 2.mp3` | `/audio/bgm/Main%202.mp3` |

Plays on **home, online lobby, game over, and audio settings**. Tracks alternate when each ends. Stops during battle; resumes when you return to the menu.

## Battle music (`bgm/`)

| File | URL |
|------|-----|
| `Main_battle_1.mp3` | `/audio/bgm/Main_battle_1.mp3` |
| `Main_battle_2.mp3` | `/audio/bgm/Main_battle_2.mp3` |

Plays only **during battle** (rotates).

## Sound effects (`sfx/`)

| File | Used for |
|------|----------|
| `Button.wav` | Main menu button presses |
| `Attack.wav` | Battle attacks |
| `Critical_Hit.wav` | Critical / super hits |
| `Dodge.wav` | Dodged attacks |
| `Level_Up.wav` | Level-up after a match |
| `Shop.wav` | Shop & marts |
| `You_Win.wav` | Victory |
| `You_Lose.wav` | Defeat |
