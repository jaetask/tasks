// What a link's site goes by, and the icon that stands for it.
import {
  IconBrandFigma,
  IconBrandGithub,
  IconBrandNotion,
  IconBrandYoutubeFilled,
  IconLink,
} from "@tabler/icons-react";

const SERVICES: Record<string, string> = {
  "youtube.com": "YouTube",
  "youtu.be": "YouTube",
  "github.com": "GitHub",
  "figma.com": "Figma",
  "linear.app": "Linear",
  "notion.so": "Notion",
};

/** A link's host without "www.", or "" when the text is not a web address. */
export const linkHost = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^(www|m)\./, "");
  } catch {
    return "";
  }
};

/** The name a link's site goes by: a known service, its domain, or "" for no address yet. */
export const knownService = (url: string) => SERVICES[linkHost(url)] ?? "";
/** The same, falling back to the domain, then to the text itself. */
export const service = (url: string) => knownService(url) || linkHost(url) || url;

/** The icon of a link's site: the service's own mark, or a plain link. */
export function ServiceIcon({
  url,
  size = 14,
  className,
}: {
  url: string;
  size?: number;
  className?: string;
}) {
  const name = knownService(url);
  if (name === "YouTube") {
    return (
      <IconBrandYoutubeFilled
        size={size}
        aria-hidden
        className={`text-red-600 ${className ?? ""}`}
      />
    );
  }
  const Icon =
    name === "GitHub"
      ? IconBrandGithub
      : name === "Figma"
        ? IconBrandFigma
        : name === "Notion"
          ? IconBrandNotion
          : IconLink;
  return <Icon size={size} aria-hidden className={`text-muted-foreground ${className ?? ""}`} />;
}
