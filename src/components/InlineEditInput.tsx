import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface InlineEditInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

export const InlineEditInput = ({
  value,
  onChange,
  placeholder,
  maxLength,
  className,
}: InlineEditInputProps) => {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={maxLength}
      placeholder={placeholder}
      className={cn(
        "border-0 bg-transparent px-0 py-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none",
        className
      )}
    />
  );
};
