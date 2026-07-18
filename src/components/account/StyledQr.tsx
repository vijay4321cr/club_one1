"use client";

import { useEffect, useRef } from "react";

interface Props {
  /** the exact payload to encode (qrstring from the API) */
  data: string;
  className?: string;
}

/**
 * Brand-styled QR — circular dots with a coal→red gradient and rounded red
 * finder eyes, rendered as SVG from the raw qrstring. Encodes exactly the
 * same data as the backend's plain PNG, so scanners read it identically.
 */
export default function StyledQr({ data, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { default: QRCodeStyling } = await import("qr-code-styling");
      const host = ref.current;
      if (cancelled || !host) return;
      host.innerHTML = "";
      const qr = new QRCodeStyling({
        type: "svg",
        width: 400,
        height: 400,
        data,
        margin: 6,
        qrOptions: { errorCorrectionLevel: "Q" },
        dotsOptions: {
          type: "dots",
          gradient: {
            type: "radial",
            colorStops: [
              { offset: 0, color: "#141414" },
              { offset: 1, color: "#e10600" },
            ],
          },
        },
        cornersSquareOptions: { type: "extra-rounded", color: "#e10600" },
        cornersDotOptions: { type: "dot", color: "#141414" },
        backgroundOptions: { color: "transparent" },
      });
      qr.append(host);
      const svg = host.firstElementChild as HTMLElement | null;
      if (svg) {
        svg.style.width = "100%";
        svg.style.height = "100%";
        svg.style.display = "block";
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data]);

  return <div ref={ref} className={className} aria-label="Entry QR code" role="img" />;
}
