"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { modelLabel } from "@/lib/models";
import { useApp } from "./app-context";

export function ModelPicker({ value, onChange }: { value: string | null; onChange: (key: string) => void }) {
  const { providers, modelsLoaded } = useApp();
  const label = value ? modelLabel(value) : modelsLoaded ? "No models" : "Loading…";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={!providers.length}
        className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-lg font-medium hover:bg-muted data-popup-open:bg-muted disabled:opacity-60"
      >
        {label}
        <ChevronDown className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 max-h-[70vh]">
        {providers.map((p, i) => (
          <DropdownMenuGroup key={p.provider}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel>{p.label}</DropdownMenuLabel>
            {p.models.map((m) => (
              <DropdownMenuItem key={m.key} onClick={() => onChange(m.key)} className="py-2">
                <span className="flex-1">{m.label}</span>
                {m.key === value && <Check className="size-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
