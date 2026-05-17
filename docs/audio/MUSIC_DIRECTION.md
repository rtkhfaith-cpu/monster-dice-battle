# Audio & Music Direction

## Global identity

**NOT:** generic fantasy orchestra, retro MIDI-only nostalgia

**YES:** modern arcade, hyperpop fragments, sound-design comedy, emotional synth ballads

| Layer | Direction |
|-------|-----------|
| Handler UI | Clean mobile UI clicks + subtle glitch |
| Battle baseline | Punchy drums, playful bass, reactive stingers |
| Boss fights | Genre shift on phase 2; “production drop” moment |
| Win/Lose | Voice lines after result screen (not WAV-length gated) |

## SFX families

| Family | Signature sounds |
|--------|------------------|
| Fast Food | Sizzle, squish, register cha-ching |
| Tech | Clicks, buzz, startup chime |
| Meme / Internet | Stingers, bass boost, buffer tone |
| Bacteria | Wet pops, squish, microscope zoom |
| Emotion | Reverb cries, party popper heals |
| Noise / Static | Compression, white noise swells |

## Region music matrix

| # | Region | Genre | Battle vibe | Boss vibe |
|---|--------|-------|-------------|-----------|
| 01 | Glitch Alley | Lo-fi glitch | Sneaky, clicky | Paperwork dubstep |
| 02 | Sewer Depths | Bubble techno | Slippery groove | Flush opera brass |
| 03 | Fast Food Kingdom | Kitchen trap | Aggressive fun | Jingle death-metal parody |
| 04 | Haunted Mall | Vapor mall pop | Nostalgic swing | Collapsing choir |
| 05 | Tech Apocalypse | Industrial glitch | Sparks, panic | Drone slam |
| 06 | Broken Internet | Hyperpop buffer | Chaotic speed | Time-stretch scream |
| 07 | Frozen Dessert Factory | Music-box trap | Cold cute | Waltz breakdown |
| 08 | Influencer Grove | Tropical toxic pop | Stylish menace | K-pop villain key change |
| 09 | Streaming City | Ambient chat | Lonely tension | Silence drop |
| 10 | Space Toilet Station | Space disco | Silly epic | Cosmic dub flush |
| 11 | Bacteria Hive Metro | Microbial techno | Wet pulse | Medical horror beep |
| 12 | Meme Cathedral | Bass-boost sacred | Irony chaos | Organ + stinger |
| 13 | Lag Dimension | Desync EDM | Anxiety groove | Triple time signature |
| 14 | Doomscroll Monastery | Dark ambient | Slow dread | Crescendo that never resolves |
| 15 | Burnout Industrial | Office grunge | Tired anger | Quarterly siren dubstep |
| 16 | App Graveyard | Broken chiptune | Sad cute | Freeze tone |
| 17 | Glitch Spirit Forest | Folktronica | Pretty wrong | Polygon roar |
| 18 | Viral Swarm City | Drill news | Panic hype | Heartbeat drill |
| 19 | Algorithm Temple | Corporate ambient | Clean evil | Upsell choir |
| 20 | Rage Arena | Metal/trap | Loud petty | Dual-voice metal |
| 21 | Subscription Vault | Billing pop | Trap luxury | Cash-register gospel |
| 22 | Emotion Dumpster | Ballad glitch | Mood swings | Four-key emotional phases |
| 23 | Noise Border | Harsh noise + motif | War quiet | Silence weapon |
| 24 | Whispering Servers | Synth cathedral | Cold power | Fan crescendo |
| 25 | Core Feed | Maximalist all genres | Overwhelm | Everything → void |

## Boss audio rules

1. Intro sting: 2–4 seconds, region-specific joke → dread
2. Phase 2: add percussion layer or remove melody (emotional unease)
3. Defeat: comedic fall + 1 sincere note (undertale-adjacent sincerity)

## Implementation notes (game)

- BGM: `/audio/bgm/Main1.mp3`, `Main 2.mp3` (menu); `Main_Battle_1.mp3`, `Main_Battle_2.mp3` (battle)
- Region themes: future stems per floor group (Acts I–IV)
- Keep SFX **shorter than animation** — timing driven by `battleActionTiming.js`
