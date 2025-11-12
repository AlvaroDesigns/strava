// VALORES DE PRUEBA HARDCODEADOS (para testing)
const TEST_CLIENT_ID = "185153";
const TEST_CLIENT_SECRET = "25660a0409899bddc964ba7ffb1cf83544eaf1b2";

/**
 * Obtiene las credenciales de prueba de Strava
 * Útil para testing cuando no hay variables de entorno configuradas
 */
export function getTestStravaCredentials() {
  const credentials = {
    clientId: TEST_CLIENT_ID,
    clientSecret: TEST_CLIENT_SECRET,
  };

  // Validar que las credenciales no estén vacías
  if (!credentials.clientId || !credentials.clientSecret) {
    console.error("ERROR: Credenciales de prueba incompletas!");
    console.error("Client ID:", credentials.clientId || "MISSING");
    console.error(
      "Client Secret:",
      credentials.clientSecret ? "EXISTS" : "MISSING"
    );
  }

  return credentials;
}

/**
 * Genera la URL de autorización de Strava
 * Funciona tanto en servidor como en cliente
 * @param redirectUri - URL de redirección
 * @param clientId - Client ID de Strava (opcional, si no se proporciona usa variables de entorno)
 */
export function getStravaAuthUrl(
  redirectUri: string,
  clientId?: string
): string {
  // Si se proporciona clientId, usarlo; si no, usar variables de entorno

  const finalClientId =
    clientId ||
    (typeof window === "undefined"
      ? process.env.STRAVA_CLIENT_ID || TEST_CLIENT_ID
      : process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID || TEST_CLIENT_ID);

  if (!finalClientId) {
    throw new Error("Client ID de Strava no está configurado");
  }

  // Scope en el orden recomendado por Strava: activity:read primero, luego read
  const scope = "activity:read,read";
  const responseType = "code";

  // Construir la URL de autorización
  // Nota: Strava puede redirigir automáticamente de /authorize a /accept_application
  const baseUrl = "https://www.strava.com/oauth/authorize";
  const params = new URLSearchParams({
    client_id: finalClientId.toString(),
    redirect_uri: redirectUri,
    response_type: responseType,
    scope: scope,
  });

  console.log("params", `${baseUrl}?${params.toString()}`);

  return `${baseUrl}?${params.toString()}`;
}
