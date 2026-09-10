import type { Metadata } from "next";
import Link from "next/link";

import { MasjidPhoto } from "@/components/site/masjid-photo";
import { PageIntro, PublicShell } from "@/components/site";
import { MASJID_NAME, SITE_NAME } from "@/content/public-copy";

export const metadata: Metadata = {
  title: "About",
  description:
    "About Craigavon Masjid and the Muslim Association of Craigavon, serving the Muslim community of Craigavon, Portadown and Lurgan.",
};

const gallery = [
  {
    name: "prayer-hall-wide",
    alt: "The main prayer hall at Craigavon Masjid, carpeted in red with rows of prayer arches",
    caption: "The prayer hall",
  },
  {
    name: "prayer-hall-entrance",
    alt: "The prayer hall looking towards the entrance and the mihrab in the far room",
    caption: "Looking towards the entrance",
  },
  {
    name: "wudu-area",
    alt: "The wudu area with marble walls, wash basins and cubicles",
    caption: "Wudu area",
  },
  {
    name: "shoe-room",
    alt: "Wooden shoe shelves either side of the door into the prayer hall",
    caption: "Shoe room at the entrance",
  },
] as const;

export default function AboutPage() {
  return (
    <PublicShell>
      <PageIntro eyebrow="About" title="About the masjid" current="About" />

      <section className="section about-lead" aria-labelledby="about-lead-heading">
        <div className="site-container about-lead__grid">
          <MasjidPhoto
            className="about-lead__photo"
            name="prayer-hall-mihrab"
            alt="The mihrab and minbar in the prayer hall at Craigavon Masjid"
            sizes="(min-width: 64rem) 56vw, 100vw"
            priority
          />
          <div className="about-lead__copy">
            <h2 id="about-lead-heading">{MASJID_NAME}</h2>
            <p>
              {MASJID_NAME} is the mosque of the {SITE_NAME}, at the Legahory Centre in the heart of
              Craigavon. It serves Muslims from Craigavon, Portadown, Lurgan and the surrounding
              towns, and it is open to anyone who would like to visit.
            </p>
            <p>
              The five daily prayers and Jumuʿah are held here, along with the Friday Qur&apos;an
              class. The Association also arranges funerals, Nikah ceremonies, support for people
              embracing Islam, and visits for schools and community groups.
            </p>
            <div className="button-row">
              <Link className="button button--primary" href="/prayer-times">
                Prayer times
              </Link>
              <Link className="button button--secondary" href="/contact">
                Contact us
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--tinted" aria-labelledby="gallery-heading">
        <div className="site-container">
          <div className="section-heading" data-reveal>
            <h2 id="gallery-heading">Inside the masjid</h2>
          </div>
          <div className="about-gallery">
            {gallery.map((photo, index) => (
              <figure
                className="about-gallery__item"
                key={photo.name}
                data-reveal
                style={{ "--reveal-delay": `${(index % 2) * 90}ms` } as React.CSSProperties}
              >
                <MasjidPhoto
                  name={photo.name}
                  alt={photo.alt}
                  sizes="(min-width: 48rem) 50vw, 100vw"
                />
                <figcaption>{photo.caption}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="association-heading">
        <div className="site-container prose prose--wide">
          <h2 id="association-heading">{SITE_NAME}</h2>
          <p>
            The Association is the registered body that runs the masjid: it maintains the building,
            organises the prayers and classes, and speaks for the community locally. It is run by a
            volunteer committee, and the masjid is funded by the community it serves.
          </p>
          <p>
            Questions, visits and requests for help all come through the{" "}
            <Link href="/contact">contact page</Link>.
          </p>
        </div>
      </section>
    </PublicShell>
  );
}
