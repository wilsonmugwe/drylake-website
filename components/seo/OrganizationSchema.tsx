export default function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",

    "@type": "Organization",

    "@id": "https://drylake.com.au/#organization",

    name: "Drylake Pty Ltd",

    alternateName: "Drylake",

    url: "https://drylake.com.au",

    description:
      "Drylake builds operational software, automation and connected systems for Australian businesses held back by manual processes and disconnected tools.",

    email: "hello@drylake.com.au",

    telephone: "+61 420 565 457",

    identifier: {
      "@type": "PropertyValue",
      propertyID: "ABN",
      value: "70 702 662 557",
    },

    address: {
      "@type": "PostalAddress",
      addressLocality: "Perth",
      addressRegion: "Western Australia",
      addressCountry: "AU",
    },

    areaServed: {
      "@type": "Country",
      name: "Australia",
    },

    knowsAbout: [
      "Operational Software",
      "Custom Software Development",
      "Business Automation",
      "Systems Integration",
      "Workflow Automation",
      "Applied Artificial Intelligence",
      "Web Application Development",
      "Business Systems",
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
      }}
    />
  );
}