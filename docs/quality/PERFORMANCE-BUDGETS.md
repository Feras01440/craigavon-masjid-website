# Performance budgets

**Applies to:** Public website, prayer timetable and 1080p prayer display  
**Evidence status:** Budgets approved as engineering gates; measurements against the release
candidate are pending.

## Executed evidence

| Check                                              | Result  | Evidence                                                                                                 |
| -------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------- |
| Brand asset file-size inventory                    | Pass    | Six files total 142,982 bytes; largest file 76,564 bytes; runtime 256px WebP 5,134 bytes on 13 July 2026 |
| Production runtime and Core Web Vitals measurement | Pending | Requires the final production build with representative approved data                                    |

## User-experience budgets

Measure Core Web Vitals at the 75th percentile, separated by mobile and desktop, once representative
traffic exists.

| Metric                          | Good threshold | Release action                                                                                             |
| ------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------- |
| Largest Contentful Paint (LCP)  | ≤ 2.5 seconds  | Investigate any lab regression; do not accept field p75 above threshold without an owner and recovery plan |
| Interaction to Next Paint (INP) | ≤ 200 ms       | Block new interaction-heavy features when p75 exceeds threshold                                            |
| Cumulative Layout Shift (CLS)   | ≤ 0.10         | Block release for repeatable layout shifts caused by the application                                       |
| Time to First Byte (TTFB)       | ≤ 800 ms       | Review hosting region, dynamic queries and cache policy                                                    |

## Laboratory budgets

Run three cold Lighthouse measurements for each representative route on the production build and
record the median. Use mobile throttling for the primary gate.

| Budget                                |                   Public pages |                    Prayer page |                             TV display |
| ------------------------------------- | -----------------------------: | -----------------------------: | -------------------------------------: |
| Lighthouse performance                |                           ≥ 90 |                           ≥ 90 |                                   ≥ 90 |
| Lighthouse accessibility              | ≥ 95 and no A/AA axe violation | ≥ 95 and no A/AA axe violation | ≥ 95; display-specific review required |
| Initial compressed JavaScript         |                      ≤ 200 KiB |                      ≤ 225 KiB |                              ≤ 225 KiB |
| Initial compressed CSS                |                       ≤ 75 KiB |                       ≤ 90 KiB |                               ≤ 75 KiB |
| Initial transfer excluding user media |                      ≤ 500 KiB |                      ≤ 550 KiB |                              ≤ 500 KiB |
| Requests before load settles          |                           ≤ 35 |                           ≤ 40 |                                   ≤ 35 |
| Total layout shift in lab             |                         ≤ 0.10 |                         ≤ 0.10 |                                 ≤ 0.05 |

These limits are ceilings, not targets. A change that stays below a ceiling but causes a material
regression still requires review.

## Asset budgets

- Header/footer logo variants: no asset larger than 100 KiB; dimensions and aspect ratio must be
  explicit.
- Editorial images: no more than 250 KiB for a typical card image and 500 KiB for a full-width hero
  after responsive processing.
- Avoid loading an editorial image wider than twice its rendered CSS width.
- Fonts: WOFF2 only; subset where licensing permits; no more than 250 KiB total on initial public
  navigation.
- Third-party script budget: 0 KiB by default. Any exception needs privacy, security and performance
  approval.
- TV display must not download rotating background media or remote embeds.

## Reliability and server budgets

| Operation                              | Budget                                                                        |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| Public route server response, warm p95 | ≤ 500 ms before network transit                                               |
| Prayer API response, warm p95          | ≤ 500 ms                                                                      |
| TV display refresh payload             | ≤ 100 KiB compressed                                                          |
| TV polling interval                    | No more frequent than once per 60 seconds except an explicit operator refresh |
| Admin list query                       | Pagination required before a response can exceed 100 records                  |
| Image transformation                   | Bounded dimensions and size; no unbounded synchronous work in a request       |

## Measurement procedure

1. Build with the release environment and production settings.
2. Start the production server; do not use the development server for final figures.
3. Test `/`, `/prayer-times`, the heaviest approved content listing, one policy detail and `/tv`.
4. Run three cold mobile and three desktop Lighthouse passes per route.
5. Record median scores, transfer size, request count, LCP, CLS and blocking time.
6. Capture the Next.js route/build output and hosting function timings.
7. Repeat after enabling representative approved data and media.

## Evidence table

Populate this table at the release commit; do not infer results from a development build.

| Commit  | Route                  | Profile           | LCP | CLS |  JS | CSS | Transfer | Requests | Lighthouse | Result  |
| ------- | ---------------------- | ----------------- | --: | --: | --: | --: | -------: | -------: | ---------: | ------- |
| Pending | `/`                    | Mobile            |   — |   — |   — |   — |        — |        — |          — | Pending |
| Pending | `/prayer-times`        | Mobile            |   — |   — |   — |   — |        — |        — |          — | Pending |
| Pending | Representative content | Mobile            |   — |   — |   — |   — |        — |        — |          — | Pending |
| Pending | `/tv`                  | Desktop 1920×1080 |   — |   — |   — |   — |        — |        — |          — | Pending |

## Regression policy

- A budget failure blocks release unless the feature owner documents the cause, user impact,
  mitigation and a dated recovery issue.
- A new dependency must include its compressed transfer and execution cost in review notes.
- Performance evidence is rerun after large content, media, font, prayer-engine or hosting changes.
- Field data replaces assumptions once sufficient traffic exists; it does not excuse a reproducible
  lab regression.
