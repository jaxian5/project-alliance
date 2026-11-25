export type Country = { iso: string; name: string };

export const COUNTRIES: readonly Country[] = [
  { iso: "br", name: "Brazil" },
  { iso: "jp", name: "Japan" },
  { iso: "fr", name: "France" },
  { iso: "mx", name: "Mexico" },
  { iso: "us", name: "United States" },
  { iso: "gb", name: "United Kingdom" },
  { iso: "de", name: "Germany" },
  { iso: "it", name: "Italy" },
  { iso: "es", name: "Spain" },
  { iso: "pt", name: "Portugal" },
  { iso: "cn", name: "China" },
  { iso: "in", name: "India" },
  { iso: "ru", name: "Russia" },
  { iso: "ca", name: "Canada" },
  { iso: "au", name: "Australia" },
  { iso: "kr", name: "South Korea" },
  { iso: "za", name: "South Africa" },
  { iso: "eg", name: "Egypt" },
  { iso: "tr", name: "Turkey" },
  { iso: "sa", name: "Saudi Arabia" },
  { iso: "ar", name: "Argentina" },
  { iso: "se", name: "Sweden" },
  { iso: "no", name: "Norway" },
  { iso: "pl", name: "Poland" },
  { iso: "nl", name: "Netherlands" },
  { iso: "gr", name: "Greece" },
  { iso: "ua", name: "Ukraine" },
  { iso: "id", name: "Indonesia" },
  { iso: "th", name: "Thailand" },
  { iso: "vn", name: "Vietnam" },
  { iso: "ng", name: "Nigeria" },
  { iso: "ke", name: "Kenya" },
  { iso: "nz", name: "New Zealand" },
  { iso: "ch", name: "Switzerland" },
  { iso: "at", name: "Austria" },
  { iso: "ie", name: "Ireland" },
  { iso: "fi", name: "Finland" },
  { iso: "dk", name: "Denmark" },
  { iso: "be", name: "Belgium" },
  { iso: "cl", name: "Chile" },
  { iso: "co", name: "Colombia" },
  { iso: "pe", name: "Peru" },
];

const byIso = new Map(COUNTRIES.map((c) => [c.iso, c]));

export function countryByIso(iso: string): Country | undefined {
  return byIso.get(iso);
}
