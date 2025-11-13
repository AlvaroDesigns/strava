import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await auth();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Bienvenido a Strava App
        </h1>
        <div className="flex flex-col items-center gap-4">
          <Link href="/login">
            <Button size="lg">Iniciar Sesión</Button>
          </Link>
          <Link href="/register">
            <Button variant="outline" size="lg">
              Registrarse
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}

