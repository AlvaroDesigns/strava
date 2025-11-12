"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStravaAuthUrl } from "@/lib/strava-auth";

interface StravaAutoConnectProps {
  redirectUri: string;
}

export function StravaAutoConnect({ redirectUri }: StravaAutoConnectProps) {
  const router = useRouter();

  useEffect(() => {
    try {
      const stravaAuthUrl = getStravaAuthUrl(redirectUri);
      router.push(stravaAuthUrl);
    } catch (error) {
      console.error("Error al conectar con Strava:", error);
    }
  }, [redirectUri, router]);

  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-sm text-muted-foreground">
          Redirigiendo a Strava para autorizar...
        </p>
      </div>
    </div>
  );
}

