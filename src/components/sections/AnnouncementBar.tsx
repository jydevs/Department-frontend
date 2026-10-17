"use client";

import Link from "next/link";
import { useState } from "react";
import { Marquee } from "@/components/ui/Marquee";

export interface AnnouncementBarProps {
  id?: string;
  text: string;
  /** several lines scroll as a ticker */
  items?: string[];
  href?: string;
  backgroundColor?: string;
  textColor?: string;
  dismissible: boolean;
}

/** In-page announcement strip (the global ticker lives in the header). */
export function AnnouncementBar({ id, text, items, href, backgroundColor, textColor, dismissible }: AnnouncementBarProps) {
  const [closed, setClosed] = useState(false);
  if (closed) return null;

  const content =
    items && items.length > 0 ? (
      <Marquee
        items={items}
        duration={30}
        separatorClassName="opacity-70"
        itemClassName="font-condensed text-[11px] tracking-[0.24em]"
        className="w-full"
      />
    ) : (
      <p className="font-condensed px-gutter text-center text-[11px] tracking-[0.24em]">{text}</p>
    );

  return (
    <div
      id={id}
      className="relative flex h-9 items-center bg-dept-red text-dept-white"
      style={{
        ...(backgroundColor ? { backgroundColor } : null),
        ...(textColor ? { color: textColor } : null),
      }}
    >
      {href ? (
        <Link href={href} className="block w-full">
          {content}
        </Link>
      ) : (
        content
      )}
      {dismissible && (
        <button
          type="button"
          aria-label="Cerrar anuncio"
          onClick={() => setClosed(true)}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center"
        >
          <span aria-hidden>✕</span>
        </button>
      )}
    </div>
  );
}
