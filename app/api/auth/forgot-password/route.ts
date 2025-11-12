import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "El email es requerido" },
        { status: 400 }
      );
    }

    // Buscar el usuario
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Por seguridad, no revelamos si el email existe o no
    // Siempre devolvemos éxito para evitar enumeración de emails
    if (!user) {
      return NextResponse.json({
        message: "Si el email existe, se ha enviado un enlace de recuperación",
      });
    }

    // Generar token único
    const token = crypto.randomBytes(32).toString("hex");

    // Calcular fecha de expiración (1 hora)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Eliminar tokens anteriores no usados del usuario
    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    // Crear nuevo token
    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    // Construir URL de reset
    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    // Enviar email
    await sendEmail({
      to: user.email,
      subject: "Recuperación de contraseña",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #009688; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Recuperación de contraseña</h2>
            <p>Hola${user.name ? ` ${user.name}` : ""},</p>
            <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
            <p><a href="${resetUrl}" class="button">Restablecer contraseña</a></p>
            <p>O copia y pega este enlace en tu navegador:</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
            <p>Este enlace expirará en 1 hora.</p>
            <p>Si no solicitaste este cambio, puedes ignorar este email.</p>
            <div class="footer">
              <p>Saludos,<br>El equipo de Strava App</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Recuperación de contraseña
        
        Hola${user.name ? ` ${user.name}` : ""},
        
        Has solicitado restablecer tu contraseña. Usa el siguiente enlace para crear una nueva contraseña:
        
        ${resetUrl}
        
        Este enlace expirará en 1 hora.
        
        Si no solicitaste este cambio, puedes ignorar este email.
        
        Saludos,
        El equipo de Strava App
      `,
    });

    return NextResponse.json({
      message: "Si el email existe, se ha enviado un enlace de recuperación",
    });
  } catch (error) {
    console.error("Error en forgot-password:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
