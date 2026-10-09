// Who answers for a spot in Chennai, and how to escalate.
// Zone lookup is approximate: nearest Greater Chennai Corporation zone office, not the official ward boundary.
// Every contact says where it came from; directory entries are marked for verification before use.
import type { Kind } from "@/lib/issues";

export type Verified = "official" | "directory";
export type Contact = { name: string; role: string; phone?: string; email?: string; web?: string; verified: Verified; note?: string };

type Zone = { no: number; name: string; lat: number; lng: number; officerPhone: string };

// Reference points sit near each zone's centre (approximate); phone numbers are from a public directory (thecurrentindia.com) and may be outdated.
const ZONES: Zone[] = [
  { no: 1, name: "Thiruvottiyur", lat: 13.1606, lng: 80.3006, officerPhone: "9445190001" },
  { no: 2, name: "Manali", lat: 13.1663, lng: 80.2616, officerPhone: "9445190002" },
  { no: 3, name: "Madhavaram", lat: 13.1482, lng: 80.2314, officerPhone: "9445190003" },
  { no: 4, name: "Tondiarpet", lat: 13.1262, lng: 80.2884, officerPhone: "9445190004" },
  { no: 5, name: "Royapuram", lat: 13.0935, lng: 80.2846, officerPhone: "9445190005" },
  { no: 6, name: "Thiru Vi Ka Nagar", lat: 13.1203, lng: 80.2333, officerPhone: "9445190006" },
  { no: 7, name: "Ambattur", lat: 13.1143, lng: 80.1548, officerPhone: "9445190007" },
  { no: 8, name: "Anna Nagar", lat: 13.0850, lng: 80.2101, officerPhone: "9445190008" },
  { no: 9, name: "Teynampet", lat: 13.0451, lng: 80.2510, officerPhone: "9445190009" },
  { no: 10, name: "Kodambakkam", lat: 13.0502, lng: 80.2213, officerPhone: "9445190010" },
  { no: 11, name: "Valasaravakkam", lat: 13.0403, lng: 80.1721, officerPhone: "9445190011" },
  { no: 12, name: "Alandur", lat: 12.9850, lng: 80.1900, officerPhone: "9445190012" },
  { no: 13, name: "Adyar", lat: 12.9950, lng: 80.2350, officerPhone: "9445190013" },
  { no: 14, name: "Perungudi", lat: 12.9580, lng: 80.2420, officerPhone: "9445190014" },
  { no: 15, name: "Sholinganallur", lat: 12.9010, lng: 80.2279, officerPhone: "9445190015" },
];

const REGIONS = [
  { name: "North", zones: [1, 5], phone: "9445025800" },
  { name: "Central", zones: [6, 10], phone: "9445190150" },
  { name: "South", zones: [11, 15], phone: "9445190100" },
];

const km = (aLat: number, aLng: number, bLat: number, bLng: number) =>
  Math.hypot((aLat - bLat) * 111, (aLng - bLng) * 111 * Math.cos((aLat * Math.PI) / 180));

export type Jurisdiction = {
  inGcc: boolean;
  zone?: { no: number; name: string; distanceKm: number };
  region?: string;
  contacts: Contact[];
};

export function locate(lat: number, lng: number): Jurisdiction {
  const nearest = ZONES.map((z) => ({ z, d: km(lat, lng, z.lat, z.lng) })).sort((a, b) => a.d - b.d)[0];
  const inGcc = nearest.d <= 6;
  if (!inGcc) {
    return {
      inGcc,
      contacts: [
        { name: "District Collector's office", role: "Outside Greater Chennai Corporation limits: the local body falls under the district administration", web: "https://www.tn.gov.in/district_list", verified: "official" },
        UTILITY.cpgrams,
      ],
    };
  }
  const region = REGIONS.find((r) => nearest.z.no >= r.zones[0] && nearest.z.no <= r.zones[1])!;
  return {
    inGcc,
    zone: { no: nearest.z.no, name: nearest.z.name, distanceKm: Math.round(nearest.d * 10) / 10 },
    region: region.name,
    contacts: [
      { name: `Zone ${nearest.z.no} office, ${nearest.z.name}`, role: "Zonal officer, Greater Chennai Corporation", phone: nearest.z.officerPhone, verified: "directory", note: "Phone from a public directory; may be out of date" },
      { name: `Regional Deputy Commissioner (${region.name})`, role: `Oversees zones ${region.zones[0]} to ${region.zones[1]}`, phone: region.phone, verified: "directory", note: "Phone from a public directory; may be out of date" },
      UTILITY.gccCommissioner,
    ],
  };
}

const UTILITY = {
  gcc1913: { name: "GCC helpline 1913", role: "Registers a complaint and gives a reference number", phone: "1913", web: "https://chennaicorporation.gov.in", verified: "official" },
  gccRoads: { name: "GCC Superintending Engineer (Bus Route Roads)", role: "Roads and road restoration", email: "sebrr@chennaicorporation.gov.in", verified: "directory", note: "Email from a public directory; verify before relying on it" },
  gccElectrical: { name: "GCC Superintending Engineer (Electrical)", role: "Streetlights", email: "seelectrical@chennaicorporation.gov.in", verified: "directory", note: "Email from a public directory; verify before relying on it" },
  gccCommissioner: { name: "Commissioner, Greater Chennai Corporation", role: "Ripon Building, Chennai 600003", phone: "04425381330", email: "commissioner@chennaicorporation.gov.in", verified: "official" },
  cmwssb: { name: "Chennai Metrowater (CMWSSB)", role: "Water supply, sewers and their trenches", phone: "1916", web: "https://cmwssb.tn.gov.in", verified: "official" },
  tnpdcl: { name: "TNPDCL complaints", role: "Power cuts and damaged cables; ask for a complaint number", phone: "1912", web: "https://www.tnpdcl.org", verified: "directory", note: "1912 is widely published; Minnagam (94987 94987) also takes complaints" },
  cmrl: { name: "Chennai Metro Rail (CMRL)", role: "Metro construction sites and their diversions", web: "https://chennaimetrorail.org", verified: "official" },
  cpgrams: { name: "CPGRAMS", role: "Central grievance portal, for escalation when local channels fail", web: "https://pgportal.gov.in", verified: "official" },
} satisfies Record<string, Contact>;

// Which department owns what, per kind of issue.
export function departments(kind: Kind | "notice"): Contact[] {
  switch (kind) {
    case "pothole": return [UTILITY.gcc1913, UTILITY.gccRoads];
    case "waterlogging": return [UTILITY.gcc1913, UTILITY.cmwssb];
    case "worksite": return [UTILITY.gcc1913, UTILITY.gccRoads, UTILITY.cmwssb, UTILITY.cmrl];
    case "outage": return [UTILITY.tnpdcl, UTILITY.gccElectrical];
    default: return [UTILITY.gcc1913, UTILITY.cmwssb, UTILITY.tnpdcl];
  }
}

export type Step = { day: number; who: string; action: string };

// An escalation ladder, counted from the first report. Times are this project's suggestion, not statutory deadlines.
export function ladder(kind: Kind, j: Jurisdiction): Step[] {
  const zone = j.zone ? `Zone ${j.zone.no} (${j.zone.name})` : "the local body";
  if (kind === "outage") {
    return [
      { day: 0, who: "TNPDCL 1912", action: "Register the outage and note the complaint number" },
      { day: 0, who: "The digging agency and " + zone, action: "If works are nearby, report a possible cable strike with the evidence pack" },
      { day: 1, who: "TNPDCL section office", action: "Ask the Assistant Engineer for the cause and restoration time" },
      { day: 3, who: "CPGRAMS", action: "Escalate with the complaint number if supply is still disrupted" },
    ];
  }
  return [
    { day: 0, who: "GCC 1913 and " + zone, action: "Register the complaint and keep the reference number" },
    { day: 3, who: j.region ? `Regional Deputy Commissioner (${j.region})` : "District Collector", action: "Escalate with the reference number and this record's link" },
    { day: 7, who: "Commissioner, GCC", action: "Email with the full history attached" },
    { day: 15, who: "CPGRAMS, or an RTI application", action: "Ask for the work order, completion and restoration records" },
  ];
}

// A Right to Information request asking for the records the evidence gap is about.
export function rtiDraft(opts: { agency: string; reference?: string | null; place: string; lat: number; lng: number; pageUrl: string }) {
  return [
    "To,",
    `The Public Information Officer, ${opts.agency}`,
    "",
    "Subject: Request for information under Section 6(1) of the Right to Information Act, 2005",
    "",
    "Sir/Madam,",
    "",
    `Please provide the following information about road excavation at ${opts.place} (${opts.lat.toFixed(5)}, ${opts.lng.toFixed(5)})${opts.reference ? `, permission reference ${opts.reference}` : ""}:`,
    "",
    "1. A copy of the road-cutting permission, including its validity period and restoration conditions.",
    "2. The date the work was completed and a copy of the completion record.",
    "3. Details of the road restoration carried out, the agency responsible for it, and its date.",
    "4. Any inspection report made after restoration.",
    "",
    `The public record behind this request: ${opts.pageUrl}`,
    "",
    "I enclose the application fee of Rs 10. I am a citizen of India.",
    "",
    "Yours faithfully,",
    "[Your name and address]",
  ].join("\n");
}
