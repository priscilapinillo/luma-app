import Sidebar from "@/components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F4F2FF' }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: 'hidden', background: '#F4F2FF' }}>
        {children}
      </main>
    </div>
  )
}