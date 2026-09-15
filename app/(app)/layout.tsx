import Sidebar from "@/components/Sidebar";
import { AppProvider } from "@/lib/context";
import ToastProvider from "@/components/ToastProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <div className="app-container" style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', paddingLeft: '200px' }}>
        <Sidebar />
        <main style={{ 
          flex: 1, 
          overflowY: 'auto', 
          overflowX: 'hidden', 
          background: 'var(--bg)',
        }}>
          {children}
        </main>
      </div>
      <ToastProvider />
    </AppProvider>
  )
}