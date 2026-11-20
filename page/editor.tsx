// The toolkit's rich Markdown editor, loaded when a ticket first needs it.
// What is written is saved as Markdown, so agents read and write plain text.
import { lazy, Suspense } from "react";

const Rich = lazy(() =>
  import("@jaetask/toolkit/editor").then((m) => ({ default: m.RichMarkdownEditor })),
);

export function Editor({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (markdown: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
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
      />
    </Suspense>
  );
}
