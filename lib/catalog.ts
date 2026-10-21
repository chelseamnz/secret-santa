// Wrapping papers, bows and "from the heart" ideas. Slugs match the image
// files in /public/assets and the values stored in boxes.paper / boxes.bow.

export type Option = { slug: string; label: string };

export const PAPERS: Option[] = [
  { slug: "pine-poinsettia", label: "Pine poinsettia" },
  { slug: "blue-stripe-holly", label: "Blue stripe holly" },
  { slug: "kraft-mistletoe", label: "Kraft mistletoe" },
  { slug: "forest-poinsettia", label: "Forest poinsettia" },
  { slug: "robin-blue", label: "Robin blue" },
  { slug: "cream-toile", label: "Cream toile" },
  { slug: "pink-harlequin", label: "Pink harlequin" },
  { slug: "blue-damask", label: "Blue damask" },
  { slug: "toile-landscape", label: "Toile landscape" },
  { slug: "retro-ribbons", label: "Retro ribbons" },
  { slug: "ski-dogs", label: "Ski dogs" },
  { slug: "pink-poodles", label: "Pink poodles" },
  { slug: "santas-workshop", label: "Santa's workshop" },
  { slug: "peach-lattice", label: "Peach lattice" },
  { slug: "olive-bows", label: "Olive bows" },
  { slug: "holly-sprig", label: "Holly sprig" },
  { slug: "vintage-party", label: "Vintage party" },
  { slug: "green-ribbons", label: "Green ribbons" },
];

export const BOWS: Option[] = [
  { slug: "red-velvet", label: "Red velvet" },
  { slug: "brown-ribbon", label: "Brown ribbon" },
  { slug: "brown-satin", label: "Brown satin" },
  { slug: "tartan", label: "Tartan" },
  { slug: "cornflower", label: "Cornflower" },
  { slug: "royal-blue", label: "Royal blue" },
  { slug: "burnt-orange", label: "Burnt orange" },
  { slug: "gilded-red", label: "Gilded red" },
  { slug: "ivory-lace", label: "Ivory lace" },
  { slug: "gold-lace", label: "Gold lace" },
  { slug: "floral", label: "Floral" },
  { slug: "black-damask", label: "Black damask" },
  { slug: "santa-red", label: "Santa red" },
  { slug: "candy-cane", label: "Candy cane" },
  { slug: "pink-pearl", label: "Pink pearl" },
  { slug: "blush-satin", label: "Blush satin" },
  { slug: "plum-velvet", label: "Plum velvet" },
  { slug: "green-velvet", label: "Green velvet" },
];

export const HEART_IDEAS: Option[] = [
  { slug: "letter", label: "A handwritten letter" },
  { slug: "drawing", label: "A drawing or painting" },
  { slug: "treats", label: "Homemade treats" },
  { slug: "crafted", label: "Something crafted" },
  { slug: "song", label: "A song or video" },
  { slug: "time", label: "Time together" },
];

export const isPaper = (s: string) => PAPERS.some((p) => p.slug === s);
export const isBow = (s: string) => BOWS.some((b) => b.slug === s);
export const paperLabel = (s: string) => PAPERS.find((p) => p.slug === s)?.label ?? s;
export const bowLabel = (s: string) => BOWS.find((b) => b.slug === s)?.label ?? s;

/** A different starting look per person, so untouched boxes don't all match. */
export function defaultLook(index: number) {
  return {
    paper: PAPERS[(index * 5) % PAPERS.length].slug,
    bow: BOWS[(index * 7 + 9) % BOWS.length].slug,
  };
}

export const LETTER_MAX_WORDS = 1000;
export const countWords = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

const WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen",
  "nineteen", "twenty",
];
/** 3 → "three". Falls back to digits above twenty. */
export const numberWord = (n: number) => WORDS[n] ?? String(n);
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** ["A","B","C"] → "A, B and C" */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function formatPeso(n: number) {
  return `₱${n.toLocaleString("en-US")}`;
}
