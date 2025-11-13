import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm flex flex-col">
        <div>
          <Image
            src="https://together.alvarodesigns.com/logo.png"
            alt="Together Logo"
            width={140}
            height={60}
            className="h-12 w-auto mb-8"
            unoptimized
          />
        </div>
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
