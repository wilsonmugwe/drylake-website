/*
 * Perth metro service areas: the registry behind the /perth directory and the
 * /locations/[slug] pages. PURE data and types (tests import it directly).
 *
 * Honesty rules (owner decision D-B, 2026-10-16):
 *   - Drylake is a remote and service-area business based in Perth. It has NO office,
 *     storefront or premises in any suburb listed here, and no page may imply one.
 *   - The context lines are well-established geography and commercial character only.
 *     Where a fact was not certain it is left generic ("residential suburb with local
 *     shopping centres") rather than guessed. Nothing here claims clients, projects or
 *     results in an area.
 *   - Only areas in STANDALONE_AREA_SLUGS get their own page, and only once
 *     lib/service-area-pages.ts holds genuinely distinct content for them. Everything else
 *     is listed in the /perth directory (anchor `#area-<slug>`). Promoting an area means
 *     writing its distinct content and adding its slug to STANDALONE_AREA_SLUGS; nothing else.
 */

export type AreaRegion = "central" | "north" | "east" | "south-east" | "south" | "coastal" | "peel";

export type AreaType = "commercial" | "industrial" | "residential" | "additional";

export const AREA_REGIONS: Record<AreaRegion, { label: string; blurb: string }> = {
  central: { label: "Central Perth", blurb: "The CBD and the inner suburbs around it." },
  north: { label: "Northern suburbs", blurb: "From Balcatta and Osborne Park up to Joondalup, Wanneroo and Yanchep." },
  coastal: { label: "Coastal and western suburbs", blurb: "Fremantle, the beach suburbs and the western river suburbs." },
  east: { label: "Eastern suburbs and the Hills", blurb: "Midland, Bayswater, the airport precinct and the Perth Hills." },
  "south-east": { label: "South-eastern suburbs", blurb: "Canning, Gosnells and Armadale and the growth suburbs around them." },
  south: { label: "Southern suburbs and Rockingham corridor", blurb: "Cockburn, Kwinana and Rockingham, down to Baldivis." },
  peel: { label: "Peel", blurb: "Mandurah and the Peel region south of Perth." },
};

export const AREA_TYPES: Record<AreaType, { label: string; blurb: string }> = {
  commercial: { label: "Commercial and office centres", blurb: "Offices, professional services, retail and hospitality." },
  industrial: { label: "Industrial and trade hubs", blurb: "Trades, wholesale, manufacturing, logistics and supply." },
  residential: { label: "Residential and growing business areas", blurb: "Local services, home-based and growing small businesses." },
  additional: { label: "Additional priority areas", blurb: "Major centres and coastal cities beyond the core groups." },
};

export type ServiceArea = {
  slug: string;
  name: string;
  region: AreaRegion;
  type: AreaType;
  /** Short, well-established commercial character. Generic when unsure. */
  context: string;
  /** One of the 35 areas the owner named as mandatory (D-B). */
  mandatory: boolean;
};

type Row = [slug: string, name: string, region: AreaRegion, type: AreaType, mandatory: boolean, context: string];

const ROWS: Row[] = [
  // Commercial and office centres
  ["perth-cbd", "Perth CBD", "central", "commercial", true, "The city centre: head offices, professional services, government, retail and hospitality, with a large daytime working population."],
  ["west-perth", "West Perth", "central", "commercial", true, "An office precinct on the western edge of the CBD, home to professional firms, resource sector offices and medical practices."],
  ["east-perth", "East Perth", "central", "commercial", true, "An inner-city mix of offices, apartments and riverside developments close to the CBD and the Swan River."],
  ["subiaco", "Subiaco", "central", "commercial", true, "An inner-western centre with a busy retail and dining strip, professional offices and health services."],
  ["leederville", "Leederville", "central", "commercial", true, "A village-style centre on Oxford Street with cafes, hospitality, small offices and creative businesses."],
  ["south-perth", "South Perth", "central", "commercial", true, "A riverside suburb facing the CBD, with offices, hospitality, apartments and the Mends Street precinct."],
  ["joondalup", "Joondalup", "north", "commercial", true, "The northern regional city centre, with a university campus, a major hospital, a large shopping centre and many professional offices."],
  ["midland", "Midland", "east", "commercial", true, "The eastern metropolitan centre, with a large shopping centre, a hospital, the train line terminus and a growing business core."],
  ["fremantle", "Fremantle", "coastal", "commercial", true, "A historic port city with maritime businesses, markets, hospitality, tourism and a strong creative and small-business community."],

  // Industrial and trade hubs
  ["osborne-park", "Osborne Park", "north", "industrial", true, "A large commercial and light-industrial precinct north of the CBD, mixing trade suppliers, wholesalers, showrooms and offices."],
  ["malaga", "Malaga", "north", "industrial", true, "A major northern industrial area with manufacturers, warehousing, trade suppliers and distribution businesses."],
  ["wangara", "Wangara", "north", "industrial", true, "A northern industrial and logistics area with warehouses, manufacturers and trade businesses close to the Joondalup corridor."],
  ["welshpool", "Welshpool", "east", "industrial", true, "An established industrial area in the south-east of the inner metro, with manufacturing, wholesale, engineering and logistics businesses."],
  ["kewdale", "Kewdale", "east", "industrial", true, "An industrial and freight area beside the airport precinct, with logistics, warehousing and transport businesses."],
  ["bibra-lake", "Bibra Lake", "south", "industrial", true, "A southern suburb with light-industrial and trade areas alongside lakeside residential streets in the City of Cockburn."],
  ["balcatta", "Balcatta", "north", "industrial", true, "A northern suburb with a sizeable industrial and commercial area used by trades, suppliers and small manufacturers."],
  ["maddington", "Maddington", "south-east", "industrial", true, "A south-eastern suburb with an industrial area, a retail centre and a long-established base of local trades and services."],
  ["bayswater", "Bayswater", "east", "industrial", true, "An inner north-eastern suburb with a town centre, a rail junction and pockets of light industry and trade businesses."],

  // Residential and growing business areas
  ["baldivis", "Baldivis", "south", "residential", true, "A fast-growing southern suburb of young households, with a growing number of local services and home-based businesses."],
  ["canning-vale", "Canning Vale", "south-east", "residential", true, "A south-eastern suburb pairing large residential estates with a substantial industrial and commercial area, including the Perth Markets."],
  ["dianella", "Dianella", "north", "residential", true, "An established north-eastern suburb with local shopping centres, health services and many home-based and neighbourhood businesses."],
  ["the-vines", "The Vines", "east", "residential", true, "A residential estate in the Swan Valley area, known for its golf course and resort, with a lifestyle and hospitality character."],
  ["ellenbrook", "Ellenbrook", "east", "residential", true, "A large north-eastern growth suburb in the City of Swan with a town centre and a steadily growing local business base."],
  ["thornlie", "Thornlie", "south-east", "residential", true, "A south-eastern residential suburb with a local shopping centre, a rail line and some light industry."],
  ["morley", "Morley", "north", "residential", true, "A major north-eastern activity centre built around a large shopping centre, with a broad mix of retail, services and offices."],
  ["gosnells", "Gosnells", "south-east", "residential", true, "A south-eastern suburb and civic centre with a town centre, local retail and light-industrial areas."],
  ["willetton", "Willetton", "south-east", "residential", true, "An established residential suburb in the City of Canning with local shopping centres and many home-based and neighbourhood businesses."],
  ["byford", "Byford", "south-east", "residential", true, "A growing outer south-eastern town on the edge of the Perth Hills, with new housing estates and a developing local business base."],

  // Additional priority areas
  ["wanneroo", "Wanneroo", "north", "additional", true, "The long-established centre of the City of Wanneroo, surrounded by market gardens and fast-growing housing estates."],
  ["cockburn-central", "Cockburn Central", "south", "additional", true, "A strategic centre in the south with a train station, a town centre, retail, offices and a major recreation precinct."],
  ["rockingham", "Rockingham", "south", "additional", true, "A coastal city south of Perth with a foreshore, a city centre, tourism and hospitality, and a defence presence at nearby Garden Island."],
  ["mandurah", "Mandurah", "peel", "additional", true, "The largest city in the Peel region, built around an estuary and canals, with tourism, hospitality, retail and a growing services sector."],
  ["scarborough", "Scarborough", "coastal", "additional", true, "A beachside suburb with hospitality, tourism, short-stay accommodation and a redeveloping foreshore."],
  ["victoria-park", "Victoria Park", "central", "additional", true, "An inner south-eastern suburb known for the Albany Highway strip of cafes, independent retailers and professional services."],
  ["armadale", "Armadale", "south-east", "additional", true, "The south-eastern city centre at the foot of the Perth Hills, with a large shopping centre, a hospital and government services."],

  // Expansion: further genuine metro service areas
  ["northbridge", "Northbridge", "central", "commercial", false, "The inner-city entertainment and dining district beside the CBD, with hospitality venues, small businesses and the Perth Cultural Centre."],
  ["burswood", "Burswood", "central", "commercial", false, "A riverside peninsula with a casino and hotel complex, a major stadium, hospitality and apartment developments."],
  ["nedlands", "Nedlands", "central", "commercial", false, "A western suburb beside the university campus and the Queen Elizabeth II Medical Centre, with health, education and professional services."],
  ["claremont", "Claremont", "coastal", "commercial", false, "An established western suburb with a boutique shopping centre, the showgrounds, professional services and hospitality."],
  ["cottesloe", "Cottesloe", "coastal", "additional", false, "A beachside suburb with hospitality, tourism, small retailers and professional services."],
  ["applecross", "Applecross", "central", "residential", false, "A riverside residential suburb near Canning Bridge, with local shops, professional services and home-based businesses."],
  ["booragoon", "Booragoon", "south", "commercial", false, "A southern river suburb centred on a large shopping centre, with retail, offices and health services."],
  ["wembley", "Wembley", "coastal", "residential", false, "An established western suburb with local shops, professional services and many neighbourhood and home-based businesses."],
  ["stirling", "Stirling", "north", "commercial", false, "A northern strategic centre on the rail line, with offices, civic services and commercial premises along the main roads."],
  ["innaloo", "Innaloo", "north", "commercial", false, "A northern retail and commercial area with a large shopping centre, showrooms and bulky-goods retailers."],
  ["karrinyup", "Karrinyup", "coastal", "residential", false, "A northern coastal suburb with a shopping centre, a golf club and a mix of professional and neighbourhood services."],
  ["hillarys", "Hillarys", "coastal", "residential", false, "A northern coastal suburb with a boat harbour, hospitality, tourism and a large nearby shopping centre."],
  ["kingsley", "Kingsley", "north", "residential", false, "A northern residential suburb with local shopping centres and many home-based and neighbourhood businesses."],
  ["mirrabooka", "Mirrabooka", "north", "commercial", false, "A northern regional centre built around a shopping square, with retail, services, community organisations and light commercial premises."],
  ["clarkson", "Clarkson", "north", "residential", false, "A northern coastal-corridor suburb with a train station, a local centre and a growing number of local services."],
  ["butler", "Butler", "north", "residential", false, "A northern growth suburb on the rail line, with new housing estates and a growing local business base."],
  ["yanchep", "Yanchep", "north", "residential", false, "A far-northern coastal growth area with new housing, a train station and a developing town centre."],
  ["belmont", "Belmont", "east", "commercial", false, "An inner eastern suburb near the airport and the racecourse, with a shopping centre, offices, light industry and trade businesses."],
  ["bentley", "Bentley", "central", "commercial", false, "An inner south-eastern suburb home to a university campus and a technology park, with education, research and professional services."],
  ["cannington", "Cannington", "south-east", "commercial", false, "A south-eastern centre with a large shopping centre, light industry, trade suppliers and professional services."],
  ["myaree", "Myaree", "south", "industrial", false, "A southern commercial and light-industrial area along Leach Highway, with trade suppliers, showrooms and service businesses."],
  ["oconnor", "O'Connor", "south", "industrial", false, "A southern light-industrial and commercial area with trade businesses, service providers and small manufacturers."],
  ["success", "Success", "south", "residential", false, "A southern residential suburb in the City of Cockburn, with local shopping, services and home-based businesses."],
  ["aubin-grove", "Aubin Grove", "south", "residential", false, "A southern residential suburb in the City of Cockburn with a train station, local shops and neighbourhood businesses."],
  ["jandakot", "Jandakot", "south", "industrial", false, "A southern suburb around the Jandakot airport, with aviation, light industry, trade and commercial businesses."],
  ["harrisdale", "Harrisdale", "south-east", "residential", false, "A south-eastern growth suburb of newer housing estates, with local services and home-based businesses."],
  ["piara-waters", "Piara Waters", "south-east", "residential", false, "A south-eastern growth suburb of newer housing estates, with a developing local business base."],
  ["kelmscott", "Kelmscott", "south-east", "residential", false, "A south-eastern suburb in the City of Armadale, with a town centre, a train station and local services."],
  ["beckenham", "Beckenham", "south-east", "residential", false, "A south-eastern suburb with a train station, local shops and small businesses close to the Canning and Gosnells areas."],
  ["kenwick", "Kenwick", "south-east", "industrial", false, "A south-eastern suburb with industrial and logistics land alongside residential streets."],
  ["kalamunda", "Kalamunda", "east", "commercial", false, "The main town centre in the Perth Hills, with local retail, hospitality, tourism and professional services."],
  ["forrestfield", "Forrestfield", "east", "industrial", false, "An eastern suburb near the airport and the Hills, with a sizeable industrial area, trade businesses and a rail link."],
  ["midvale", "Midvale", "east", "industrial", false, "An eastern suburb beside Midland, with industrial land, trade businesses and local services."],
  ["bassendean", "Bassendean", "east", "commercial", false, "An older riverside town centre in the east, with independent retailers, hospitality and local services."],
  ["kwinana", "Kwinana", "south", "industrial", false, "A southern city with a major heavy-industrial area on the coast, alongside a town centre and residential suburbs."],
  ["henderson", "Henderson", "south", "industrial", false, "A southern coastal industrial area, home to a marine and shipbuilding precinct and engineering and fabrication businesses."],
  ["wellard", "Wellard", "south", "residential", false, "A southern growth suburb in the Kwinana area with a train station and newer housing estates."],
  ["port-kennedy", "Port Kennedy", "south", "residential", false, "A southern coastal suburb in the City of Rockingham, with local shopping and neighbourhood businesses."],
];

export const SERVICE_AREAS: readonly ServiceArea[] = ROWS.map(([slug, name, region, type, mandatory, context]) => ({
  slug,
  name,
  region,
  type,
  mandatory,
  context,
}));

export const MANDATORY_AREA_SLUGS: readonly string[] = SERVICE_AREAS.filter((area) => area.mandatory).map((area) => area.slug);

/*
 * Areas with their own page. Each slug here MUST have distinct content in
 * lib/service-area-pages.ts (a test enforces both directions and a near-duplicate guard).
 */
export const STANDALONE_AREA_SLUGS: readonly string[] = [
  "osborne-park",
  "malaga",
  "canning-vale",
  "west-perth",
  "joondalup",
  "fremantle",
  "rockingham",
  "midland",
];

export const LOCATIONS_BASE = "/locations";

export function locationPath(slug: string): string {
  return `${LOCATIONS_BASE}/${slug}`;
}

export function findArea(slug: string): ServiceArea | undefined {
  return SERVICE_AREAS.find((area) => area.slug === slug);
}

export function isStandalone(slug: string): boolean {
  return STANDALONE_AREA_SLUGS.includes(slug);
}

/* Where a link to this area goes: its own page, or its entry in the /perth directory. */
export function areaHref(area: Pick<ServiceArea, "slug">): string {
  return isStandalone(area.slug) ? locationPath(area.slug) : `/perth#area-${area.slug}`;
}
