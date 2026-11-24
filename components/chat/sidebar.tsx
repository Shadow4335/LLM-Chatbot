"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { differenceInCalendarDays } from "date-fns";
import { MoreHorizontal, PanelLeftClose, Pencil, Search, SquarePen, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { ConversationSummary } from "@/lib/chat-types";
import { useApp } from "./app-context";

const GROUPS = ["Today", "Yesterday", "Previous 7 days", "Older"] as const;

function groupOf(date: string): (typeof GROUPS)[number] {
  const diff = differenceInCalendarDays(new Date(), new Date(date));
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff <= 7) return "Previous 7 days";
  return "Older";
}

export function Sidebar() {
  const { conversations, sidebarOpen, setSidebarOpen, bumpNewChat, refreshConversations } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const activeId = pathname.startsWith("/c/") ? pathname.slice(3) : null;
  const [query, setQuery] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [toDelete, setToDelete] = useState<ConversationSummary | null>(null);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? conversations.filter((c) => c.title.toLowerCase().includes(q)) : conversations;
    const map = new Map<string, ConversationSummary[]>();
    for (const c of list) {
      const g = groupOf(c.updatedAt);
      map.set(g, [...(map.get(g) ?? []), c]);
    }
    return GROUPS.filter((g) => map.has(g)).map((g) => ({ label: g, items: map.get(g)! }));
  }, [conversations, query]);

  const closeOnMobile = () => {
    if (window.matchMedia("(max-width: 767px)").matches) setSidebarOpen(false);
  };

  const newChat = () => {
    bumpNewChat();
    router.push("/");
    closeOnMobile();
  };

  const commitRename = async (id: string) => {
    const title = renameValue.trim();
    setRenaming(null);
    if (!title) return;
    const r = await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!r.ok) toast.error("Rename failed");
    await refreshConversations();
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const id = toDelete.id;
    setToDelete(null);
    const r = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (!r.ok) return toast.error("Delete failed");
    await refreshConversations();
    if (activeId === id) newChat();
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/50 transition-opacity md:hidden",
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setSidebarOpen(false)}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[260px] shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[transform,margin] duration-200 md:relative md:z-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:-ml-[260px]",
        )}
        aria-hidden={!sidebarOpen}
      >
        <div className="flex h-14 items-center justify-between px-2">
          <Button variant="ghost" size="icon-lg" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">
            <PanelLeftClose className="size-5" />
          </Button>
          <Button variant="ghost" size="icon-lg" onClick={newChat} aria-label="New chat">
            <SquarePen className="size-5" />
          </Button>
        </div>

        <div className="px-2 pb-2">
          <button
            onClick={newChat}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-sidebar-accent"
          >
            <SquarePen className="size-4" /> New chat
          </button>
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chats"
              className="h-9 w-full rounded-lg bg-transparent pr-8 pl-8 text-sm outline-none placeholder:text-muted-foreground hover:bg-sidebar-accent focus:bg-sidebar-accent"
            />
            {query && (
              <button
                className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          {grouped.length === 0 && (
            <p className="px-2 py-4 text-sm text-muted-foreground">{query ? "No matches" : "No chats yet"}</p>
          )}
          {grouped.map((g) => (
            <div key={g.label} className="mt-4 first:mt-1">
              <h3 className="px-2 pb-1 text-xs font-medium text-muted-foreground">{g.label}</h3>
              <ul>
                {g.items.map((c) => (
                  <li key={c.id} className="group relative">
                    {renaming === c.id ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => commitRename(c.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename(c.id);
                          if (e.key === "Escape") setRenaming(null);
                        }}
                        className="h-9 w-full rounded-lg bg-sidebar-accent px-2 text-sm ring-1 ring-ring outline-none"
                      />
                    ) : (
                      <>
                        <Link
                          href={`/c/${c.id}`}
                          onClick={closeOnMobile}
                          className={cn(
                            "block truncate rounded-lg py-2 pr-8 pl-2 text-sm hover:bg-sidebar-accent",
                            activeId === c.id && "bg-sidebar-accent",
                          )}
                          title={c.title}
                        >
                          {c.title}
                        </Link>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className={cn(
                              "absolute top-1/2 right-1 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100 data-popup-open:opacity-100 max-md:opacity-100",
                              activeId === c.id && "opacity-100",
                            )}
                            aria-label="Chat options"
                          >
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-36">
                            <DropdownMenuItem
                              onClick={() => {
                                setRenameValue(c.title);
                                setRenaming(c.id);
                              }}
                            >
                              <Pencil /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onClick={() => setToDelete(c)}>
                              <Trash2 /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete chat?</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{toDelete?.title}</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
