import type { Metadata } from "next";

import { PublicEnquiryForm } from "@/components/site/public-enquiry-form";
import { PageIntro, PublicShell } from "@/components/site";
import { getPublicEnquiryAvailability } from "@/server/repositories/enquiry-availability";
import { getPublicContactInformation } from "@/server/repositories/public-site-settings";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact Craigavon Masjid — phone, WhatsApp, email, enquiry form, visiting information and map.",
};

export const dynamic = "force-dynamic";

function whatsappHref(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  const international = digits.startsWith("44")
    ? digits
    : digits.startsWith("0")
      ? `44${digits.slice(1)}`
      : digits;
  return `https://wa.me/${international}`;
}

export default async function ContactPage() {
  const [availability, contact] = await Promise.all([
    getPublicEnquiryAvailability(),
    getPublicContactInformation(),
  ]);
  const address = contact
    ? [
        contact.address_line_1,
        contact.address_line_2,
        contact.locality,
        contact.county,
        contact.postcode,
      ]
        .filter(Boolean)
        .join(", ")
    : "";
  const whatsapp = contact?.public_whatsapp ? whatsappHref(contact.public_whatsapp) : null;
  const visitingItems = [
    contact?.parking_information
      ? { term: "Entrance and parking", detail: contact.parking_information }
      : null,
    contact?.access_information
      ? { term: "Accessibility and facilities", detail: contact.access_information }
      : null,
  ].filter((item): item is { term: string; detail: string } => item !== null);
  const mapQuery = address ? `Craigavon Masjid, ${address}` : "Craigavon Masjid, BT65 5BE";

  return (
    <PublicShell>
      <PageIntro
        eyebrow="Contact"
        title="Contact us"
        description="Call, message or write to us — or send an enquiry with the form below. We're always glad to hear from you."
        current="Contact"
      />

      <section className="section section--compact" aria-label="Contact details">
        <div className="site-container">
          <div className="contact-methods">
            {contact?.public_phone ? (
              <a
                className="contact-method"
                href={`tel:${contact.public_phone.replaceAll(" ", "")}`}
              >
                <span className="contact-method__label">Phone</span>
                <span className="contact-method__value">{contact.public_phone}</span>
              </a>
            ) : null}
            {contact?.public_whatsapp && whatsapp ? (
              <a
                className="contact-method"
                href={whatsapp}
                rel="noreferrer noopener"
                target="_blank"
              >
                <span className="contact-method__label">WhatsApp</span>
                <span className="contact-method__value">{contact.public_whatsapp}</span>
              </a>
            ) : null}
            {contact?.public_email ? (
              <a className="contact-method" href={`mailto:${contact.public_email}`}>
                <span className="contact-method__label">Email</span>
                <span className="contact-method__value">{contact.public_email}</span>
              </a>
            ) : null}
            {address ? (
              <div className="contact-method contact-method--static">
                <span className="contact-method__label">Address</span>
                <address className="contact-method__value">{address}</address>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="contact-form-heading">
        <div className="site-container content-grid">
          <div>
            <p className="eyebrow">Enquiries</p>
            <h2 id="contact-form-heading">Send us a message</h2>
            {availability.enabled ? (
              <PublicEnquiryForm />
            ) : (
              <p className="contact-form-fallback">
                The online form isn&apos;t available right now — please phone, WhatsApp or email us
                instead and we&apos;ll get back to you.
              </p>
            )}
          </div>
          <aside className="visiting" id="visiting" aria-labelledby="visiting-heading">
            <p className="eyebrow">Your visit</p>
            <h2 id="visiting-heading">Visiting the masjid</h2>
            <p>
              The masjid is open for the five daily prayers and Jumuʿah, and visitors are always
              welcome. If it&apos;s your first time, just ask for help when you arrive — someone
              will happily show you around.
            </p>
            {visitingItems.length > 0 ? (
              <dl className="status-list">
                {visitingItems.map((item) => (
                  <div key={item.term}>
                    <dt>{item.term}</dt>
                    <dd>{item.detail}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </aside>
        </div>
      </section>

      <section className="section section--compact contact-map-section" aria-label="Map">
        <div className="site-container">
          <div className="contact-map">
            <iframe
              className="contact-map__frame"
              title="Map showing Craigavon Masjid at the Legahory Centre"
              src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=16&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
          {contact?.map_url ? (
            <p className="contact-map__link">
              <a href={contact.map_url} rel="noreferrer noopener" target="_blank">
                Open in Google Maps
              </a>
            </p>
          ) : null}
          <p className="contact-safety">
            In an emergency always call 999 — messages sent here are not monitored around the clock.
          </p>
        </div>
      </section>
    </PublicShell>
  );
}
