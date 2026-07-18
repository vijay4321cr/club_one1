export interface ClubEvent {
  slug: string;
  title: string;
  date: string; // ISO
  lineup: string[];
  genre: string;
  /* image: real artwork in /public; hue+initials render as fallback when absent */
  poster: { hue: number; initials: string; image?: string };
  past?: boolean;
}

export interface Artist {
  id: string;
  name: string;
  genre: string;
  hue: number;
}

export interface Offer {
  id: string;
  title: string;
  detail: string;
  tag: string;
}

export interface Partner {
  id: string;
  name: string;
}

export interface GalleryItem {
  id: string;
  caption: string;
  hue: number;
  ratio: "square" | "portrait" | "wide";
  /** real photo in /public; placeholder renders when absent */
  image?: string;
}

export interface Faq {
  q: string;
  a: string;
}

export interface User {
  name: string;
  email: string;
  phone?: string;
}

/* ---- Rizztix API shapes (see 2BHK-Website-API-Handoff.pdf) ----
   Only the fields the site consumes are typed; the API returns more
   (genreid, clubid, terms, table-booking keys, …) which we ignore for now. */

export interface RizztixTicket {
  _id: string;
  tickettype: string;
  ticketprice: number; // INR
  categorydesc: string;
  totaltickets: number;
  ticketssold: number;
  soldout: boolean;
  passesPerUnit: number; // e.g. couple pass admits 2
  coverAmount: number; // redeemable cover included in price
  ticketstatus: string; // "Available" | …
}

export interface RizztixArtist {
  _id: string;
  name: string;
  image?: string;
  instagramurl?: string;
}

export interface RizztixEvent {
  _id: string;
  title: string;
  startdatetime: string; // ISO
  enddatetime: string; // ISO
  bookingstart?: string;
  bookingend?: string;
  image: string;
  tickets: RizztixTicket[];
  artistsDetails?: RizztixArtist[];
  genre?: { _id: string; title: string }[];
  languageList?: { _id: string; titleenglish: string }[];
  /** % booking fee applied on the ticket subtotal (GST added on top of the fee) */
  bookingpercentage?: number;
  /** computed client-side flag: event has already started */
  isLive?: boolean;
}

/** one line of a multi-category order (POST /order/buy ticketlines[]) */
export interface RizztixTicketLine {
  tickettypeid: string;
  tickettype: string;
  quantity: number;
  ticketprice: number;
}

export interface RizztixUser {
  _id: string;
  phone: string;
  fullname: string;
  email: string;
  dob?: string;
  role: string;
  isonboarded?: boolean;
}

export interface AuthSession {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: RizztixUser;
}

/** POST /order/buy response (important fields) */
export interface RizztixOrder {
  _id: string;
  orderid: string; // Razorpay order id
  bookingref: string;
  eventid: string;
  tickettypeid: string;
  noofticket: number;
  ticketprice: number;
  amount: number;
  currency: string;
  orderstatus: string;
  paymentstatus: string;
  paymentProvider: string;
  razorpayKeyId?: string;
  /** present when the backend runs Cashfree instead of Razorpay */
  payment_session_id?: string | null;
  cashfreeAppId?: string;
  /** which Cashfree environment created the session — drives the SDK mode */
  cashfreeEnv?: "sandbox" | "production" | string;
}

/** POST /order/confirmPayment response (important fields) */
export interface RizztixConfirm {
  _id: string;
  orderid: string;
  orderstatus: string;
  paymentstatus: string;
  ticketid?: string;
  qrcodeimage?: string;
  bookingref: string;
  clubSlug?: string;
}

/** one pass-level QR inside a ticket detail */
export interface RizztixPassQr {
  passIndex: number;
  ticketId: string;
  qrcodeimage?: string;
  qrstring?: string;
}

/** GET /order/viewTicketsWithTicketId/{id} item — one ticket unit of a bundle */
export interface RizztixTicketDetail {
  _id: string;
  eventid?: string;
  bookingref?: string;
  orderid?: string;
  /** human ticket code, e.g. "3CMUEM" */
  ticketid?: string;
  tickettype?: string;
  noofticket?: number;
  ticketprice?: number;
  amount?: number;
  orderstatus?: string;
  paymentstatus?: string;
  passesPerUnit?: number;
  passCount?: number;
  unitIndex?: number;
  ticketbundlesize?: number;
  bundlepaymenttotal?: number;
  qrcodeimage?: string;
  qrcodeimages?: string[];
  passQrcodes?: RizztixPassQr[];
  eventDetails?: {
    _id: string;
    title?: string;
    image?: string;
    startdatetime?: string;
    enddatetime?: string;
    location?: string;
  };
}

/** GET /order/userTickets item — shape not fully documented, all optional */
export interface RizztixUserTicket {
  _id?: string;
  bookingref?: string;
  orderid?: string;
  eventid?: string | { _id?: string; title?: string; image?: string; startdatetime?: string };
  event?: { _id?: string; title?: string; image?: string; startdatetime?: string };
  eventname?: string;
  tickettype?: string;
  noofticket?: number;
  amount?: number;
  orderstatus?: string;
  paymentstatus?: string;
  qrcodeimage?: string;
  createdat?: string;
  createdAt?: string;
}
