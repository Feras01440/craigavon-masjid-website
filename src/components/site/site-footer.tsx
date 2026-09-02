/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

import type {
  ContactInformationSetting,
  PublicNavigationItem,
} from "@/server/repositories/public-site-settings";

function formatAddress(contact: ContactInformationSetting): string {
  return [contact.address_line_1, contact.address_line_2, contact.locality, contact.postcode]
    .filter(Boolean)
    .join(", ");
}

export function SiteFooter({
  siteName,
  masjidName,
  navigation,
  note,
  legalNote,
  contact,
}: {
  siteName: string;
  masjidName: string;
  navigation: PublicNavigationItem[];
  note: string;
  legalNote: string;
  contact: ContactInformationSetting | null;
}) {
  const address = contact ? formatAddress(contact) : "";
  const hasContact = Boolean(contact && (address || contact.public_phone || contact.public_email));
  return (
    <footer className="site-footer">
      <div className="site-container site-footer__grid">
        <div>
          <div className="site-footer__brand">
            <img
              className="site-footer__logo"
              src="/brand/logo-mark-gold-512.png"
              alt=""
              aria-hidden="true"
              width={512}
              height={512}
              loading="lazy"
              decoding="async"
            />
            <p className="site-footer__name">
              {masjidName}
              <span className="site-footer__organisation">{siteName}</span>
            </p>
          </div>
          {note ? <p className="site-footer__note">{note}</p> : null}
        </div>

        {hasContact && contact ? (
          <div className="site-footer__contact">
            <p className="site-footer__heading">Find us</p>
            {address ? <address className="site-footer__address">{address}</address> : null}
            {contact.public_phone ? (
              <p>
                <a href={`tel:${contact.public_phone.replaceAll(" ", "")}`}>
                  {contact.public_phone}
                </a>
              </p>
            ) : null}
            {contact.public_email ? (
              <p>
                <a href={`mailto:${contact.public_email}`}>{contact.public_email}</a>
              </p>
            ) : null}
          </div>
        ) : null}

        <nav className="site-footer__nav" aria-label="Footer navigation">
          <p className="site-footer__heading">Explore</p>
          <ul>
            {navigation.map((item) => (
              <li key={item.href}>
                <Link href={item.href} prefetch={false}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="site-container site-footer__bottom">
        <p>{legalNote || `© ${new Date().getFullYear()} ${siteName}`}</p>
      </div>
    </footer>
  );
}
