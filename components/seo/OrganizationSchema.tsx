export default function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://drylake.com.au/#organization",

    name: "Drylake Pty Ltd",
    alternateName: "Drylake",

    url: "https://drylake.com.au",

    slogan: "Tomorrow Starts Here.",

    description:
      "Drylake builds practical software, automation and technical systems for businesses in Perth and across Australia.",

    identifier: {
      "@type": "PropertyValue",
      propertyID: "ABN",
      value: "70 702 662 557",
    },

    address: {
      "@type": "PostalAddress",
      addressLocality: "Perth",
      addressRegion: "WA",
      addressCountry: "AU",
    },

    areaServed: {
      "@type": "Country",
      name: "Australia",
    },

    knowsAbout: [
      "Custom Software Development",
      "Business Automation",
      "Systems Integration",
      "Technical Systems",
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