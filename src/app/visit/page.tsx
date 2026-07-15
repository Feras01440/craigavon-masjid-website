import type { Metadata } from "next";

import { PageIntro, PublicShell, StatusPanel } from "@/components/site";
import { getPublicContactInformation } from "@/server/repositories/public-site-settings";

export const metadata: Metadata = {
  title: "Visit",
  description:
    "Status of confirmed directions, visiting and access information for the Muslim Association of Craigavon.",
};

export default async function VisitPage() {
  const contact = await getPublicContactInformation();
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
  const visitItems = [
    { term: "Address", detail: address || "Not currently available online" },
    { term: "Directions", detail: contact?.directions || "Not currently available online" },
    {
      term: "Entrance and parking",
      detail: contact?.parking_information || "Not currently available online",
    },
    {
      term: "Accessibility and facilities",
      detail: contact?.access_information || "Not currently available online",
    },
    {
      term: "Public transport",
      detail: contact?.public_transport_information || "Not currently available online",
    },
  ];
  const hasApprovedVisitDetails = visitItems.some(
    (item) => item.detail !== "Not currently available online",
  );
  return (
    <PublicShell>
      <PageIntro
        eyebrow="Visit"
        title={
          hasApprovedVisitDetails ? "Plan your visit" : "Visit information is not currently online"
        }
        description="Check the current address, route, parking and access details before travelling. Missing information is never guessed."
        current="Visit"
      />

      <section className="section" aria-labelledby="visit-status-heading">
        <div className="site-container content-grid">
          <div>
            <p className="eyebrow">Current status</p>
            <h2 id="visit-status-heading">
              {hasApprovedVisitDetails
                ? "Approved visit information"
                : "No travel details are published"}
            </h2>
            <dl className="status-list">
              {visitItems.map((item) => (
                <div key={item.term}>
                  <dt>{item.term}</dt>
                  <dd>{item.detail}</dd>
                </div>
              ))}
            </dl>
          </div>
          <StatusPanel
            label="Before travelling"
            title={contact?.map_url ? "Open the map" : "Before travelling"}
          >
            <p>
              If the address or route you need is not shown, use a separate confirmed source before
              travelling. Old listings may no longer be accurate.
            </p>
            {contact?.map_url ? (
              <p>
                <a href={contact.map_url}>Open map in a new service</a>
              </p>
            ) : null}
          </StatusPanel>
        </div>
      </section>

      <section className="section section--tinted" aria-labelledby="access-standard">
        <div className="site-container prose prose--wide">
          <p className="eyebrow">Access information</p>
          <h2 id="access-standard">Specific details, not broad assurances</h2>
          <p>
            Future guidance will describe the actual route to the entrance, thresholds, doors,
            toilets, prayer spaces, seating, parking and a way to discuss an access need. It will
            not use an unsupported phrase such as “fully accessible”.
          </p>
        </div>
      </section>
    </PublicShell>
  );
}
