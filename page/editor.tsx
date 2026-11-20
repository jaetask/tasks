// The toolkit's rich Markdown editor, loaded when a ticket first needs it.
// What is written is saved as Markdown, so agents read and write plain text.
import { lazy, Suspense } from "react";

const Rich = lazy(() =>
  import("@jaetask/toolkit/editor").then((m) => ({ default: m.RichMarkdownEditor })),
);

// Pictures are a part of the editor that is off unless asked for. One object, so the editor is
// not built again on every render.
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
  /** Stores a picture pasted, dropped or chosen in the text, and says where it can be read. */
  onImageUpload?: (file: File) => Promise<{ src: string; alt?: string }>;
}) {
  return (
    <Suspense fallback={<div className={className} />}>
      <Rich
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
