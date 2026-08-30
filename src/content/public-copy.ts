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

/* Standing service categories authorised by the Association. Operational
   details (times, named contacts) are added only once confirmed — the copy
   below promises nothing unconfirmed. */
export const serviceCategories: readonly ServiceCategory[] = [
  {
    id: "new-to-islam",
    title: "Shahada and new Muslim support",
    summary:
      "Exploring Islam or recently became Muslim? Speak with us privately, at your own pace.",
    points: [
      "A private, unhurried conversation — ask anything",
      "Support with taking the Shahada when you are ready",
      "Guidance on prayer and the first steps of practising Islam",
      "Ongoing contact so you are not on your own afterwards",
    ],
    action: "Get in touch",
  },
  {
    id: "funerals",
    title: "Islamic funerals (Janazah)",
    summary:
      "Support through bereavement — washing and shrouding, the Janazah prayer and burial guidance.",
    points: [
      "Contact us as soon as possible after a death",
      "Guidance through each step of the Islamic process",
      "Coordination of the Janazah prayer at the masjid",
    ],
    action: "Contact us about a funeral",
  },
  {
    id: "nikah",
    title: "Nikah (Islamic marriage)",
    summary: "Arrange a Nikah ceremony at the masjid.",
    points: ["Speak with us before setting a date", "Clear guidance on witnesses and requirements"],
    action: "Ask about a Nikah",
  },
  {
    id: "imam",
    title: "Speak with the imam",
    summary: "Religious questions or a sensitive matter — ask for a private conversation.",
    points: [
      "Religious rulings and everyday practice",
      "Family and personal matters, in confidence",
    ],
    action: "Request a conversation",
  },
  {
    id: "education",
    title: "Education and Qur'an learning",
    summary: "Qur'an reading, memorisation and Islamic studies for children and adults.",
    points: ["Qur'an reading and memorisation", "Islamic studies for children"],
    action: "See education",
  },
  {
    id: "visits",
    title: "Mosque visits and open days",
    summary: "Schools, groups and neighbours are welcome — arrange a visit in advance.",
    points: ["School and community group visits", "A welcoming first visit for individuals"],
    action: "Arrange a visit",
  },
] as const;
