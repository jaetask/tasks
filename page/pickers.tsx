import {
  IconAlertSquareFilled,
  IconAntennaBars2,
  IconAntennaBars3,
  IconAntennaBars5,
  IconCircle,
  IconCircleCheckFilled,
  IconCircleDotted,
  IconCircleHalf2,
  IconLineDashed,
  IconProgressCheck,
} from "@tabler/icons-react";
import type { Colour, Kind } from "./api.js";
import { namedColour } from "./local.js";

/** The small circle that says what a column means. A backlog ticket has the dotted one. */
export function StatusIcon({ kind, backlog }: { kind: Kind; backlog?: boolean }) {
  if (backlog) return <IconCircleDotted size={16} aria-hidden className="text-muted-foreground" />;
  if (kind === "doing") return <IconCircleHalf2 size={16} aria-hidden className="text-amber-500" />;
  if (kind === "waiting") {
    return <IconProgressCheck size={16} aria-hidden className="text-emerald-600" />;
  }
  if (kind === "done") {
    return <IconCircleCheckFilled size={16} aria-hidden className="text-emerald-600" />;
  }
  return <IconCircle size={16} aria-hidden className="text-muted-foreground" />;
}

export const PRIORITY_NAME = {
  none: "No priority",
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
} as const;

/** A priority's grey icon: dashes for none, a square for urgent, bars for the rest. */
export function PriorityIcon({ priority }: { priority: keyof typeof PRIORITY_NAME }) {
  const look = { size: 16, "aria-hidden": true, className: "text-muted-foreground" } as const;
  // Urgent is the one priority with a colour.
  if (priority === "urgent") {
    return <IconAlertSquareFilled size={16} aria-hidden className="text-orange-500" />;
  }
  if (priority === "high") return <IconAntennaBars5 {...look} />;
  if (priority === "medium") return <IconAntennaBars3 {...look} />;
  if (priority === "low") return <IconAntennaBars2 {...look} />;
  return <IconLineDashed {...look} />;
}

/** A label's tiny colour dot, in the colour its swatch shows. */
export function LabelDot({ colour }: { colour: Colour }) {
  return (
    <span
      aria-hidden
      className="inline-block size-2 shrink-0 rounded-full"
      style={{ backgroundColor: namedColour(colour) }}
    />
  );
}

// The picker itself and its row are the toolkit's.
export { type PickerChoice as Choice, PropertyPicker, RailRow } from "@jaetask/toolkit/suite";
