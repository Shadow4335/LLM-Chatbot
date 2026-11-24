"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useApp } from "./app-context";

export function SettingsPopover({
  systemPrompt,
  onSystemPromptChange,
}: {
  systemPrompt: string;
  onSystemPromptChange: (v: string) => void;
}) {
  const { temperature, setTemperature } = useApp();
  const [draft, setDraft] = useState(systemPrompt);

  return (
    <Popover
      onOpenChange={(open) => {
        if (open) setDraft(systemPrompt);
        else if (draft !== systemPrompt) onSystemPromptChange(draft);
      }}
    >
      <PopoverTrigger
        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground data-popup-open:bg-muted"
        aria-label="Chat settings"
      >
        <Settings2 className="size-5" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-4 p-4">
        <div className="space-y-2">
          <Label htmlFor="system-prompt">System prompt</Label>
          <Textarea
            id="system-prompt"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="You are a helpful assistant."
            className="max-h-60 min-h-24 text-sm"
          />
          <p className="text-xs text-muted-foreground">Saved for this chat.</p>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Temperature</Label>
            <span className="text-sm tabular-nums text-muted-foreground">{temperature.toFixed(1)}</span>
          </div>
          <Slider
            min={0}
            max={2}
            step={0.1}
            value={[temperature]}
            onValueChange={(v) => setTemperature(Array.isArray(v) ? v[0] : (v as number))}
          />
          <p className="text-xs text-muted-foreground">Some reasoning models ignore temperature.</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
