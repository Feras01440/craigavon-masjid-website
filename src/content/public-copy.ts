export const SITE_NAME = "Muslim Association of Craigavon";
export const MASJID_NAME = "Craigavon Masjid";

export const SITE_DESCRIPTION =
  "Craigavon Masjid — daily prayer times, Jumuʿah, education and community services in Craigavon, County Armagh.";

export const primaryNavigation = [
  { href: "/prayer-times", label: "Prayer times" },
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/education", label: "Education" },
  { href: "/news", label: "News" },
  { href: "/contact", label: "Contact" },
] as const;

export type ServiceCategory = {
  id: string;
  title: string;
  summary: string;
  points: readonly string[];
  action: string;
};

/* Standing service categories authorised by the Association, in the order
   they appear. Operational details (times, named contacts) are added only
   once confirmed — nothing below promises what is not offered. */
export const serviceCategories: readonly ServiceCategory[] = [
  {
    id: "new-to-islam",
    title: "Shahada and new Muslims",
    summary:
      "If you are thinking about becoming Muslim, or have recently taken your Shahada, the masjid will support you.",
    points: [
      "A private conversation, in confidence, with someone from the masjid",
      "Support with taking the Shahada, and witnesses if you would like them",
      "Help with learning to pray and the basics of daily practice",
      "Someone to ask as questions come up in the months that follow",
    ],
    action: "Get in touch",
  },
  {
    id: "education",
    title: "Education and Qur'an learning",
    summary:
      "Qur'an reading, memorisation and Islamic studies for children and adults, taught at the masjid.",
    points: [
      "Weekly Qur'an class every Friday after Maghrib",
      "Qur'an reading and memorisation",
      "Islamic studies for children",
    ],
    action: "See classes",
  },
  {
    id: "funerals",
    title: "Funerals (Janazah)",
    summary:
      "When a death occurs, contact the masjid straight away. We help the family through every step, from ghusl and shrouding to the Janazah prayer and burial.",
    points: [
      "Ghusl (washing) and kafan (shrouding) according to the Sunnah",
      "The Janazah prayer at the masjid, arranged with the family",
      "Guidance on the practical arrangements for burial in Northern Ireland",
    ],
    action: "Contact us about a funeral",
  },
  {
    id: "nikah",
    title: "Nikah (Islamic marriage)",
    summary:
      "The masjid conducts Nikah ceremonies. Speak to us before setting a date so that the requirements and witnesses are in place.",
    points: ["Guidance on the conditions of a valid Nikah", "The ceremony held at the masjid"],
    action: "Ask about a Nikah",
  },
  {
    id: "visits",
    title: "Mosque visits and open days",
    summary:
      "Schools, community groups and neighbours are welcome to visit. Arrange a time and we will show you the prayer hall and answer your questions.",
    points: [
      "School and college visits",
      "Community and interfaith groups",
      "Individuals who would like to see the masjid",
    ],
    action: "Arrange a visit",
  },
] as const;
