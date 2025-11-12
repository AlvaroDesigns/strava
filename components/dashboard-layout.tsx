import { Header } from "./header";

export function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // La verificación de sesión se hace en cada página que usa este layout
  // para evitar errores de contexto de solicitud
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
    </div>
  );
}

