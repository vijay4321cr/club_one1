"use client";

import StyledQr from "@/components/account/StyledQr";

interface Props {
  /** remote QR image URL — the official backend QR (preferred, loaded every time) */
  qrcodeimage?: string;
  /** raw base64 PNG (no data: prefix) some responses carry */
  qrcode?: string;
  /** JSON payload the QR encodes — only used to generate one if no image exists */
  qrstring?: string;
  className?: string;
}

/**
 * Renders a ticket QR. Always shows the backend's official QR image from its
 * URL (venue scanners expect exactly that image), loaded fresh each time via a
 * plain <img> so there's no Next optimization/caching in the way. Falls back to
 * an inline base64 image, then to an on-device generated QR only if no image
 * is available at all.
 */
export default function TicketQr({ qrcodeimage, qrcode, qrstring, className = "" }: Props) {
  const src =
    qrcodeimage ??
    (qrcode ? (qrcode.startsWith("data:") ? qrcode : `data:image/png;base64,${qrcode}`) : undefined);

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="Entry QR" className={`${className} object-contain`} />;
  }
  if (qrstring) return <StyledQr data={qrstring} className={className} />;
  return null;
}
