# Self-hosted typefaces

All faces are licensed under the SIL Open Font License 1.1 and served first-party (no request to any
font CDN at runtime).

| File                         | Face                | Role                                     |
| ---------------------------- | ------------------- | ---------------------------------------- |
| `fraunces-var-latin.woff2`   | Fraunces (variable) | Display headings and prayer numerals     |
| `inter-var-latin.woff2`      | Inter (variable)    | Body text and interface                  |
| `amiri-regular-arabic.woff2` | Amiri 400 (Arabic)  | Arabic prayer names, dates, hold screens |
| `amiri-bold-arabic.woff2`    | Amiri 700 (Arabic)  | Emphasised Arabic on the TV display      |
| `marcellus-latin.woff2`      | Marcellus           | Retained for the TV display only         |

Fraunces replaced Marcellus for the public site in the 2026 redesign: Marcellus ships a single 400
weight, so every heavier heading was browser-synthesised faux bold with descender collisions at
display sizes. Fraunces is a true variable face (wght 100–900, optical sizing), giving real weights
and safe line fitting. The TV display keeps Marcellus untouched.

They are wired through `next/font/local` in `src/app/layout.tsx`, which exposes
`--font-display-face`, `--font-body-face` and `--font-arabic-face`; `src/app/globals.css` folds
those into the `--font-display`, `--font-body` and `--font-arabic` tokens with system fallbacks.

Licence: <https://openfontlicense.org>. Original sources: Fraunces (Undercase Type), Marcellus
(Astigmatic), Inter (Rasmus Andersson), Amiri (Khaled Hosny), subset via Google Fonts.
