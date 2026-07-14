import type { Metadata } from "next";

import { PublicEnquiryForm } from "@/components/site/public-enquiry-form";
import { PageIntro, PublicShell, StatusPanel } from "@/components/site";
import { getPublicEnquiryAvailability } from "@/server/repositories/enquiry-availability";
import { getPublicContactInformation } from "@/server/repositories/public-site-settings";

export const metadata: Metadata = {
  title: "Contact",
  description: "Approved contact routes for the Muslim Association of Craigavon.",
};

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const [availability, contact] = await Promise.all([
    getPublicEnquiryAvailability(),
    getPublicContactInformation(),
  ]);
  return (
    <PublicShell>
      <PageIntro
        eyebrow="Contact"
        title="Contact the Association"
        description="A public form appears only after its privacy notice, retention period and committee workflow have been approved."
        current="Contact"
      />
      <section className="section" aria-labelledby="contact-form-heading">
        <div className="site-container content-grid">
          <div>
            <p className="eyebrow">Enquiries</p>
            <h2 id="contact-form-heading">
              {availability.enabled ? "Send a general enquiry" : "Contact route being confirmed"}
            </h2>
            {availability.enabled ? (
              <PublicEnquiryForm />
            ) : (
              <StatusPanel label="Not yet available" title="The public form is switched off">
                <p>
                  The committee has not yet published the privacy and retention configuration
                  required for responsible enquiry handling. No data is collected on this page.
                </p>
              </StatusPanel>
            )}
          </div>
          <aside className="callout" aria-labelledby="contact-limitations-heading">
            <h2 id="contact-limitations-heading">Please do not use this route for emergencies</h2>
            <p>
              This website is not monitored as an emergency, medical, safeguarding or crisis
              service. Use the appropriate public emergency service when immediate help is needed.
            </p>
            {contact &&
            (contact.address_line_1 ||
              contact.public_email ||
              contact.public_phone ||
              contact.public_whatsapp) ? (
              <div>
                <h3>Approved public contact details</h3>
                {contact.address_line_1 ? (
                  <address>
                    {[
                      contact.address_line_1,
                      contact.address_line_2,
                      contact.locality,
                      contact.county,
                      contact.postcode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </address>
                ) : null}
                {contact.public_email ? (
                  <p>
                    Email: <a href={`mailto:${contact.public_email}`}>{contact.public_email}</a>
                  </p>
                ) : null}
                {contact.public_phone ? (
                  <p>
                    Phone: <a href={`tel:${contact.public_phone}`}>{contact.public_phone}</a>
                  </p>
                ) : null}
                {contact.public_whatsapp ? <p>WhatsApp: {contact.public_whatsapp}</p> : null}
              </div>
            ) : null}
          </aside>
        </div>
      </section>
    </PublicShell>
  );
}
