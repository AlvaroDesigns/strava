# Configuración de Túnel para Desarrollo Local con Strava

Strava requiere una URL pública para el OAuth, no permite `localhost`. Esta guía te muestra cómo usar un túnel público para desarrollo local.

## Opción 1: Usar LocalTunnel (Recomendado)

### Paso 1: Instalar dependencias

```bash
npm install
```

### Paso 2: Iniciar el túnel y el servidor

En una terminal, ejecuta:

```bash
npm run dev:tunnel
```

Esto iniciará:
1. Un túnel público en `https://random-name.loca.lt` (o similar)
2. Tu servidor Next.js en `localhost:3000`

### Paso 3: Copiar la URL del túnel

Cuando ejecutes `npm run dev:tunnel`, verás algo como:

```
your url is: https://random-name-12345.loca.lt
```

### Paso 4: Configurar la variable de entorno

Copia esa URL y agrégala a tu archivo `.env`:

```env
PUBLIC_DOMAIN=https://random-name-12345.loca.lt
```

**Nota:** La URL del túnel cambia cada vez que lo reinicias (a menos que uses un subdominio fijo). Si reinicias el túnel, actualiza `PUBLIC_DOMAIN` en tu `.env`.

### Paso 5: Configurar Strava

1. Ve a https://www.strava.com/settings/api
2. Edita tu aplicación (Client ID: 185153)
3. En **Authorization Callback Domain**, pon solo el dominio sin `https://`:
   ```
   random-name-12345.loca.lt
   ```
4. Guarda los cambios

### Paso 6: Reiniciar el servidor

Reinicia tu servidor para que cargue la nueva variable de entorno:

```bash
npm run dev:tunnel
```

## Opción 2: Usar ngrok (Alternativa)

Si prefieres usar ngrok:

### Paso 1: Instalar ngrok

```bash
# macOS
brew install ngrok

# O descarga desde https://ngrok.com/download
```

### Paso 2: Iniciar ngrok

En una terminal separada:

```bash
ngrok http 3000
```

### Paso 3: Copiar la URL

Ngrok te dará una URL como:
```
https://abc123.ngrok.io
```

### Paso 4: Configurar

1. Agrega a tu `.env`:
   ```env
   PUBLIC_DOMAIN=https://abc123.ngrok.io
   ```

2. En Strava, configura el **Authorization Callback Domain** como:
   ```
   abc123.ngrok.io
   ```

## Opción 3: Subdominio fijo con LocalTunnel

Para tener una URL que no cambie:

```bash
lt --port 3000 --subdomain mi-app-strava
```

Luego usa:
```env
PUBLIC_DOMAIN=https://mi-app-strava.loca.lt
```

**Nota:** Los subdominios fijos requieren una cuenta de LocalTunnel (gratuita).

## Verificación

1. Inicia el túnel y el servidor: `npm run dev:tunnel`
2. Copia la URL del túnel
3. Configúrala en `.env` como `PUBLIC_DOMAIN`
4. Configura el dominio en Strava (sin `https://`)
5. Reinicia el servidor
6. Intenta conectarte con Strava

## Troubleshooting

### El túnel no funciona
- Asegúrate de que el puerto 3000 esté libre
- Verifica que tu firewall no bloquee las conexiones

### Strava sigue rechazando
- Verifica que el dominio en Strava coincida exactamente (sin `https://`)
- Asegúrate de que `PUBLIC_DOMAIN` en `.env` tenga `https://`
- Reinicia el servidor después de cambiar `.env`

### La URL del túnel cambia
- Usa un subdominio fijo con `--subdomain`
- O actualiza `PUBLIC_DOMAIN` cada vez que reinicies el túnel

