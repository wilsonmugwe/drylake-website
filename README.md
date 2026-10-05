Drylake

Tomorrow Starts Here.

The official digital platform for Drylake Pty Ltd, an Australian technology company building intelligent software, AI systems, automation and integrated digital solutions around real business problems.

Website: drylake.com.au

⸻

About Drylake

Drylake works with businesses to identify operational problems, inefficiencies and opportunities where technology can create measurable value.

Rather than starting with a particular technology, Drylake takes a problem-first approach — understanding the business challenge before determining the appropriate combination of software, automation, AI or systems integration.

Our focus is simple:

Understand the problem. Build the right solution. Create measurable impact.

⸻

Brand Principles

Drylake is built around three core values:

1. Innovation — applying technology intelligently rather than for its own sake.
2. Integrity — building trustworthy systems and long-term business relationships.
3. Impact — focusing on solutions that create meaningful business outcomes.

⸻

Platform Purpose

The Drylake website is more than a marketing site.

It serves as the company’s primary digital presence and is being developed as the foundation of Drylake’s client-facing technology platform.

The platform is designed to:

* Clearly communicate what Drylake does
* Explain Drylake’s problem-first approach
* Generate qualified project enquiries
* Support client relationships
* Provide secure client access
* Provide internal administrative capabilities
* Support SEO and future marketing campaigns
* Establish a strong and consistent technology brand
* Provide a foundation for future Drylake products and services
* Work exceptionally well across desktop and mobile devices

⸻

Core Capabilities

Drylake currently presents four primary capability areas.

AI & Intelligent Systems

AI-powered systems designed around practical business use cases, including intelligent workflows, assistants, analysis and decision-support systems.

Business Automation

Automation of repetitive processes, operational workflows and manual business tasks to improve efficiency and reduce unnecessary administrative work.

Custom Software

Purpose-built web applications, internal platforms, portals and digital systems designed around specific business requirements.

Systems Integration

Connecting existing platforms, APIs, services and business systems so information and workflows can operate more effectively across an organisation.

The capability architecture is intentionally extensible and can evolve as Drylake grows.

⸻

Platform Architecture

The Drylake platform currently consists of several major areas.

Public Website

The public-facing website communicates the Drylake brand, capabilities and approach.

Primary routes include:

/
├── /solutions
├── /about
├── /contact
└── /privacy

The public website is designed primarily around:

Discover → Understand → Trust → Contact

⸻

Client Portal

Authenticated Drylake clients have access to a dedicated client environment.

/client

The client portal is intended to become the central digital interface between Drylake and its clients.

Depending on implemented functionality, it may provide access to:

* Projects
* Project status
* Deliverables
* Documents
* Activity
* Client information
* Relevant actions and communication

The portal should maintain the same visual identity as the public Drylake website while providing a more application-focused experience.

⸻

Admin Portal

Drylake administrators have access to a protected internal administration environment.

/admin

The admin portal supports the management of Drylake’s client and project environment.

Administrative access must be protected through both authentication and server-side authorization.

Client users must never be able to access administrative data or functionality.

⸻

Authentication & Authorization

Authentication is handled using Clerk.

The platform distinguishes between:

* Public visitors
* Authenticated clients
* Drylake administrators

Authentication determines who the user is.

Authorization determines what that user is permitted to access.

Administrative routes and data must therefore be protected server-side and must never rely exclusively on frontend navigation or UI restrictions.

⸻

Lead Generation

The primary conversion journey for the public website is:

Homepage
   ↓
Contact
   ↓
Project Enquiry
   ↓
Validation
   ↓
Security Verification
   ↓
Server Processing
   ↓
Success

A submission must only display a successful state after the backend confirms that the enquiry was processed successfully.

Failed submissions must never produce a false success state.

⸻

Contact Form Security

The contact system uses Cloudflare Turnstile to help protect public forms against automated abuse.

The expected verification flow is:

Visitor
   ↓
Contact Form
   ↓
Turnstile Challenge
   ↓
Turnstile Token
   ↓
Drylake API
   ↓
Server-side Turnstile Verification
   ↓
Process Enquiry

Turnstile must be validated server-side.

Invalid, expired or missing verification tokens must not be treated as successful submissions.

⸻

SEO

The website includes technical SEO foundations for future organic growth.

SEO considerations include:

* Page-specific metadata
* Canonical URLs
* Open Graph metadata
* Social sharing images
* Twitter/X metadata
* robots.txt
* XML sitemap
* Structured data
* Semantic heading structure
* Internal linking
* Image alternative text
* Mobile responsiveness
* Crawlability and indexing controls

Private client and administrative areas should not be treated as public search content.

⸻

Analytics

Production analytics are provided through Vercel Analytics.

Analytics will be used to understand:

* Website traffic
* Page engagement
* Visitor journeys
* Contact conversions
* Marketing performance

The analytics implementation can expand as Drylake’s marketing and acquisition strategy develops.

⸻

Technology Stack

The platform currently uses:

* Next.js
* React
* TypeScript
* Tailwind CSS
* Motion
* Lucide React
* Clerk
* Supabase
* Cloudflare Turnstile
* Vercel
* Vercel Analytics

Additional infrastructure and integrations can be introduced as platform requirements evolve.

⸻

Design Direction

Drylake uses a dark, minimal and technology-focused visual identity.

Core design principles include:

* Black/dark foundations
* Strong typography
* Restrained use of colour
* Clear hierarchy
* Generous but intentional spacing
* Subtle motion
* High-quality interaction design
* Consistent border and card treatments
* Responsive layouts
* Minimal visual noise

The public website, authentication experience, client portal and admin portal should feel like parts of the same Drylake ecosystem.

Avoid generic SaaS styling that conflicts with the Drylake brand.

⸻

Project Structure

The structure below represents the general architecture of the application and should be updated as the platform evolves.

drylake-website/
│
├── app/
│   ├── about/
│   ├── admin/
│   ├── client/
│   ├── contact/
│   ├── privacy/
│   ├── solutions/
│   ├── sign-in/
│   ├── sign-up/
│   ├── api/
│   ├── globals.css
│   ├── layout.tsx
│   ├── not-found.tsx
│   └── page.tsx
│
├── components/
│   ├── layout/
│   ├── sections/
│   ├── seo/
│   └── ui/
│
├── lib/
│   ├── auth/
│   ├── supabase/
│   └── ...
│
├── public/
│   ├── brand/
│   └── images/
│
├── middleware.ts
├── next.config.ts
├── package.json
└── README.md

Exact directories may change as the platform develops.

⸻

Development

Install dependencies:

npm install

Start the development server:

npm run dev

Run a production build before pushing significant changes:

npm run build

The production build must pass before changes are considered deployment-ready.

⸻

Environment Configuration

The application relies on external services and therefore requires environment variables.

These may include configuration for:

* Clerk
* Supabase
* Cloudflare Turnstile
* Contact/email infrastructure
* Other production integrations

Environment secrets must never be committed to the repository.

Use local environment configuration during development and secure environment variables within the deployment platform for production.

⸻

Development Standards

All contributions should:

* Use TypeScript correctly
* Pass the production build
* Preserve responsive behaviour
* Follow the existing Drylake design language
* Avoid unnecessary dependencies
* Maintain accessibility
* Protect private routes server-side
* Validate untrusted input
* Avoid exposing secrets to the client
* Preserve existing working functionality
* Handle loading, empty, error and success states correctly

Major architectural or visual changes should be discussed before implementation.

⸻

Pre-Deployment Checklist

Before production deployment, verify:

* Production build passes
* No TypeScript errors
* No unexpected browser console errors
* Authentication works
* Client authorization works
* Admin authorization works
* Protected routes cannot be accessed improperly
* Contact form works
* Turnstile verification works
* Failed contact requests display errors
* Successful contact requests display success
* Mobile layouts work correctly
* Desktop layouts work correctly
* Metadata is correct
* Canonical URLs are correct
* Sitemap is accessible
* Robots configuration is correct
* Social sharing metadata works
* No secrets are committed to the repository

⸻

Current Priorities

Current development priorities include:

1. Production-ready client portal
2. Production-ready admin portal
3. Authentication and authorization verification
4. Contact form and Turnstile reliability
5. Conversion journey testing
6. Technical SEO verification
7. Branded error and system states
8. Continued responsive and accessibility improvements

⸻

Company

Drylake Pty Ltd

ABN: 70 702 662 557

Australia

Tomorrow Starts Here.

⸻

© Drylake Pty Ltd. All rights reserved.