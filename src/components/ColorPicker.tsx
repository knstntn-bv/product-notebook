import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const INITIATIVE_COLORS: { value: string; label: string }[] = [
  { value: "#EF4444", label: "Red" },
  { value: "#F97316", label: "Orange" },
  { value: "#F59E0B", label: "Amber" },
  { value: "#84CC16", label: "Lime" },
  { value: "#22C55E", label: "Green" },
  { value: "#14B8A6", label: "Teal" },
  { value: "#06B6D4", label: "Cyan" },
  { value: "#3B82F6", label: "Blue" },
  { value: "#8B5CF6", label: "Violet" },
  { value: "#EC4899", label: "Pink" },
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export const ColorPicker = ({ value, onChange }: ColorPickerProps) => {
  const current = INITIATIVE_COLORS.find((c) => c.value === value) || INITIATIVE_COLORS[0];

  return (
    <Select value={current.value} onValueChange={(val) => onChange(val)}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select color" />
      </SelectTrigger>
      <SelectContent>
        {INITIATIVE_COLORS.map((c) => (
          <SelectItem key={c.value} value={c.value}>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3.5 w-3.5 rounded" style={{ backgroundColor: c.value }} />
              <span>{c.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
