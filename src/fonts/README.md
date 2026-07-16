# Self-hosted typefaces

All faces are licensed under the SIL Open Font License 1.1 and served first-party (no request to any
font CDN at runtime). They restore the Association's approved heritage identity from the original
static site.

| File                         | Face               | Role                                    |
| ---------------------------- | ------------------ | --------------------------------------- |
| `marcellus-latin.woff2`      | Marcellus          | Display headings and prayer numerals    |
| `inter-var-latin.woff2`      | Inter (variable)   | Body text and interface                 |
| `amiri-regular-arabic.woff2` | Amiri 400 (Arabic) | Arabic prayer names, dates, hold screen |
| `amiri-bold-arabic.woff2`    | Amiri 700 (Arabic) | Emphasised Arabic on the TV display     |

They are wired through `next/font/local` in `src/app/layout.tsx`, which exposes
`--font-display-face`, `--font-body-face` and `--font-arabic-face`; `src/app/globals.css` folds
those into the `--font-display`, `--font-body` and `--font-arabic` tokens with system fallbacks.

Licence: <https://openfontlicense.org>. Original sources: Marcellus (Astigmatic), Inter (Rasmus
Andersson), Amiri (Khaled Hosny), subset via Google Fonts.
