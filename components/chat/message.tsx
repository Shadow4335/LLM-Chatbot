"use client";

import { memo, useState } from "react";
import { Check, Copy, Pencil, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { messageText, type ChatMessage } from "@/lib/chat-types";
import { modelLabel } from "@/lib/models";
import { Markdown, useCopy } from "./markdown";

function Action({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={label} onClick={onClick} />}
        className="text-muted-foreground hover:text-foreground"
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export const Message = memo(function Message({
  message,
  streaming,
  busy,
  onRegenerate,
  onEdit,
}: {
  message: ChatMessage;
  streaming: boolean;
  busy: boolean;
  onRegenerate: (id: string) => void;
  onEdit: (id: string, text: string) => void;
}) {
  const text = messageText(message);
  const { copied, copy } = useCopy();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);

  if (message.role === "user") {
    if (editing) {
      return (
        <div className="flex justify-end">
          <div className="w-full rounded-3xl bg-muted p-3">
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  if (draft.trim()) {
                    setEditing(false);
                    onEdit(message.id, draft.trim());
                  }
                }
                if (e.key === "Escape") setEditing(false);
              }}
              rows={Math.min(12, Math.max(2, draft.split("\n").length))}
              className="w-full resize-none bg-transparent px-2 text-[15px] outline-none"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="rounded-full"
                disabled={!draft.trim() || busy}
                onClick={() => {
                  setEditing(false);
                  onEdit(message.id, draft.trim());
                }}
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="group flex flex-col items-end">
        <div className="max-w-[85%] rounded-3xl bg-muted px-5 py-2.5 text-[15px] whitespace-pre-wrap break-words">
          {text}
        </div>
        <div className="mt-1 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100">
          <Action label={copied ? "Copied" : "Copy"} onClick={() => copy(text)}>
            {copied ? <Check /> : <Copy />}
          </Action>
          {!busy && (
            <Action
              label="Edit message"
              onClick={() => {
                setDraft(text);
                setEditing(true);
              }}
            >
              <Pencil />
            </Action>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="group">
      {text ? (
        <Markdown text={text} />
      ) : streaming ? (
        <span className="inline-block size-3 animate-pulse rounded-full bg-foreground" />
      ) : null}
      {!streaming && (
        <div className="mt-1 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100 group-last:opacity-100">
          <Action label={copied ? "Copied" : "Copy"} onClick={() => copy(text)}>
            {copied ? <Check /> : <Copy />}
          </Action>
          {!busy && (
            <Action label="Regenerate" onClick={() => onRegenerate(message.id)}>
              <RefreshCw />
            </Action>
          )}
          {message.metadata?.model && (
            <span className="ml-2 text-xs text-muted-foreground">{modelLabel(message.metadata.model)}</span>
          )}
        </div>
      )}
    </div>
  );
});
