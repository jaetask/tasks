import type { SlashCommandItem } from "@jaetask/toolkit/editor";
import { type ComponentProps, lazy, Suspense } from "react";

const SHORT: Record<string, string> = {
  Text: "p paragraph plain",
  "Heading 1": "h1 title",
  "Heading 2": "h2 subtitle",
  "Heading 3": "h3",
  "Bulleted list": "ul bullets",
  "Numbered list": "ol numbers",
  "To-do list": "todo task checkbox checklist",
  Quote: "blockquote",
  "Code block": "pre snippet",
  Divider: "hr line rule",
  Table: "grid",
  Image: "img picture photo",
};

let slashItems: SlashCommandItem[] | undefined;

const Rich = lazy(() =>
  import("@jaetask/toolkit/editor").then((m) => {
    slashItems = m.DEFAULT_SLASH_COMMANDS.map((c) => ({
      ...c,
      searchText: [c.searchText, SHORT[c.title]].filter(Boolean).join(" "),
    }));
    return { default: m.RichMarkdownEditor };
  }),
);

function Loaded(props: ComponentProps<typeof Rich>) {
  return <Rich {...(slashItems ? { slashItems } : {})} {...props} />;
}

const PICTURES = { image: true };

export function Editor({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  className,
  onImageUpload,
}: {
  label: string;
  value: string;
  onChange: (markdown: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  onImageUpload?: (file: File) => Promise<{ src: string; alt?: string }>;
}) {
  return (
    <Suspense fallback={<div className={className} />}>
      <Loaded
        ariaLabel={label}
        value={value}
        onChange={onChange}
        {...(onBlur ? { onBlur } : {})}
        {...(placeholder ? { placeholder } : {})}
        {...(className ? { editorClassName: className } : {})}
        {...(onImageUpload ? { onImageUpload, features: PICTURES } : {})}
      />
    </Suspense>
  );
}
