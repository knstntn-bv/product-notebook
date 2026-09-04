import { toast } from "@/hooks/use-toast";

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  if (typeof error === "string" && error.trim()) return error;
  return "Something went wrong";
}

export function errorToast(error: unknown, title = "Error"): void {
  toast({
    // useMutation.onError(error, variables, context) — 2nd arg is not a title
    title: typeof title === "string" && title.trim() ? title : "Error",
    description: errorMessage(error),
    variant: "destructive",
  });
}
