import Sidebar from "@/components/Sidebar";
import { AppProvider } from "@/lib/context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
        <Sidebar />
        <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {children}
        </main>
      </div>
    </AppProvider>
  )
}