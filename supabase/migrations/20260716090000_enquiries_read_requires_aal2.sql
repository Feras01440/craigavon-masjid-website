-- Reading enquiry personal data now requires an authenticator-confirmed
-- (AAL2) session.
--
-- Enquiry rows carry names, contact details and free-text message bodies —
-- including new-Muslim support messages, which are religion-adjacent
-- special-category data. Updates and deletions already required AAL2; this
-- aligns the read boundary so a compromised magic-link (AAL1) session cannot
-- disclose the queue. The application redirects non-AAL2 sessions to the
-- Security page before the enquiries surface renders.

drop policy if exists enquiries_manager_read on public.enquiries;

create policy enquiries_manager_read
on public.enquiries for select to authenticated
using (public.has_permission('enquiries:read') and public.has_aal2());
