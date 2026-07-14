export const SITE_NAME = "Muslim Association of Craigavon";

export const SITE_DESCRIPTION =
  "Prayer, visit and community information published only after it has been checked and approved.";

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
      "Confirmed directions, visiting times and access information will appear here once approved.",
    status: "Details being confirmed",
  },
  {
    href: "/services",
    title: "Ask about a service",
    description:
      "Open the service register to see whether any availability, limits and next steps are approved.",
    status: "Check approved listings",
  },
  {
    href: "/education",
    title: "Find learning information",
    description:
      "Open the learning register for approved programme details; unconfirmed details remain absent.",
    status: "Check approved listings",
  },
  {
    href: "/new-muslims",
    title: "New Muslim information",
    description:
      "A private, approved contact route and clear scope of support are still being prepared.",
    status: "Contact route pending",
  },
] as const;

export const policyEntries = [
  {
    slug: "privacy",
    title: "Privacy notice",
    status: "Not yet approved",
    summary:
      "The notice will explain what information is collected, why it is needed, who can access it and when it is deleted.",
    requiredBefore:
      "Required before public forms, enquiry management or production administrator accounts are enabled.",
  },
  {
    slug: "accessibility",
    title: "Accessibility statement",
    status: "Testing in progress",
    summary:
      "The statement will report tested accessibility, known limitations and an approved route for requesting help.",
    requiredBefore:
      "Publish only after representative keyboard, zoom, contrast and assistive-technology checks are recorded.",
  },
  {
    slug: "safeguarding",
    title: "Safeguarding",
    status: "Not yet approved",
    summary:
      "The public page will identify the approved safeguarding route without inviting sensitive disclosures through a general form.",
    requiredBefore:
      "Required before children's programmes, children's data collection or identifiable photography are published.",
  },
  {
    slug: "complaints",
    title: "Complaints and feedback",
    status: "Process being confirmed",
    summary:
      "The page will explain how to raise a concern, what information is needed and what response to expect.",
    requiredBefore:
      "A monitored recipient, escalation route and realistic response standard must be approved first.",
  },
  {
    slug: "website-terms",
    title: "Website terms",
    status: "Not yet approved",
    summary:
      "The terms will explain the limits of website information, external links and time-sensitive notices.",
    requiredBefore:
      "Legal and committee review is required before the terms are described as adopted policy.",
  },
] as const;

export type PolicyEntry = (typeof policyEntries)[number];

export function getPolicyEntry(slug: string): PolicyEntry | undefined {
  return policyEntries.find((entry) => entry.slug === slug);
}
