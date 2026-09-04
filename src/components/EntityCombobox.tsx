import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type EntityComboboxItem = { id: string; label: string };

type EntityComboboxProps = {
  items: EntityComboboxItem[];
  value: string | null | undefined;
  onSelect: (id: string | null) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  allowNone?: boolean;
  noneLabel?: string;
  disabled?: boolean;
  fallbackLabel?: string;
};

export function EntityCombobox({
  items,
  value,
  onSelect,
  placeholder,
  searchPlaceholder,
  emptyText,
  allowNone = false,
  noneLabel = "None",
  disabled = false,
  fallbackLabel,
}: EntityComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = items.find((item) => item.id === value);
  const triggerLabel = selected
    ? selected.label
    : value
      ? fallbackLabel || placeholder
      : placeholder;

  const choose = (id: string | null) => {
    onSelect(id);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between"
        >
          {triggerLabel}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {allowNone ? (
                <CommandItem value="none" onSelect={() => choose(null)}>
                  <Check
                    className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")}
                  />
                  {noneLabel}
                </CommandItem>
              ) : null}
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.label.trim() ? item.label : item.id}
                  onSelect={() => choose(item.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === item.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
