import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  description?: string;
  onAdd?: () => void;
  addLabel?: string;
}

export const SectionHeader = ({
  title,
  description,
  onAdd,
  addLabel = "Add",
}: SectionHeaderProps) => {
  return (
    <div className="flex items-center justify-between mb-2">
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      {onAdd && (
        <Button onClick={onAdd} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          {addLabel}
        </Button>
      )}
    </div>
  );
};
