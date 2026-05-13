import Sidebar from "@/components/Sidebar";
import { AppProvider } from "@/lib/context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
        <Sidebar />
        <main style={{ flex: 1, overflow: 'hidden', background: 'var(--bg)' }}>
          {children}
        </main>
      </div>
    </AppProvider>
  )
}