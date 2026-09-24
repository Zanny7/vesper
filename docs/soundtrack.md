# Vesper soundtrack assets

The encounter soundtrack manifest lives in `src/soundtrack.js`. It contains track metadata, asset paths, and pool membership; encounter progression data stays separate.

The paths below match the encounter playback manifest. The selected Pixabay sources were checked and downloaded through their normal free-download controls on 2026-09-24. Each source page showed the Pixabay Content License. The confirmation states that downloading accepts that license. Keep these files within their use in the game and do not distribute them as standalone audio downloads.

| Track ID | Vesper title | Original track | Creator | Pool | Expected file | Source and source notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ashen-vigil` | Ashen Vigil | Ambient Dark Game (Loop) | Siarhei_Korbut | Normal | `assets/music/ashen-vigil.mp3` | [Pixabay source](https://pixabay.com/music/ambient-ambient-dark-game-loop-534393/). Content ID Registered. |
| `veil-of-embers` | Veil of Embers | Electronic Fantasy | Playsound | Normal | `assets/music/veil-of-embers.mp3` | [Pixabay source](https://pixabay.com/music/synthwave-electronic-fantasy-140904/). |
| `hollow-constellation` | Hollow Constellation | Mystical | leberch | Normal | `assets/music/hollow-constellation.mp3` | [Pixabay source](https://pixabay.com/music/ambient-mystical-516605/). Content ID Registered. Pixabay's download attribution overlay credits Nikita Kondrashev. This is the selected track, replacing the earlier Ambient Video Game Music candidate. |
| `blood-in-the-quiet` | Blood in the Quiet | Eerie Dark Atmosphere for Video Games | ValentinaLópezz | Normal | `assets/music/blood-in-the-quiet.mp3` | [Pixabay source](https://pixabay.com/music/ambient-eerie-dark-atmosphere-for-video-games-294469/). |
| `the-last-lantern` | The Last Lantern | Ambient Fantasy | Surprising_Media | Normal | `assets/music/the-last-lantern.mp3` | [Pixabay source](https://pixabay.com/music/electronic-ambient-fantasy-314682/). AI generated. |
| `beneath-the-vesper` | Beneath the Vesper | Bossroom Battle | BackgroundMusicMaster | Chapter boss | `assets/music/beneath-the-vesper.mp3` | [Pixabay source](https://pixabay.com/music/main-title-bossroom-battle-431358/). AI generated. |

License/source: [Pixabay Content License](https://pixabay.com/service/license-summary/). The license summary allows free use and adaptation subject to its prohibited-use terms; it prohibits distributing content on a standalone basis. Keep these files within their use in the game and retain this provenance. Source page availability, labels, and license indication were checked 2026-09-24.

The five normal tracks are eligible for every normal encounter. The selector avoids using the immediately previous track when another normal track is available. Chapter bosses use the boss pool, which initially contains Beneath the Vesper. Add or replace tracks by updating the manifest and placing the matching licensed file at its declared path. Missing files are allowed and do not prevent an encounter from starting.
