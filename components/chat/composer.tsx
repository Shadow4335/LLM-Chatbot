"use client";

import { useEffect, useRef } from "react";
import { ArrowUp, Square } from "lucide-react";
import { cn } from "@/lib/utils";

export function Composer({
  value,
  onChange,
  onSubmit,
  onStop,
  busy,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  busy: boolean;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 240) + "px";
  }, [value]);

  useEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches) ref.current?.focus();
  }, []);

  const canSend = value.trim().length > 0 && !busy && !disabled;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSend) onSubmit();
      }}
      className="flex items-end gap-2 rounded-[28px] border bg-background p-2 pl-5 shadow-sm dark:border-transparent dark:bg-[#303030]"
    >
      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (canSend) onSubmit();
          }
        }}
        placeholder="Ask anything"
        className="max-h-60 flex-1 resize-none self-center bg-transparent py-1.5 text-[15px] outline-none placeholder:text-muted-foreground"
      />
      {busy ? (
        <button
          type="button"
          onClick={onStop}
          aria-label="Stop generating"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background"
        >
          <Square className="size-3.5 fill-current" />
        </button>
      ) : (
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send message"
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity",
            !canSend && "opacity-30",
          )}
        >
          <ArrowUp className="size-5" />
        </button>
      )}
    </form>
  );
}
