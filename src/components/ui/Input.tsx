import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const fieldCls =
  "w-full rounded-none border-0 border-b border-line bg-transparent px-0 py-3 text-cream placeholder:text-muted/60 focus:border-primary focus:outline-none transition-colors";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Input({ label, id, ...rest }: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div>
      <label htmlFor={inputId} className="label mb-1 block">
        {label}
      </label>
      <input id={inputId} className={fieldCls} {...rest} />
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

export function Textarea({ label, id, ...rest }: TextareaProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div>
      <label htmlFor={inputId} className="label mb-1 block">
        {label}
      </label>
      <textarea id={inputId} rows={5} className={fieldCls} {...rest} />
    </div>
  );
}
