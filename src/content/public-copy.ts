export const SITE_NAME = "Muslim Association of Craigavon";

export const SITE_DESCRIPTION =
  "Prayer times, visiting information and community notices from the Muslim Association of Craigavon.";

export const primaryNavigation = [
  { href: "/prayer-times", label: "Prayer times" },
  { href: "/visit", label: "Visit" },
  { href: "/services", label: "Services" },
  { href: "/education", label: "Learning" },
  { href: "/news", label: "News" },
  { href: "/new-muslims", label: "New Muslims" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export const publicJourneys = [
  {
    href: "/visit",
    title: "Plan a visit",
    description:
      "Check the current address, directions, access and transport information before travelling.",
    status: "Visit information",
  },
  {
    href: "/services",
    title: "Ask about a service",
    description:
      "Read the current service listings for availability, limits and practical next steps.",
    status: "Service listings",
  },
  {
    href: "/education",
    title: "Find learning information",
    description:
      "Read the current learning and recurring programme information, including how to enquire.",
    status: "Learning listings",
  },
  {
    href: "/new-muslims",
    title: "New Muslim information",
    description:
      "Read practical information about private contact, visiting and any available learning support.",
    status: "Practical information",
  },
] as const;
