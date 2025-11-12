/**
 * Función helper para enviar emails
 * Por ahora muestra el contenido en consola para desarrollo
 * En producción, puedes integrar nodemailer, SendGrid, Resend, etc.
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  // En desarrollo, mostrar el email en consola
  if (process.env.NODE_ENV === "development") {
    console.log("=".repeat(50));
    console.log("📧 EMAIL SIMULADO");
    console.log("=".repeat(50));
    console.log("Para:", options.to);
    console.log("Asunto:", options.subject);
    console.log("Contenido HTML:");
    console.log(options.html);
    if (options.text) {
      console.log("Contenido texto:");
      console.log(options.text);
    }
    console.log("=".repeat(50));
    return;
  }

  // En producción, aquí iría la lógica real de envío de email
  // Ejemplo con nodemailer:
  /*
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
  */

  // Por ahora, en producción también mostramos en consola
  // TODO: Implementar servicio de email real
  console.warn("⚠️ Envío de email no configurado. Email para:", options.to);
  console.warn("Asunto:", options.subject);
}

