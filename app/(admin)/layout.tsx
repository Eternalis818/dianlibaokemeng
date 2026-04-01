import Sidebar from "./components/Sidebar";
import AdminAuthGate from "./components/AdminAuthGate";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthGate>
      <div className="flex min-h-[100dvh]">
        <Sidebar />
        <main className="flex-1 pl-60 overflow-auto min-h-[100dvh]">
          {children}
        </main>
      </div>
    </AdminAuthGate>
  );
}
