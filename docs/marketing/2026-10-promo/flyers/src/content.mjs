/*
 * Flyer copy for Workstream 9 (October 2026). Single source for the HTML, the QR codes and the
 * claims register: every string here must trace to a row in ../../copy-claims-register.md.
 * Rules: no em dashes, no prices, no competitor names, no client names, no results or statistics.
 * The consultation condition (free consultation, work quoted first) always sits beside the offer.
 */

const UTM = (content) => `?utm_source=flyer&utm_campaign=promo-2026-10&utm_content=${content}`;
const CONSULT = "https://drylake.com.au/consultation";
const COLLAB = "https://drylake.com.au/collaborate";

export const BRAND = {
  legal: "Drylake Pty Ltd",
  abn: "ABN 70 702 662 557",
  place: "Perth, Western Australia",
  phone: "0433 448 000",
  web: "drylake.com.au",
  email: "hello@drylake.com.au",
  philosophy: "Strip it back. Find the cracks. Build back better.",
  tagline: "See what lies beneath. Build what comes next.",
};

export const CONSULT_CTA = {
  title: "Book a free 30-minute consultation",
  condition: "The consultation is free. Any work is quoted before it begins.",
  hours: "Mon, Tue and Fri, 9:00 am to 5:00 pm Perth time. Microsoft Teams or phone.",
};

export const FLYERS = [
  {
    slug: "services-overview",
    eyebrow: "Technology for businesses",
    headline: ["See what lies beneath.", "Build what comes next."],
    accentLine: 1,
    sub: "When a lake dries, the ground underneath shows its cracks. We do the same for your business: strip it back, find the cracks, then build back better.",
    bullets: [
      "Websites that make it easy for customers to get in touch",
      "Custom software, booking and customer management systems",
      "Business automations that take repetitive work off your team",
      "Practical AI-enabled solutions where they genuinely help",
    ],
    printUrl: "drylake.com.au/consultation",
    qrUrl: CONSULT + UTM("overview"),
    cta: CONSULT_CTA,
  },
  {
    slug: "website-development",
    eyebrow: "Website development",
    headline: ["Websites that help customers", "find you and get in touch."],
    accentLine: 1,
    sub: "New sites and redesigns for businesses, with enquiry and booking forms connected to the way you work.",
    bullets: [
      "A clear, fast site that explains what you do and makes the next step obvious",
      "Enquiry and booking forms that reach the right person, not a shared inbox",
      "Pages set up properly so search engines can find and list them",
      "Domains, DNS and business email configured properly",
    ],
    printUrl: "drylake.com.au/consultation",
    qrUrl: CONSULT + UTM("web"),
    cta: CONSULT_CTA,
  },
  {
    slug: "business-automation",
    eyebrow: "Business automation",
    headline: ["Spend less time on", "repetitive tasks."],
    accentLine: 1,
    sub: "We set up software to handle routine work, so fewer things depend on someone remembering.",
    bullets: [
      "Appointment reminders and enquiry follow-ups that happen on time",
      "Information moved between systems without retyping",
      "Recurring reports that run without someone starting them",
      "Approvals with a clear record of who approved what, and when",
    ],
    printUrl: "drylake.com.au/consultation",
    qrUrl: CONSULT + UTM("automation"),
    cta: CONSULT_CTA,
  },
  {
    slug: "custom-software",
    eyebrow: "Custom software",
    headline: ["Software built for the way", "your business works."],
    accentLine: 1,
    sub: "When the spreadsheet has become the system, we build software made for your business.",
    bullets: [
      "Customer portals where clients see their projects, documents and invoices",
      "Booking and customer management in one organised place",
      "Staff dashboards, job tracking and approval workflows",
      "Straight advice when an existing product already does the job",
    ],
    printUrl: "drylake.com.au/consultation",
    qrUrl: CONSULT + UTM("software"),
    cta: CONSULT_CTA,
  },
  {
    slug: "free-consultation",
    eyebrow: "Free consultation",
    headline: ["Book a free", "30-minute consultation."],
    accentLine: 1,
    sub: "Talk through your business, your ideas and where things are getting stuck. No obligation to proceed.",
    bullets: [
      "30 minutes with Drylake, on Microsoft Teams or by phone",
      "Monday, Tuesday and Friday, 9:00 am to 5:00 pm Perth time",
      "No account needed. Reschedule or cancel from your confirmation email",
      "If there is a fit, you get a clear quote before any work begins",
    ],
    printUrl: "drylake.com.au/consultation",
    qrUrl: CONSULT + UTM("consultation"),
    cta: CONSULT_CTA,
  },
  {
    slug: "bronnie-collaboration",
    eyebrow: "In development: pilot and early access",
    headline: ["Meet BRONNIE.", "Now in development."],
    accentLine: 1,
    sub: "BRONNIE is an AI-powered, multi-tenant business operations and automation platform that Drylake is building. Its first focus is customer operations.",
    bullets: [
      "Intelligent handling of incoming enquiries",
      "Routing each enquiry to the right person",
      "Coordinating appointments",
      "Pilot and early-access discussions are welcome",
    ],
    status: "BRONNIE is in development and is not yet available for general use.",
    printUrl: "drylake.com.au/collaborate",
    qrUrl: COLLAB + UTM("bronnie"),
    cta: {
      title: "Talk to us about a pilot or early access",
      condition: "Prefer a general chat? Book a free 30-minute consultation at drylake.com.au/consultation. Any work is quoted before it begins.",
      hours: "",
    },
  },
];
