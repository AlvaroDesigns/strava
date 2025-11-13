/**
 * Genera la URL de autorización de Strava
 * Funciona tanto en servidor como en cliente
 * @param redirectUri - URL de redirección
 * @param clientId - Client ID de Strava
 */
export function getStravaAuthUrl(
  redirectUri: string,
  clientId: string
): string {
  // Obtener clientId: usar el proporcionado o las variables de entorno

  // Validar y normalizar redirectUri - debe tener protocolo completo
  let normalizedRedirectUri = redirectUri.trim();
  if (
    !normalizedRedirectUri.startsWith("http://") &&
    !normalizedRedirectUri.startsWith("https://")
  ) {
    // Si no tiene protocolo, agregar https://
    normalizedRedirectUri = `https://${normalizedRedirectUri}`;
  }

  // Scope en el orden recomendado por Strava: activity:read primero, luego read
  const scope = "activity:read,read";
  const responseType = "code";

  // Construir la URL de autorización
  // Nota: Strava puede redirigir automáticamente de /authorize a /accept_application
  const baseUrl = "https://www.strava.com/oauth/authorize";
  const params = new URLSearchParams({
    client_id: clientId.toString(),
    redirect_uri: normalizedRedirectUri,
    response_type: responseType,
    scope: scope,
  });

  console.log("=== STRAVA AUTH URL GENERATION ===");
  console.log("Redirect URI original:", redirectUri);
  console.log("Redirect URI normalizado:", normalizedRedirectUri);
  console.log("URL completa:", `${baseUrl}?${params.toString()}`);
  console.log("==================================");

  return `${baseUrl}?${params.toString()}`;
}
