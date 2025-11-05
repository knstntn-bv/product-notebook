import { useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface AutoResizeTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  maxLength?: number;
  disabled?: boolean;
}

export const AutoResizeTextarea = ({
  value,
  onChange,
  placeholder,
  className,
  rows = 1,
  maxLength,
  disabled = false,
}: AutoResizeTextareaProps) => {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const resize = () => {
    if (!ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height = `${ref.current.scrollHeight}px`;
  };

  useEffect(() => {
    resize();
  }, [value]);

  return (
    <Textarea
      ref={ref}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      onInput={resize}
      placeholder={placeholder}
      rows={rows}
      maxLength={maxLength}
      disabled={disabled}
      className={cn(
        "w-full border-0 bg-transparent px-0 py-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none leading-5 min-h-0 whitespace-pre-wrap",
        className
      )}
    />
  );
};
