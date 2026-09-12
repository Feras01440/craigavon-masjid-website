# Launch plan

The site is live and accurate today on its Vercel address. "Launch" means giving it a permanent
home, telling people, and setting up the habits that keep it alive. Everything below is ordered;
most steps are minutes.

## 1. Before announcing (owner actions)

1. **Custom domain.** Register (or point) the masjid's domain — e.g. `craigavonmasjid.org` — and add
   it in Vercel → Project → Settings → Domains. Vercel prints the two DNS records to set at the
   registrar; HTTPS is automatic. Until then, do not publicise the `vercel.app` address.
2. **Turn indexing on** — only once the domain is live. In Vercel → Settings → Environment Variables
   set `NEXT_PUBLIC_SITE_URL=https://<domain>` and `NEXT_PUBLIC_INDEXING_ENABLED=true`, then
   redeploy. `robots.txt` flips from "disallow" to "allow", the sitemap fills, and social cards use
   the real domain. (Indexing the temporary address first would split Google's view of the site
   between two URLs.)
3. **Sign in and enrol two-factor** on the committee account, then delete the labelled test enquiry
   in the dashboard.
4. **Merge the platform branch** (PR #1) once you are satisfied — the production deployment already
   runs this code.
5. **Connect Git to Vercel** (Project → Settings → Git) so every merge to `main` deploys itself and
   pull requests get preview links.

## 2. Announce (launch week)

- **Google Business Profile**: set the website field to the new domain and add the prayer-times link
  as a "Book/Learn more" action. This is where most local searches land.
- **MAWAQIT profile**: add the website address so app users find the site.
- **WhatsApp / social**: one message with the address and the two things people use most — today's
  prayer times and the calendar feed (`/prayer-times/calendar.ics`, which phones can subscribe to).
- **Print**: a small QR code on the noticeboard pointing at `/prayer-times`.
- **Search Console**: add the domain, submit `/sitemap.xml` (5 minutes; lets you see what people
  search for).

## 3. Keep it alive (the habits)

| Rhythm       | Task                                                                              | Owner     |
| ------------ | --------------------------------------------------------------------------------- | --------- |
| Weekly       | Answer enquiries in the dashboard queue (the form promises a reply)               | Admin     |
| Monthly      | Post one news item or event — even short ("Eid prayer 8:30")                      | Committee |
| Quarterly    | Review FAQs and service wording; add what people actually asked                   | Committee |
| Twice yearly | Import the next timetable period (`docs/operations/prayer-timetable.md`)          | Admin     |
| Ramadan      | Publish seasonal arrangements (Tarawih, Iftar) in the dashboard three weeks ahead | Committee |
| Yearly       | Rotate the service-role and cron secrets; confirm backups (Supabase daily)        | Admin     |

## 4. Phases already prepared in the codebase

- **TV display** (`/tv`): built and tested; switch on when the committee authorises the display
  phase. It reads the same published timetable.
- **Photography**: the hero and the "find us" band are designed to take the masjid's own photographs
  the moment they arrive (`docs/EDITING-GUIDE.md`).
- **Event registration / education sign-up**: feature flags exist and are off; enable only with a
  named owner for the replies.

## 5. What "successful" looks like after 90 days

- People check prayer times on the site rather than phoning.
- Neighbours and schools arrive through the FAQs and the visit service.
- Every enquiry gets a reply within the week.
- The timetable has never shown a wrong or invented time.

## Non-goals (by decision)

No donations content, no fees or prices anywhere, no analytics that track individuals, no
third-party scripts on public pages.
