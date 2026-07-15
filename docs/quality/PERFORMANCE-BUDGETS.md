# Performance budgets and release-candidate evidence

**Applies to:** Public website, prayer timetable and prayer display

**Evidence date:** 14 July 2026

**Status:** The measured application performance budgets pass on an external HTTPS production-build
preview. A permanent hosting-provider preview with representative approved Supabase data remains a
credential-dependent launch gate.

## Executed evidence

Lighthouse 13.4.0 ran against an ephemeral Cloudflare HTTPS tunnel serving the production
`next start` build. This was an externally reachable preview, not `localhost` and not the
development server. Five representative routes were measured three times with a cold mobile profile
and three times with a cold desktop profile: 30 runs in total.

| Check                                    | Result                                            | Evidence                                                                                                                                                                        |
| ---------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registry/build asset review              | Pass                                              | Six brand files total 142,982 bytes; the runtime 256 px WebP is 5,134 bytes                                                                                                     |
| External production-preview reachability | Pass                                              | HTTPS response, production build and transport security headers were verified through the tunnel                                                                                |
| Three-run medians by route/profile       | Pass                                              | Public routes scored 99-100 Performance, 100 Accessibility and 100 Best Practices; every recorded LCP was below 2.5 seconds                                                     |
| Transfer and request ceilings            | Pass                                              | All measured medians remained below the JavaScript, CSS, transfer and request-count ceilings                                                                                    |
| TV display                               | Performance budgets pass; staging retest required | 99 mobile/100 desktop Performance and 100 Accessibility; Best Practices was 92 because `/api/display` correctly returned 503 in the intentionally unconfigured Supabase preview |

The tunnel was temporary and contained no approved content or production credentials. It proves the
release build can meet the lab budgets over external HTTPS; it does not establish permanent-host
latency, representative-data behavior or field Core Web Vitals.

## Measured medians

Sizes are Lighthouse transfer bytes and are shown in KiB. Each row is the median of three cold runs.

| Route               | Profile | Performance | Accessibility | Best Practices |    LCP | CLS |    TBT |        JS |     CSS |  Transfer | Requests | Result                                 |
| ------------------- | ------- | ----------: | ------------: | -------------: | -----: | --: | -----: | --------: | ------: | --------: | -------: | -------------------------------------- |
| `/`                 | Mobile  |         100 |           100 |            100 | 1.72 s |   0 |  20 ms | 147.6 KiB | 4.8 KiB | 187.3 KiB |       22 | Pass                                   |
| `/`                 | Desktop |         100 |           100 |            100 | 0.43 s |   0 |   0 ms | 147.4 KiB | 4.9 KiB | 187.2 KiB |       22 | Pass                                   |
| `/prayer-times`     | Mobile  |          99 |           100 |            100 | 2.00 s |   0 |  21 ms | 213.8 KiB | 6.2 KiB | 250.2 KiB |       21 | Pass                                   |
| `/prayer-times`     | Desktop |         100 |           100 |            100 | 0.46 s |   0 |   0 ms | 213.5 KiB | 6.2 KiB | 249.9 KiB |       21 | Pass                                   |
| `/news`             | Mobile  |         100 |           100 |            100 | 1.70 s |   0 |  35 ms | 147.7 KiB | 4.8 KiB | 181.7 KiB |       17 | Pass                                   |
| `/news`             | Desktop |         100 |           100 |            100 | 0.43 s |   0 |   0 ms | 147.7 KiB | 4.9 KiB | 181.7 KiB |       17 | Pass                                   |
| `/policies/privacy` | Mobile  |         100 |           100 |            100 | 1.72 s |   0 |  18 ms | 147.6 KiB | 4.8 KiB | 182.4 KiB |       19 | Pass                                   |
| `/policies/privacy` | Desktop |         100 |           100 |            100 | 0.43 s |   0 |   0 ms | 147.4 KiB | 4.9 KiB | 182.2 KiB |       19 | Pass                                   |
| `/tv`               | Mobile  |          99 |           100 |             92 | 1.87 s |   0 | 101 ms | 218.1 KiB | 6.8 KiB | 256.2 KiB |       20 | Pass with noted environment limitation |
| `/tv`               | Desktop |         100 |           100 |             92 | 0.50 s |   0 |   0 ms | 217.6 KiB | 6.8 KiB | 255.8 KiB |       20 | Pass with noted environment limitation |

The preview intentionally omitted Supabase variables so public data failed closed. That expected
`/api/display` 503 lowered only the TV Best Practices score. It must be rerun on credentialed
staging with an approved display payload; the 92 is recorded, not waived or rewritten as 100.

The SEO score was 63 because indexing and organisation identity remain deliberately disabled until
the production domain and committee-approved identity are available. SEO is outside the performance
budget, and enabling indexing merely to improve a lab score would violate the release controls.

## User-experience budgets

Measure field Core Web Vitals at the 75th percentile, separated by mobile and desktop, once enough
representative production traffic exists.

| Metric                          | Good threshold | Release action                                                                                             |
| ------------------------------- | -------------: | ---------------------------------------------------------------------------------------------------------- |
| Largest Contentful Paint (LCP)  | <= 2.5 seconds | Investigate any lab regression; do not accept field p75 above threshold without an owner and recovery plan |
| Interaction to Next Paint (INP) |      <= 200 ms | Block new interaction-heavy features when p75 exceeds threshold                                            |
| Cumulative Layout Shift (CLS)   |        <= 0.10 | Block release for repeatable layout shifts caused by the application                                       |
| Time to First Byte (TTFB)       |      <= 800 ms | Review hosting region, dynamic queries and cache policy                                                    |

INP is a field metric and was not inferred from Lighthouse Total Blocking Time. Production field
data remains unavailable before launch.

## Laboratory budgets

| Budget                                |                    Public pages |                     Prayer page |                              TV display |
| ------------------------------------- | ------------------------------: | ------------------------------: | --------------------------------------: |
| Lighthouse performance                |                           >= 90 |                           >= 90 |                                   >= 90 |
| Lighthouse accessibility              | >= 95 and no A/AA axe violation | >= 95 and no A/AA axe violation | >= 95; display-specific review required |
| Initial compressed JavaScript         |                      <= 200 KiB |                      <= 225 KiB |                              <= 225 KiB |
| Initial compressed CSS                |                       <= 75 KiB |                       <= 90 KiB |                               <= 75 KiB |
| Initial transfer excluding user media |                      <= 500 KiB |                      <= 550 KiB |                              <= 500 KiB |
| Requests before load settles          |                           <= 35 |                           <= 40 |                                   <= 35 |
| Total layout shift in lab             |                         <= 0.10 |                         <= 0.10 |                                 <= 0.05 |

These limits are ceilings, not targets. A material regression still requires review even when it
remains below a ceiling.

## Fixes made from the measurements

- Fixed-size brand images use their already optimised local WebP directly, avoiding redundant
  responsive candidates and inline style attributes.
- Header, footer and navigation links disable unnecessary route prefetch on the static public shell;
  the measured home desktop request count fell to 22.
- The TV mark no longer imports the client-side Next Image runtime; the TV JavaScript median is now
  below the 225 KiB ceiling.
- The MFA QR data image avoids an inline style so the production Content Security Policy remains
  effective without a style exception.

## Asset and reliability budgets

- No header/footer logo asset may exceed 100 KiB; explicit dimensions and aspect ratio are required.
- Typical editorial card images should remain at or below 250 KiB and full-width images at or below
  500 KiB after responsive processing.
- Fonts are WOFF2 only, with no more than 250 KiB on initial public navigation.
- Third-party JavaScript remains 0 KiB by default. Exceptions require privacy, security and
  performance approval.
- The display must not download rotating background media or remote embeds.
- Warm public, prayer API and admin responses target 500 ms before network transit.
- The display payload ceiling is 100 KiB compressed and normal polling is no more frequent than once
  per 60 seconds.
- Admin lists require pagination before a response can exceed 100 records.

## Reproduction and remaining gate

Repeat three cold mobile and desktop Lighthouse runs for `/`, `/prayer-times`, `/news`,
`/policies/privacy` and `/tv` against the final fixed hosting-provider preview. Use the production
build, representative synthetic approved data and the selected production region. Record the commit,
origin, runner location, Lighthouse/browser versions, medians and warnings.

The release owner still needs hosting credentials to perform that permanent-preview rerun. After
launch, field p75 data replaces assumptions once enough traffic exists; it does not excuse a
repeatable laboratory regression.

## Regression policy

- A budget failure blocks release unless the feature owner documents the cause, impact, mitigation
  and dated recovery issue.
- A new dependency must include its compressed transfer and execution cost in review notes.
- Rerun the evidence after material content, media, font, prayer-engine or hosting changes.
