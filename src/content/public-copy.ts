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
      "If you are exploring Islam, thinking about becoming Muslim, or have recently taken your Shahada, you can speak with us privately and at your own pace.",
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
      "We support families through bereavement: washing and shrouding, the Janazah prayer, and guidance on arranging an Islamic burial locally.",
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
    summary:
      "Enquire about arranging a Nikah ceremony, what the ceremony involves, and what you will need to bring.",
    points: ["Speak with us before setting a date", "Clear guidance on witnesses and requirements"],
    action: "Ask about a Nikah",
  },
  {
    id: "imam",
    title: "Speak with the imam",
    summary:
      "For religious questions, personal guidance or a sensitive matter, you can ask to speak with the imam or a suitable person privately.",
    points: [
      "Religious rulings and everyday practice",
      "Family and personal matters, in confidence",
    ],
    action: "Request a conversation",
  },
  {
    id: "education",
    title: "Education and Qur'an learning",
    summary:
      "Qur'an and Islamic education for children and adults. Current classes and times are listed on the Education page when enrolment is open.",
    points: ["Qur'an reading and memorisation", "Islamic studies for children"],
    action: "See education",
  },
  {
    id: "visits",
    title: "Mosque visits and open days",
    summary:
      "Schools, groups and neighbours are welcome to visit the masjid and learn how it is used. Arrange a visit with us in advance.",
    points: ["School and community group visits", "A welcoming first visit for individuals"],
    action: "Arrange a visit",
  },
] as const;
