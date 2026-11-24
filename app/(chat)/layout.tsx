import { AppProvider } from "@/components/chat/app-context";
import { Sidebar } from "@/components/chat/sidebar";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <div className="flex h-dvh w-full overflow-hidden bg-background">
        <Sidebar />
        <main className="relative flex min-w-0 flex-1 flex-col">{children}</main>
      </div>
    </AppProvider>
  );
}
