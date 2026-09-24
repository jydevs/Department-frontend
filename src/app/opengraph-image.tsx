import { renderOg } from "@/lib/og";

export const alt = "Daregular Dept. — Uniforms for the unnoticed";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOg({
    photo: "home-hero.jpg",
    kicker: "Rags to Riches — Extended Version",
    title: "Uniforms for the unnoticed.",
  });
}
