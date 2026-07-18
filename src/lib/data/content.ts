import type { Artist, Offer, Partner, GalleryItem, Faq } from "@/types";

/* Real artists & guests from past 2BHK nights (see /public/past-highlights) */
export const artists: Artist[] = [
  { id: "orry", name: "ORRY", genre: "Holi Affair", hue: 130 },
  { id: "omen", name: "OMEN", genre: "Red Box / Valentines", hue: 358 },
  { id: "a-yo", name: "A-YO", genre: "Elegance Unleashed", hue: 48 },
  { id: "i-am-hrx", name: "I AM HRX", genre: "XOXO", hue: 330 },
  { id: "pro-bros", name: "Pro Bros", genre: "Beyond Imagination", hue: 215 },
  { id: "lemon", name: "LEMON", genre: "Flirt After Dark", hue: 355 },
  { id: "kawal", name: "KAWAL", genre: "Opulent Fridays", hue: 190 },
  { id: "sorab-bedi", name: "Sorab Bedi", genre: "Starry Haven", hue: 42 },
  { id: "kunal-pillay", name: "Kunal Pillay", genre: "Starry Haven", hue: 44 },
  { id: "deeptanshu-saini", name: "Deeptanshu Saini", genre: "Reset Sundays", hue: 28 },
  { id: "sd-style", name: "SD Style", genre: "Reset Sundays", hue: 30 },
  { id: "kade", name: "KADE", genre: "Red Box / Reset", hue: 0 },
];

export const offers: Offer[] = [
  {
    id: "ladies-night",
    title: "Ladies Night",
    detail: "Every Wednesday — free entry and two complimentary cocktails for women before midnight.",
    tag: "Weekly",
  },
  {
    id: "early-bird",
    title: "Early Bird Pricing",
    detail: "Up to 40% off ticket prices when you book at least a week before the event.",
    tag: "Always on",
  },
  {
    id: "bday-booth",
    title: "Birthday Booth",
    detail: "Booths of 6+ on your birthday week get a complimentary cake, sparklers and a shout-out from the booth.",
    tag: "Celebrations",
  },
  {
    id: "festive",
    title: "Festive Specials",
    detail: "Holi, Diwali and NYE takeovers with limited-run passes, themed rooms and guest headliners.",
    tag: "Seasonal",
  },
];

export const partners: Partner[] = [
  { id: "don-julio", name: "Don Julio" },
  { id: "jagermeister", name: "Jägermeister" },
  { id: "corona", name: "Corona" },
  { id: "heineken", name: "Heineken" },
  { id: "johnnie-walker", name: "Johnnie Walker" },
  { id: "maka-zai", name: "Maka Zai" },
  { id: "budweiser", name: "Budweiser" },
];

/* Stock photos for now (Unsplash, free licence) — swap for the club's own
   media / Instagram feed when the client sends it. */
export const gallery: GalleryItem[] = [
  { id: "crowd-lights", caption: "Confetti drop, main room", hue: 200, ratio: "portrait", image: "/gallery/crowd-lights.jpg" },
  { id: "whisky-pour", caption: "Old fashioned, done properly", hue: 35, ratio: "square", image: "/gallery/whisky-pour.jpg" },
  { id: "stage-lasers", caption: "Lasers over the floor", hue: 340, ratio: "wide", image: "/gallery/stage-lasers.jpg" },
  { id: "fine-dining", caption: "Dinner before the dance floor", hue: 40, ratio: "square", image: "/gallery/fine-dining.jpg" },
  { id: "concert-hands", caption: "Hands up till late", hue: 30, ratio: "portrait", image: "/gallery/concert-hands.jpg" },
  { id: "signature-cocktails", caption: "Signature cocktails at the bar", hue: 90, ratio: "wide", image: "/gallery/signature-cocktails.jpg" },
  { id: "bar-counter", caption: "The bar, golden hour", hue: 42, ratio: "portrait", image: "/gallery/bar-counter.jpg" },
  { id: "food-spread", caption: "From the hauté kitchen", hue: 20, ratio: "square", image: "/gallery/food-spread.jpg" },
  { id: "confetti-crowd", caption: "Midnight moment", hue: 45, ratio: "wide", image: "/gallery/confetti-crowd.jpg" },
  { id: "neon-drinks", caption: "Back bar glow", hue: 0, ratio: "portrait", image: "/gallery/neon-drinks.jpg" },
  { id: "party-sparklers", caption: "Raining confetti", hue: 250, ratio: "square", image: "/gallery/party-sparklers.jpg" },
];

export const faqs: Faq[] = [
  {
    q: "What is the age limit for entry?",
    a: "Entry is strictly 21+ with a valid government photo ID (Aadhaar, passport or driving licence). IDs are checked at the door for every guest, every night.",
  },
  {
    q: "Is there a dress code?",
    a: "Smart casual and upwards. No shorts, flip-flops or sportswear for men. Management reserves the right of admission.",
  },
  {
    q: "Can I cancel or get a refund on my ticket?",
    a: "Tickets once booked cannot be exchanged or refunded, per our Cancellation & Refund Policy. If an event is cancelled by us, all bookings for it are refunded in full automatically.",
  },
  {
    q: "What food do you serve, and until when?",
    a: "A hauté kitchen menu of Indian and global shareables and mains, with full vegetarian and non-vegetarian ranges. The kitchen serves well past midnight on club nights.",
  },
  {
    q: "How do I get my ticket after booking?",
    a: "Your ticket with its QR code appears instantly under My Account and is also emailed to you. Show the QR at the door — no printout needed.",
  },
  {
    q: "Do ticket prices include food or drinks?",
    a: "Standard entry tickets cover entry only, unless the pass says otherwise — couple passes, for example, include a welcome drink each, and some passes carry a cover amount redeemable at the bar.",
  },
];

export const club = {
  name: "2BHK",
  fullName: "2BHK Diner & Key Club",
  tagline: "Bar ‹Hauté› Kitchen",
  motto: "Drink. Dine. Dance. Dazzle.",
  legalName: "Myrah Hospitality LLP",
  gstin: "27ABKFM0665L1ZU",
  address:
    "Unit 7, Raja Bahadur Mills, behind Sheraton Grand, Bund Garden Road, Sangamvadi, Pune, Maharashtra 411001",
  phone: "+91 77450 42999 · +91 77450 52999", // Infohauteline
  // email: "info@2bhk.in", — club has no public email yet; uncomment when client provides one
  hours: "Open daily · 12:30 PM – 1:30 AM",
  clubNights: "Club nights · Wed–Sun · 8 PM – 3 AM",
  /* exact venue coordinates (also sent by the Rizztix backend in event latlong) */
  geo: { lat: 18.5325927, lng: 73.8709205 },
  socials: [{ name: "Instagram", href: "https://www.instagram.com/2bhkdinerkeyclub/" }],
  mapsEmbed:
    "https://www.google.com/maps?q=18.5325927,73.8709205+(2BHK+Diner+%26+Key+Club)&z=17&output=embed",
};
