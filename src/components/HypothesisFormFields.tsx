import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MetricTagInput } from "@/components/MetricTagInput";
import {
  HYPOTHESIS_STATUSES,
  parseHypothesisPriorityInput,
  type HypothesisFormValue,
  type HypothesisStatus,
} from "@/lib/hypotheses";
import { cn } from "@/lib/utils";

export type HypothesisFormFieldsProps = {
  value: Partial<HypothesisFormValue>;
  onChange: (next: Partial<HypothesisFormValue>) => void;
  metricSuggestions: string[];
  priorityInput: string;
  onPriorityInputChange: (next: string) => void;
  priorityFieldError: boolean;
  onPriorityFieldErrorChange: (error: boolean) => void;
};

export function HypothesisFormLeftContent({
  value,
  onChange,
  metricSuggestions,
}: Pick<HypothesisFormFieldsProps, "value" | "onChange" | "metricSuggestions">) {
  return (
    <>
      <div>
        <Label htmlFor="insight">Insight</Label>
        <Textarea
          id="insight"
          value={value.insight || ""}
          onChange={(e) => onChange({ ...value, insight: e.target.value })}
          placeholder="Enter insight..."
          rows={5}
        />
      </div>
      <div>
        <Label htmlFor="problem_hypothesis">Problem Hypothesis</Label>
        <Textarea
          id="problem_hypothesis"
          value={value.problem_hypothesis || ""}
          onChange={(e) => onChange({ ...value, problem_hypothesis: e.target.value })}
          placeholder="Enter problem hypothesis..."
          rows={5}
        />
      </div>
      <div>
        <Label htmlFor="problem_validation">Problem Validation</Label>
        <Textarea
          id="problem_validation"
          value={value.problem_validation || ""}
          onChange={(e) => onChange({ ...value, problem_validation: e.target.value })}
          placeholder="Enter validation (links supported)..."
          rows={3}
        />
      </div>
      <div>
        <Label htmlFor="solution_hypothesis">Solution Hypothesis</Label>
        <Textarea
          id="solution_hypothesis"
          value={value.solution_hypothesis || ""}
          onChange={(e) => onChange({ ...value, solution_hypothesis: e.target.value })}
          placeholder="Enter solution hypothesis..."
          rows={5}
        />
      </div>
      <div>
        <Label htmlFor="solution_validation">Solution Validation</Label>
        <Textarea
          id="solution_validation"
          value={value.solution_validation || ""}
          onChange={(e) => onChange({ ...value, solution_validation: e.target.value })}
          placeholder="Enter validation (links supported)..."
          rows={3}
        />
      </div>
      <div>
        <Label htmlFor="impact_metrics">Impact Metrics</Label>
        <MetricTagInput
          value={Array.isArray(value.impact_metrics) ? value.impact_metrics : []}
          onChange={(tags) => onChange({ ...value, impact_metrics: tags })}
          suggestions={metricSuggestions}
          placeholder="Type to add metrics..."
        />
      </div>
    </>
  );
}

export function HypothesisFormStatusAndPriority({
  value,
  onChange,
  priorityInput,
  onPriorityInputChange,
  priorityFieldError,
  onPriorityFieldErrorChange,
}: Omit<HypothesisFormFieldsProps, "metricSuggestions">) {
  return (
    <>
      <div>
        <Label htmlFor="status">Status</Label>
        <Select
          value={(value.status || "new") as HypothesisStatus}
          onValueChange={(next: HypothesisStatus) => onChange({ ...value, status: next })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HYPOTHESIS_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="priority">Priority</Label>
        <Input
          id="priority"
          type="text"
          inputMode="numeric"
          value={priorityInput}
          onChange={(e) => {
            const next = e.target.value;
            onPriorityInputChange(next);
            const parsed = parseHypothesisPriorityInput(next);
            if (!parsed.ok) {
              onPriorityFieldErrorChange(true);
            } else {
              onPriorityFieldErrorChange(false);
              onChange({ ...value, priority: parsed.value });
            }
          }}
          aria-invalid={priorityFieldError}
          aria-describedby={priorityFieldError ? "priority-error" : undefined}
          className={cn(
            priorityFieldError &&
              "border-destructive/55 focus-visible:ring-0 focus-visible:ring-offset-0",
          )}
        />
        {priorityFieldError && (
          <p id="priority-error" className="text-sm text-destructive mt-1">
            Enter a whole number from 1 to 99.
          </p>
        )}
      </div>
    </>
  );
}
