"use client";

import { Button } from "@/components/ui/button";
import { getStravaAuthUrl } from "@/lib/strava-auth";

export function StravaConnect() {
  const handleConnect = () => {
    try {
      const redirectUri = `${window.location.origin}/api/strava/callback`;
      const stravaAuthUrl = getStravaAuthUrl(redirectUri);
      window.location.href = stravaAuthUrl;
    } catch (error) {
      alert("Error: Strava Client ID no configurado. Por favor, configura NEXT_PUBLIC_STRAVA_CLIENT_ID en tu archivo .env");
    }
  };

  return (
    <Button onClick={handleConnect} className="w-full">
      Conectar con Strava
    </Button>
  );
}

