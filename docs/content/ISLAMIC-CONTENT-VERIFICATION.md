# Islamic Content Verification

## Purpose

Religious content can affect worship, family decisions and a person's understanding of Islam. It must be treated as operationally sensitive content, not decoration or general marketing copy.

This document applies to Qur'anic text and translations, hadith, du'a, explanations of belief and worship, prayer timetables, Hijri dates, Ramadan and Eid information, nikah and janazah guidance, shahadah/new-Muslim content, Islamic terminology and any statement that could reasonably be understood as a religious ruling.

Nothing in this document appoints Codex, a developer or a general website editor as a religious authority. The committee must nominate an approved imam or suitably qualified reviewer before this material can be published.

## Non-negotiable publish gate

High-risk Islamic content must not be public unless:

1. The exact text being published is recorded.
2. Its source is identified precisely.
3. The source and translation/licence have been checked.
4. A qualified reviewer approved the wording and context.
5. A website editor checked presentation, accessibility and metadata.
6. The approval date, reviewer and next-review trigger are stored.

Inherited publication is not approval. A quotation or arrangement appearing on the old website, Facebook, MAWAQIT or a printed leaflet remains unverified until the responsible reviewer confirms it.

## Roles and separation of duties

| Role | Responsibility | Must not do |
| --- | --- | --- |
| Author/editor | Drafts plain-language copy and records sources | Present personal opinion as the Association's ruling |
| Islamic reviewer | Checks Arabic, source, meaning, context and jurisprudential framing | Approve an operational time they have not been authorised to approve |
| Prayer-times approver | Confirms calculation policy, congregation times and exceptions on behalf of the committee | Treat an app's output as committee approval |
| Legal/policy reviewer | Checks civil-law, safeguarding or privacy wording | Give religious approval unless separately qualified |
| Publisher | Confirms all required records are complete and publishes the approved revision | Alter approved religious wording during publication |

No person should author and give final religious approval to the same high-risk item unless the committee has explicitly recorded why that is necessary.

## Risk levels

### Level 1 — explicit approval required for every revision

- Prayer start times, congregation times, Friday prayer, Ramadan, Eid and Hijri-date policy.
- Qur'anic Arabic or an English translation.
- Hadith or attributed statements of the Prophet, peace and blessings be upon him.
- Statements about what is valid, obligatory, prohibited, recommended or sufficient.
- Nikah, divorce, janazah, zakah, fasting exemptions and shahadah guidance.
- Answers to personal religious questions.

### Level 2 — approval required before first publication and after substantive change

- General introductions to Islam and the five pillars.
- Descriptions of mosque etiquette and worship.
- Transliteration and definitions of Islamic terms.
- Religious course descriptions and learning outcomes.

### Level 3 — editorial review normally sufficient

- A confirmed event title that contains an established term, such as `Friday prayer`.
- Directions to an approved prayer or class without teaching religious content.

If there is doubt, use the higher level.

## Verification record

Create one record for each quotation, teaching item or linked group of claims. Store it with revision history.

```text
Record ID:
Public title/page:
Risk level:
Exact approved English wording:
Exact approved Arabic wording, if any:
Primary source and precise reference:
Translation name, translator/publisher and edition:
Licence or permission:
Supporting scholarly reference, if needed:
Areas of legitimate difference:
Approved local position/wording:
Islamic reviewer name and role:
Approval date:
Website editor:
Effective date:
Review/expiry trigger:
Supersedes record:
Notes:
```

A URL alone is not a complete record. Preserve the edition/reference and the exact approved wording so later changes can be compared.

## Qur'an workflow

For each quotation:

1. Record the surah name, surah number and verse number(s).
2. Obtain Arabic from a recognised, documented text source; do not retype it from memory or copy it from an unattributed image.
3. Compare every Arabic character, diacritic and verse boundary against the recorded source.
4. Record whether the quotation is a complete verse or an excerpt. Do not make an excerpt appear to be the complete verse.
5. Select a named English translation with clear permission for the intended use.
6. Copy the translation accurately. Do not put an editor's paraphrase in quotation marks.
7. If an ellipsis or editorial clarification is required, have the reviewer approve it and mark it transparently.
8. Check that the surrounding page does not distort the verse's meaning or use it as decorative filler.
9. Render Arabic with `lang="ar" dir="rtl"`, suitable Arabic typography and enough line height. Keep the translation and citation programmatically associated nearby.
10. Record reviewer approval and the translation licence before publication.

Do not generate, reconstruct, trace or stylise Qur'anic calligraphy for decoration. A verse should be present because it materially supports approved content.

## Hadith workflow

For each hadith or prophetic attribution, record:

- collection title;
- book/chapter where relevant;
- hadith number in the named edition or database;
- Arabic text where it will be published;
- exact English translation and its source;
- grading and who assigned that grading;
- any important variant or dispute;
- the context in which the Association is using it;
- the qualified reviewer's approval.

Do not use a social-media graphic, unattributed quotation site or search-result snippet as a source. Do not shorten a hadith in a way that changes its meaning. Weak, disputed or context-dependent material requires explicit labelling and a clear editorial reason; omission is preferable to a misleading inspirational quotation.

The inherited statement “Seeking knowledge is an obligation upon every Muslim” at `education.html:69` is not ready to republish: `Ibn Majah` alone does not identify the exact narration, translation, grading or approved context.

## Fiqh, rulings and legitimate difference

- Do not present one legal school's view as universally agreed.
- Distinguish a **religious rule**, an **approved local practice** and an **administrative arrangement**.
- State the scope of an approved local position without implying authority over other mosques or individuals.
- Where legitimate differences matter, use wording such as: “Requirements are confirmed with the approved imam for each enquiry.” Do not write a comparative fiqh essay unless the page genuinely needs one.
- Never give a personal fatwa through static copy, a chatbot or an unreviewed form response.
- Route personal questions to the committee-approved contact and state response/emergency limitations.
- Record the reviewer, school/method or scholarly basis where it materially affects the advice.

The inherited nikah checklist at `services.html:108-112`, including its unqualified wali and witness requirements, requires explicit qualified review before any reuse.

## Prayer-time and calendar content

Prayer information is Level 1 operational content. Appearance must never outrank accuracy.

Before any timetable is published, the authorised prayer-times approver must confirm:

- the source-of-truth model;
- coordinates and `Europe/London` timezone;
- calculation method and parameters;
- Asr convention/madhhab setting;
- high-latitude handling;
- manual minute adjustments;
- congregation-time rules for every prayer;
- whether any prayers are joined and on what authority;
- each Friday-prayer session and effective date;
- Ramadan-specific rules;
- Eid arrangements;
- per-date exceptions and closures;
- Hijri calendar source and local adjustment policy;
- the person who approved the release.

The published page must clearly distinguish:

- prayer start time;
- congregational prayer time;
- Friday-prayer session;
- calculated value;
- committee-set value;
- per-date override;
- provisional information.

Never infer a missing congregation time from a convenient offset. Show a calm unavailable message and the approved contact route.

### Required prayer checks

The approval preview must cover at least:

- UK spring and autumn clock changes;
- dates around midnight in `Europe/London`;
- visitors in other device timezones;
- Friday handling and multiple Friday sessions;
- high-latitude summer and winter;
- month boundaries and leap years;
- Ramadan and Hijri adjustments of `-1`, `0` and `+1`;
- missing congregation times and overrides;
- offline/data-service failure;
- a display left running across midnight and clock changes.

The inherited `13:00` Friday-prayer setting, Moonsighting Committee calculation, Shafi'i Asr setting, seventh-of-the-night rule, joined Maghrib/Isha arrangement and offset congregation rules are all **unconfirmed launch blockers**. They must not be accepted because they exist in `content/config.js`.

## Hijri dates, Ramadan and Eid

- Explain that a calculated Hijri date may differ from a locally observed date.
- Identify the calendar source and any committee adjustment.
- Do not announce the start of Ramadan or Eid automatically from a calculated date unless the committee has expressly approved that workflow.
- Give Ramadan and Eid notices an approver, effective time, update timestamp and expiry.
- Do not imply that Tarawih, iftar meals or Eid prayer are provided until each arrangement is confirmed for that year.

## Nikah content

- Separate the Association's confirmed service from general religious explanation.
- State what the Association can and cannot arrange, required notice, documents, fees, venue limits and contact route only after confirmation.
- Have the approved imam review every statement about consent, wali, witnesses, mahr, khutbah and validity.
- Keep Northern Ireland civil-marriage guidance separate, link to a current official source, record the date checked and state that the website does not provide legal advice.
- Do not promise that the committee will coordinate both religious and civil processes unless that service is confirmed.

## Janazah content

- Confirm the actual facilities, monitored contact, service area, availability and relationships with funeral directors/cemeteries before publication.
- Do not promise immediate response, washing, shrouding, transport, burial liaison or continuous family support without operational approval.
- Distinguish religious guidance from the Association's practical capability.
- Provide an approved alternative route when the main contact is unanswered and make clear that the website is not an emergency service.

## Shahadah and new-Muslim content

- Use non-coercive, private and respectful wording.
- Have the approved reviewer check what is said about sincerity, witnesses, ceremony and next steps.
- Do not imply that a public ceremony is required or that one particular local process defines whether a person is Muslim.
- Do not promise mentoring, classes, a same-gender host or long-term support unless a responsible programme owner has confirmed capacity.
- Collect the minimum personal information and never expose a sensitive enquiry to unapproved recipients.

## Arabic, transliteration and honorifics

- Arabic must be checked by a competent reader against the recorded source.
- Use Unicode text rather than an image when practical.
- Mark each Arabic run with `lang="ar" dir="rtl"`; use bidirectional isolation when Arabic and English share a line.
- Use a font that supports Arabic shaping and diacritics at the required screen size.
- Do not break Arabic words across decorative elements or rely on manual letter spacing.
- Keep transliteration consistent, but prefer familiar English in navigation, buttons and urgent information.
- Do not assume screen readers will pronounce the single `ﷺ` glyph correctly. Use an approved written form or accessible expansion.
- Do not place sacred text where it may be cropped, animated rapidly, used as a background pattern or treated as a purely decorative asset.

## Current inherited content requiring review

The following categories are quarantined pending verification:

| Content | Examples | Required action |
| --- | --- | --- |
| Qur'anic quotations/translations | Home, About, Services, Education, New to Islam, Contact and footer quotation bands | Verify Arabic, verse extent, named translation, licence and purpose |
| Hadith | Education page introduction | Record exact reference, translation and grading |
| Nikah requirements | Services checklist | Qualified fiqh and legal review |
| Janazah claims | Services/About/Home | Confirm religious wording and actual operational capability |
| Five-pillars explanations | New to Islam | Review oversimplified zakah and other teaching copy |
| Shahadah guidance | Services and New to Islam | Review requirements and pastoral promises |
| Prayer configuration | All prayer widgets and display | Committee approval of every parameter and effective date |
| Ramadan/Eid/Tarawih/iftar claims | Home, About, Services, Community | Confirm annually; keep unpublished otherwise |
| Mosque etiquette and women's arrangements | New to Islam and Contact | Confirm as local practice and facility information |

## Correction and incident process

If religious content may be wrong:

1. Unpublish or replace it with an unavailable notice immediately; do not wait for a full rewrite.
2. Preserve the affected revision, publication time and audit log.
3. Notify the Islamic reviewer and relevant committee owner.
4. Check every channel that reused the content, including the public site, TV display, downloads, social posts and cached announcements.
5. Publish a correction when the error could have affected worship or decisions. State what changed and when without concealing the mistake.
6. Record the approved replacement and why the previous control failed.
7. Add a test or workflow control that prevents recurrence.

## Final approval checklist

- [ ] Exact source and reference recorded.
- [ ] Arabic checked character by character where used.
- [ ] Named English translation and permission recorded.
- [ ] Quotation/excerpt boundaries are honest.
- [ ] Hadith grading and edition recorded where applicable.
- [ ] Legitimate differences are not presented as universal consensus.
- [ ] Local operational practice is distinguished from religious rule.
- [ ] Qualified reviewer and approval date recorded.
- [ ] Arabic language, direction, font and screen-reader treatment checked.
- [ ] Prayer/calendar values have the separate operational approval required above.
- [ ] No unconfirmed service promise or legal advice is embedded in the wording.
- [ ] Review trigger and correction owner recorded.

