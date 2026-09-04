import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type HeaderActionsContextValue = {
  slot: HTMLElement | null;
  setSlot: (el: HTMLDivElement | null) => void;
};

const HeaderActionsContext = createContext<HeaderActionsContextValue | null>(null);

export function HeaderActionsProvider({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);
  const value = useMemo(() => ({ slot, setSlot }), [slot]);

  return (
    <HeaderActionsContext.Provider value={value}>
      {children}
    </HeaderActionsContext.Provider>
  );
}

function useHeaderActionsContext() {
  const ctx = useContext(HeaderActionsContext);
  if (!ctx) {
    throw new Error("Header actions must be used within HeaderActionsProvider");
  }
  return ctx;
}

/** Mount point in the app header for page-level actions. */
export function HeaderActionsSlot({ className }: { className?: string }) {
  const { setSlot } = useHeaderActionsContext();
  return <div ref={setSlot} className={cn("flex shrink-0 items-center gap-2", className)} />;
}

/** Renders page actions into the app header slot. */
export function HeaderActions({ children }: { children: ReactNode }) {
  const { slot } = useHeaderActionsContext();
  if (!slot) return null;
  return createPortal(children, slot);
}
