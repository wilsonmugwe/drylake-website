/*
 * Content for the standalone /locations/[slug] pages. PURE (tests import it directly).
 *
 * Every page here is written for its own area: the local commercial mix drives which business
 * types are named, which services lead, and which examples are used. A near-duplicate test
 * (Jaccard similarity over word shingles of locationCopy()) fails if two pages drift towards
 * the same text, so an area cannot be promoted by changing its name in a template.
 *
 * Honesty rules, enforced by tests/service-areas.test.mjs:
 *   - Every example is framed as an example ("For example, a ... could ..."). No result,
 *     client, project, review or number is claimed for any area.
 *   - No office or premises in the area. The shared service-area line says so.
 *   - No prices, no GST wording, no em dashes, no "near me" stuffing.
 * Shared template copy (process steps, service list, CTA, service-area line) lives in the page
 * component, not here, so it never counts towards or against distinctness.
 */

import { findArea, locationPath } from "./service-areas.ts";

export type LocationServiceTag =
  | "web-development"
  | "custom-software-development"
  | "business-automation"
  | "systems-integration"
  | "ai-automation";

export type LocationFit = {
  who: string;
  example: string;
  services: readonly LocationServiceTag[];
};

export type LocationFaq = { question: string; answer: string };

export type LocationPageContent = {
  seoTitle: string;
  seoDescription: string;
  eyebrow: string;
  headline: string;
  intro: string;
  mixHeading: string;
  mix: readonly string[];
  fitsHeading: string;
  fits: readonly LocationFit[];
  examplesNote: string;
  localHeading: string;
  localNote: string;
  faqs: readonly LocationFaq[];
  nearby: readonly string[];
};

export const LOCATION_PAGES: Record<string, LocationPageContent> = {
  "osborne-park": {
    seoTitle: "Osborne Park Web Developer & Software Company | Drylake",
    seoDescription:
      "Drylake builds websites, business software, quoting and booking systems and automations for trade suppliers and service firms in Osborne Park, Perth.",
    eyebrow: "Osborne Park, Perth",
    headline: "A web developer and software company for Osborne Park businesses.",
    intro:
      "Osborne Park is one of the busiest commercial and light-industrial precincts in the northern suburbs. Drylake builds the websites, internal software and automations that businesses here use to quote faster, schedule work and stop retyping the same details.",
    mixHeading: "What the Osborne Park business mix tends to need",
    mix: [
      "The precinct sits north of the CBD and mixes trade suppliers, wholesalers, showrooms, workshops and offices on the same few streets. Many of these businesses run on a handful of tools that grew one at a time: a spreadsheet for stock, an inbox for quotes, an accounting package for invoices.",
      "That pattern is where small systems pay off. A supplier that quotes by email and re-enters every line into an invoice has a different problem from an office-based firm, and the fix is usually a quoting form, a shared job list or a connection between two tools it already pays for.",
    ],
    fitsHeading: "Osborne Park business types and where software helps",
    fits: [
      {
        who: "Trade suppliers and wholesalers",
        example:
          "For example, a supplier taking trade orders by phone and email could move to an online order form that feeds straight into its invoicing, so counter staff stop retyping order lines.",
        services: ["custom-software-development", "systems-integration"],
      },
      {
        who: "Showrooms and retailers with trade customers",
        example:
          "For example, a showroom could have a website that explains its ranges clearly and takes quote requests with the right details attached, instead of a generic enquiry form.",
        services: ["web-development", "business-automation"],
      },
      {
        who: "Workshops and field service firms",
        example:
          "For example, a service firm could replace a whiteboard of jobs with a simple scheduling view that sends customers a confirmation and a reminder automatically.",
        services: ["custom-software-development", "business-automation"],
      },
      {
        who: "Office-based professional and design firms",
        example:
          "For example, a small consultancy could use an assistant that drafts first-pass summaries of client emails for a person to review before anything is sent.",
        services: ["ai-automation", "systems-integration"],
      },
    ],
    examplesNote: "These are illustrative examples of what is possible, not descriptions of work already delivered.",
    localHeading: "How Drylake works with Osborne Park businesses",
    localNote:
      "Osborne Park is a short drive from the CBD, so a walkthrough of how your counter, workshop or office actually runs is practical when it helps. Most of the design and build happens online, with an on-site visit arranged only where seeing the process saves time.",
    faqs: [
      {
        question: "Can a small Osborne Park supplier afford custom software?",
        answer:
          "Often the first useful step is small: one form, one connection between existing tools, or one automated reminder. The free consultation is where we look at your busiest manual job and say plainly whether a custom build, an existing product or no change at all is the right answer.",
      },
      {
        question: "We already use accounting and stock software. Do we need to replace it?",
        answer:
          "Usually not. Where the tools you have still do their job, Drylake connects to them or builds around them rather than replacing them.",
      },
    ],
    nearby: ["balcatta", "stirling", "innaloo", "leederville", "west-perth", "malaga"],
  },

  malaga: {
    seoTitle: "Malaga Business Software, Websites & Automation | Drylake",
    seoDescription:
      "Drylake builds websites, ordering and job-tracking software and workflow automation for manufacturers, warehouses and distributors in Malaga, Perth.",
    eyebrow: "Malaga, Perth",
    headline: "Business software and automation for Malaga manufacturers and distributors.",
    intro:
      "Malaga is a large northern industrial area of factories, warehouses and distribution businesses. Drylake builds the tracking systems, ordering tools and automations that help operations like these keep stock, jobs and paperwork in step.",
    mixHeading: "Why Malaga operations lean on their systems",
    mix: [
      "Industrial areas run on handovers: an order becomes a pick list, a pick list becomes a dispatch, a dispatch becomes an invoice. Each handover is a place where a figure gets retyped or a message gets lost, and in a busy warehouse those small losses add up faster than anyone notices.",
      "Manufacturers and distributors here also tend to sell to other businesses, which means repeat orders, account customers and delivery windows. Software that remembers a customer's usual order and flags what is running short removes a lot of daily chasing.",
    ],
    fitsHeading: "Malaga business types and where software helps",
    fits: [
      {
        who: "Small manufacturers and fabricators",
        example:
          "For example, a fabrication shop could track each job from quote to dispatch in one place, so the office can answer where a job is without walking onto the floor.",
        services: ["custom-software-development", "business-automation"],
      },
      {
        who: "Warehousing and distribution businesses",
        example:
          "For example, a distributor could have a portal where account customers place repeat orders themselves, with the order passed on to its stock and invoicing tools.",
        services: ["custom-software-development", "systems-integration"],
      },
      {
        who: "Trade and industrial suppliers",
        example:
          "For example, a supplier could receive new account applications through a clear online form, with credit checks and welcome emails handled by a routine workflow.",
        services: ["web-development", "business-automation"],
      },
      {
        who: "Freight and transport operators",
        example:
          "For example, a small carrier could connect its job sheets to its invoicing so proof-of-delivery paperwork stops piling up in the cab.",
        services: ["systems-integration", "ai-automation"],
      },
    ],
    examplesNote: "Each scenario above is an example of a possible build. None describes a Malaga project already completed.",
    localHeading: "How Drylake works with Malaga businesses",
    localNote:
      "Industrial sites are easiest to understand by seeing how goods and paperwork move, so a short on-site walkthrough can be arranged where it helps. Everything else, from planning to delivery and support, is handled remotely so your floor is not interrupted.",
    faqs: [
      {
        question: "Can software work alongside the stock and accounting systems we already run?",
        answer:
          "Yes. Connecting existing systems is a core part of the work, and a new tool is only added where it fills a real gap.",
      },
      {
        question: "Who looks after the system once it is built?",
        answer:
          "Drylake stays available for support and changes after launch, and the work is delivered in stages so your team can use each part before the next one starts.",
      },
    ],
    nearby: ["wangara", "balcatta", "osborne-park", "bayswater", "midvale", "mirrabooka"],
  },

  "canning-vale": {
    seoTitle: "Canning Vale Websites, Software & Automation | Drylake",
    seoDescription:
      "Drylake builds websites, booking and customer management systems and automations for Canning Vale businesses, from home-based operators to industrial suppliers.",
    eyebrow: "Canning Vale, Perth",
    headline: "Websites, booking systems and software for Canning Vale businesses.",
    intro:
      "Canning Vale combines large residential estates with an industrial and commercial area, so its businesses range from home-based operators to wholesale suppliers. Drylake builds the websites, booking tools and back-office systems that suit both ends.",
    mixHeading: "A suburb with two kinds of local business",
    mix: [
      "On one side are the estates: sole traders, tradies, tutors, allied health practitioners and home-based owners who serve households in the surrounding suburbs. Their needs are simple and urgent, a website that gets found, a way to book jobs and a way to stop chasing invoices.",
      "On the other side is the industrial and commercial area, which includes food and produce suppliers around the Perth Markets precinct. These businesses care about orders, delivery runs and repeat accounts, so they look for systems that reduce phone calls and double handling.",
    ],
    fitsHeading: "Canning Vale business types and where software helps",
    fits: [
      {
        who: "Tradies and home-service operators",
        example:
          "For example, a plumber working across the south-east suburbs could use a booking page that collects the address and the problem, then texts a confirmation without anyone typing it out.",
        services: ["web-development", "business-automation"],
      },
      {
        who: "Food and produce suppliers",
        example:
          "For example, a produce supplier could let regular buyers submit a standing order online, with a delivery list generated for each morning's run.",
        services: ["custom-software-development", "systems-integration"],
      },
      {
        who: "Allied health and tutoring practices in the estates",
        example:
          "For example, a small practice could keep client details, appointments and reminders in one simple system instead of a diary, a spreadsheet and a text thread.",
        services: ["custom-software-development", "ai-automation"],
      },
      {
        who: "Growing local retailers and cafes",
        example:
          "For example, a cafe could take group bookings and catering enquiries through a form that sorts them by date and sends a clear reply.",
        services: ["web-development", "business-automation"],
      },
    ],
    examplesNote: "These scenarios are examples of what could be built. They are not reports of work already done in Canning Vale.",
    localHeading: "How Drylake works with Canning Vale businesses",
    localNote:
      "Canning Vale is reachable from Perth, but for most owners a video call after work is more convenient than a meeting. Drylake works with Canning Vale businesses remotely, with an on-site visit arranged when it helps, such as seeing a delivery or stock routine first-hand.",
    faqs: [
      {
        question: "I run a one-person business from home. Is that too small?",
        answer:
          "No. The free consultation is built for owners who have not worked with a developer before, and many useful improvements, like a clear website or an online booking form, are small.",
      },
      {
        question: "Do you build for businesses that deliver across the south-east suburbs?",
        answer:
          "Yes. Booking, ordering and delivery tools do not depend on where the business sits, so the work can support routes and service areas well beyond Canning Vale.",
      },
    ],
    nearby: ["willetton", "thornlie", "gosnells", "harrisdale", "jandakot", "bibra-lake"],
  },

  "west-perth": {
    seoTitle: "West Perth Websites, Software & AI for Firms | Drylake",
    seoDescription:
      "Drylake builds websites, secure customer areas, document workflows and practical AI tools for professional firms and offices in West Perth and nearby.",
    eyebrow: "West Perth",
    headline: "Websites, secure customer areas and workflow software for West Perth firms.",
    intro:
      "West Perth is an office precinct on the edge of the CBD, home to professional firms, consultancies and medical practices. Drylake builds the client-facing websites, portals and internal workflows that make a small firm feel organised.",
    mixHeading: "What an office precinct needs from its software",
    mix: [
      "Professional firms sell time and trust. Their friction is rarely a missing feature in a big platform; it is the hours lost to onboarding paperwork, document chasing, status emails and reporting that someone assembles by hand each month.",
      "West Perth firms also tend to deal with sensitive client information, so how a system stores and shares data matters as much as what it does. Drylake treats access control, hosting location and who can see what as part of the design, not as a later add-on.",
    ],
    fitsHeading: "West Perth business types and where software helps",
    fits: [
      {
        who: "Accounting, legal and advisory practices",
        example:
          "For example, a small accounting practice could give clients a secure place to upload documents and see what is still outstanding, rather than chasing by email.",
        services: ["custom-software-development", "systems-integration"],
      },
      {
        who: "Consultancies and engineering offices",
        example:
          "For example, a consultancy could generate a first draft of a recurring report from its project notes, with a person reviewing the draft before it goes to the client.",
        services: ["ai-automation", "business-automation"],
      },
      {
        who: "Medical and allied health practices",
        example:
          "For example, a practice could let new patients complete intake details online before the first appointment, so reception time goes to people in the room.",
        services: ["web-development", "business-automation"],
      },
      {
        who: "Specialist firms that need to be found",
        example:
          "For example, a boutique firm could have a clear, fast website that explains who it helps and makes the next step obvious for a referred prospect.",
        services: ["web-development", "ai-automation"],
      },
    ],
    examplesNote: "Every scenario here is an example of a possible approach, not a record of completed work for a West Perth firm.",
    localHeading: "How Drylake works with West Perth firms",
    localNote:
      "Drylake is based in Perth, so a meeting in or near the CBD can be arranged when a conversation is easier in person. Most of the work runs online around your diary, and you deal directly with the people designing and building the system.",
    faqs: [
      {
        question: "How do you handle sensitive client information?",
        answer:
          "Access control and where data is hosted are decided up front, and AI tools are only used on client material where that is appropriate and agreed. A person reviews any AI output that affects a client.",
      },
      {
        question: "Can you work with the practice management software we already use?",
        answer:
          "Often yes. Many practice and accounting tools can be connected, and where they cannot, we say so early rather than promise an integration that does not exist.",
      },
    ],
    nearby: ["perth-cbd", "subiaco", "east-perth", "leederville", "northbridge", "nedlands"],
  },

  joondalup: {
    seoTitle: "Joondalup Web Developer & Software Company | Drylake",
    seoDescription:
      "Looking for a web developer in Joondalup? Drylake builds websites, booking systems, custom software and automations for businesses in the northern suburbs.",
    eyebrow: "Joondalup, Perth",
    headline: "A web developer and software company for Joondalup and the northern corridor.",
    intro:
      "Joondalup is the northern regional city centre, with a university, a major hospital, a large shopping centre and a busy professional core. Drylake builds the websites, booking systems and automations that businesses serving the north rely on.",
    mixHeading: "A regional centre with many kinds of business",
    mix: [
      "Because Joondalup is where much of the north goes for health care, study, shopping and professional services, its businesses serve a wide catchment from Currambine to Yanchep. That makes being found online, and making it easy to book or enquire, part of the day-to-day.",
      "The mix runs from health practices and training providers through to retailers, hospitality and a steady flow of professional services around the city centre. Their shared problem is volume: more enquiries, appointments and messages than a small team can handle by hand.",
    ],
    fitsHeading: "Joondalup business types and where software helps",
    fits: [
      {
        who: "Health and allied health practices",
        example:
          "For example, a physiotherapy practice could offer online booking with automatic reminders, cutting down on missed appointments and reception phone time.",
        services: ["web-development", "business-automation"],
      },
      {
        who: "Training providers and education services",
        example:
          "For example, a training provider could manage enrolments, course dates and follow-up emails in one system rather than across several spreadsheets.",
        services: ["custom-software-development", "systems-integration"],
      },
      {
        who: "Hospitality, retail and events",
        example:
          "For example, a restaurant could take large-group enquiries through a form that checks availability and drafts a reply for a manager to approve.",
        services: ["web-development", "ai-automation"],
      },
      {
        who: "Professional services serving the north",
        example:
          "For example, a financial or property service could use a secure customer area so documents, questions and next steps live in one place.",
        services: ["custom-software-development", "ai-automation"],
      },
    ],
    examplesNote: "These are examples of what a build could look like. They do not describe projects already delivered in Joondalup.",
    localHeading: "How Drylake works with Joondalup businesses",
    localNote:
      "Drylake has no office in Joondalup. We work with Joondalup businesses remotely, which suits a catchment that stretches across the whole northern corridor, and we can meet on site by arrangement when seeing your operation first-hand will help.",
    faqs: [
      {
        question: "Do I need a web developer based in Joondalup?",
        answer:
          "Not for most work. Planning, design and building happen online, and where an in-person conversation helps, a meeting can be arranged in Joondalup or a convenient place nearby.",
      },
      {
        question: "Can you build a booking system for a practice with several staff?",
        answer:
          "Yes. Booking can handle several practitioners, different appointment types and reminders, and it can connect to the tools a practice already uses for records and payments.",
      },
    ],
    nearby: ["wanneroo", "clarkson", "butler", "hillarys", "wangara", "yanchep"],
  },

  fremantle: {
    seoTitle: "Fremantle Websites, Booking Systems & Software | Drylake",
    seoDescription:
      "Drylake builds websites, booking and ordering systems and automations for hospitality, tourism, creative and maritime businesses in Fremantle, Perth.",
    eyebrow: "Fremantle, Perth",
    headline: "Websites, booking systems and software for Fremantle businesses.",
    intro:
      "Fremantle is a historic port city with a lively mix of hospitality, tourism, creative studios and maritime trades. Drylake builds the websites, bookings and back-office tools that help independent businesses here run smoothly through busy seasons.",
    mixHeading: "An independent, visitor-facing business community",
    mix: [
      "Much of Fremantle's economy is small and owner-run: cafes and venues, galleries and makers, tour and charter operators, and the trades that serve the port. Many depend on visitors as well as locals, so a clear website and an easy way to book or buy can decide whether a visit turns into a customer.",
      "Seasonality shapes the work. Weekend rushes, event days and cruise arrivals bring bursts of enquiries that are hard to answer by hand, which is where automation earns its place, quietly handling the routine replies so owners can attend to the people in front of them.",
    ],
    fitsHeading: "Fremantle business types and where software helps",
    fits: [
      {
        who: "Cafes, venues and hospitality operators",
        example:
          "For example, a venue could take function and table bookings online, with deposits and confirmations handled automatically and a clear list for the weekend.",
        services: ["web-development", "business-automation"],
      },
      {
        who: "Tour, charter and experience operators",
        example:
          "For example, a tour operator could show live availability, take bookings by the seat and send each guest their meeting details the day before.",
        services: ["custom-software-development", "systems-integration"],
      },
      {
        who: "Creative studios, galleries and makers",
        example:
          "For example, a maker could present a catalogue, take custom commission requests and keep each request organised from first message to delivery.",
        services: ["web-development", "ai-automation"],
      },
      {
        who: "Maritime and marine trades",
        example:
          "For example, a marine service business could log jobs, parts and customer approvals in one place, instead of across a notebook and text messages.",
        services: ["custom-software-development", "business-automation"],
      },
    ],
    examplesNote: "These scenarios are examples of what could be built and are not accounts of work already completed in Fremantle.",
    localHeading: "How Drylake works with Fremantle businesses",
    localNote:
      "Fremantle owners are often on the floor during service, so remote calls scheduled around the quiet part of the day usually work best. Drylake does not have an office in Fremantle; on-site meetings can be arranged where seeing your venue or workshop would help.",
    faqs: [
      {
        question: "Can bookings and payments work together on a website?",
        answer:
          "Yes. A booking system can take a deposit or full payment through a payment provider and confirm the booking automatically, so nothing depends on someone checking messages.",
      },
      {
        question: "We are busiest on weekends and events. Can the system cope?",
        answer:
          "Systems are designed around your busiest period, not the quiet one. Routine replies and confirmations can be automated, with anything unusual passed to a person.",
      },
    ],
    nearby: ["cockburn-central", "claremont", "cottesloe", "bibra-lake", "rockingham", "booragoon"],
  },

  rockingham: {
    seoTitle: "Rockingham Web Developer & Business Software | Drylake",
    seoDescription:
      "Drylake builds websites, quoting and scheduling software, and automations for Rockingham trades, tourism, health and growth-corridor businesses.",
    eyebrow: "Rockingham, Perth",
    headline: "A web developer and business software company for Rockingham and Baldivis.",
    intro:
      "Rockingham is a coastal city at the heart of a fast-growing southern corridor. Drylake builds the websites, scheduling tools and automations that help trades, tourism operators and health services in the area keep up with demand.",
    mixHeading: "Growth, coast and a long list of new customers",
    mix: [
      "The suburbs from Rockingham through Port Kennedy and Baldivis have added new households steadily, and that growth brings work for builders, tradies, cleaners, landscapers and health providers. Many of these businesses win work faster than they can organise it.",
      "The coast adds a second side: a foreshore, ferry access to nearby islands and a hospitality and tourism trade that peaks in summer. A defence presence nearby also supports a supply chain of engineering and service firms with their own record-keeping needs.",
    ],
    fitsHeading: "Rockingham business types and where software helps",
    fits: [
      {
        who: "Building, trade and landscaping businesses",
        example:
          "For example, a landscaping business could take photo-based quote requests online and keep each job, approval and invoice in one simple list.",
        services: ["custom-software-development", "business-automation"],
      },
      {
        who: "Tourism and hospitality operators",
        example:
          "For example, a coastal tour or hire business could show availability by date and handle seasonal bookings without a phone running all day.",
        services: ["web-development", "systems-integration"],
      },
      {
        who: "Health, fitness and wellbeing providers",
        example:
          "For example, a clinic or studio could use a customer system that tracks memberships, sessions and renewals, with reminders sent automatically.",
        services: ["custom-software-development", "ai-automation"],
      },
      {
        who: "Engineering and service firms in the supply chain",
        example:
          "For example, a small engineering firm could connect its job records to its accounting so purchase orders and invoices match without retyping.",
        services: ["systems-integration", "business-automation"],
      },
    ],
    examplesNote: "The scenarios above are examples only. None describes a project already completed in Rockingham.",
    localHeading: "How Drylake works with Rockingham businesses",
    localNote:
      "Rockingham is a good drive south of the CBD, so Drylake keeps most of the work online and avoids asking owners to travel. We work with Rockingham businesses remotely and arrange on-site time only when it is worth it.",
    faqs: [
      {
        question: "Does it matter that you are not based in Rockingham?",
        answer:
          "For the work itself, no. Websites, scheduling and automation are built and supported online, and a visit can be arranged when seeing your site or process would help.",
      },
      {
        question: "Our business is growing quickly. Is custom software too slow to build?",
        answer:
          "Custom software is delivered in stages, most useful part first, so you can start using something early and add to it as the business changes.",
      },
    ],
    nearby: ["baldivis", "port-kennedy", "kwinana", "wellard", "mandurah", "cockburn-central"],
  },

  midland: {
    seoTitle: "Midland Websites & Business Software | Drylake Perth",
    seoDescription:
      "Drylake builds websites, customer systems and automations for Midland retailers, health providers, trades and Swan Valley hospitality businesses.",
    eyebrow: "Midland, Perth",
    headline: "Websites and business software for Midland and the eastern suburbs.",
    intro:
      "Midland is the eastern metropolitan centre, with a large shopping centre, a hospital, a train line terminus and a growing business core. Drylake builds the websites and systems that help businesses in the east be found and run more smoothly.",
    mixHeading: "An eastern hub between the city and the Valley",
    mix: [
      "Midland draws customers from the eastern suburbs, the Hills and the Swan Valley. Its businesses include retailers and service providers around the town centre, health services near the hospital, and trades and suppliers in the industrial pockets nearby.",
      "That spread of customers means a lot of first contact happens online: people look for a business, compare, and message or book. The Swan Valley hospitality trade adds a seasonal side, with tastings, tours and events that need bookings to be simple.",
    ],
    fitsHeading: "Midland business types and where software helps",
    fits: [
      {
        who: "Retailers and town-centre services",
        example:
          "For example, an independent retailer could add online ordering for click-and-collect, connected to the stock list it already keeps.",
        services: ["web-development", "systems-integration"],
      },
      {
        who: "Health and care providers",
        example:
          "For example, a care or allied health provider could manage referrals, appointments and follow-ups in one place, with a person confirming anything sensitive.",
        services: ["custom-software-development", "ai-automation"],
      },
      {
        who: "Trades, suppliers and light industry",
        example:
          "For example, a supplier could track quotes and orders on a shared board that office and yard staff both update, rather than passing paper between them.",
        services: ["custom-software-development", "business-automation"],
      },
      {
        who: "Wineries, tours and event hospitality",
        example:
          "For example, a cellar door could take tasting and function bookings online with payment, and send each group a reminder before they arrive.",
        services: ["web-development", "business-automation"],
      },
    ],
    examplesNote: "These are possible builds, shown as examples. They do not refer to any project already delivered in Midland.",
    localHeading: "How Drylake works with Midland businesses",
    localNote:
      "Midland is a straightforward trip from Perth, but most owners prefer to keep meetings short, so planning and building are done online. We work with Midland businesses remotely and can meet on site by arrangement when it would help us see your process.",
    faqs: [
      {
        question: "Can you help a business that sells both in store and online?",
        answer:
          "Yes. A website can connect to the stock and sales records you already keep, so in-store and online sales draw on the same figures.",
      },
      {
        question: "What does the first conversation involve?",
        answer:
          "It is a free 30-minute consultation about how your business runs today and what is costing you time. There is no technical brief needed and no obligation to continue.",
      },
    ],
    nearby: ["midvale", "bassendean", "the-vines", "ellenbrook", "kalamunda", "forrestfield"],
  },
};

/* Share card for a standalone page: /og/locations-<slug>.png (rendered by scripts/og/render-share-cards.mjs). */
export function locationShareImage(slug: string): string {
  return `/og/locations-${slug}.png`;
}

/* The SEO entry for a standalone page, in the same shape as PAGE_SEO entries. */
export function locationPageSeo(slug: string): {
  path: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
} {
  const page = LOCATION_PAGES[slug];
  const area = findArea(slug);

  if (!page || !area) throw new Error(`locationPageSeo: no standalone page for ${slug}`);

  return {
    path: locationPath(slug),
    title: page.seoTitle,
    description: page.seoDescription,
    image: locationShareImage(slug),
    imageAlt: `Drylake: websites, software and automation for businesses in ${area.name}, Perth`,
  };
}

/*
 * Everything on the page that is specific to this area (the shared template is excluded), as
 * one string. The near-duplicate guard compares these.
 */
export function locationCopy(slug: string): string {
  const page = LOCATION_PAGES[slug];
  const area = findArea(slug);

  if (!page || !area) throw new Error(`locationCopy: no standalone page for ${slug}`);

  return [
    page.headline,
    page.intro,
    page.mixHeading,
    ...page.mix,
    page.fitsHeading,
    ...page.fits.flatMap((fit) => [fit.who, fit.example]),
    page.localHeading,
    page.localNote,
    ...page.faqs.flatMap((faq) => [faq.question, faq.answer]),
    area.context,
  ].join(" ");
}

/* Lower-cased word 3-grams: the unit of the similarity test. */
export function locationShingles(text: string, size = 3): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9' ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const shingles = new Set<string>();

  for (let index = 0; index + size <= words.length; index += 1) {
    shingles.add(words.slice(index, index + size).join(" "));
  }

  return shingles;
}

export function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  let shared = 0;

  for (const item of a) if (b.has(item)) shared += 1;

  const union = a.size + b.size - shared;

  return union === 0 ? 0 : shared / union;
}
