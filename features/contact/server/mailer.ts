import nodemailer from 'nodemailer';
import { serverEnv, isSmtpConfigured } from '@/lib/env/server';
import type { ContactFormData } from '@/features/contact/schema';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export async function sendContactEmail(
  data: ContactFormData,
): Promise<boolean> {
  if (!isSmtpConfigured()) return false;

  const transporter = nodemailer.createTransport({
    host: serverEnv.smtpHost,
    port: serverEnv.smtpPort,
    secure: serverEnv.smtpPort === 465,
    auth: {
      user: serverEnv.smtpUser,
      pass: serverEnv.smtpPass,
    },
  });

  try {
    await transporter.verify();
  } catch {
    return false;
  }

  const contactEmailTo = serverEnv.contactEmailTo || serverEnv.smtpUser;
  const contactEmailFrom = serverEnv.contactEmailFrom || serverEnv.smtpUser;
  const safeName = escapeHtml(data.name);
  const safeEmail = escapeHtml(data.email);
  const safeSubject = escapeHtml(data.subject);
  const safeMessage = escapeHtml(data.message).replaceAll('\n', '<br>');

  await transporter.sendMail({
    from: `"${safeName}" <${contactEmailFrom}>`,
    to: contactEmailTo,
    replyTo: data.email,
    subject: `Contactformulier: ${data.subject}`,
    text: `Naam: ${data.name}\nE-mail: ${data.email}\nOnderwerp: ${data.subject}\n\nBericht:\n${data.message}`,
    html: `<!DOCTYPE html><html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;"><div style="max-width: 600px; margin: 0 auto; padding: 20px;"><h2>Nieuw contactformulier bericht</h2><p><strong>Naam:</strong> ${safeName}</p><p><strong>E-mail:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p><p><strong>Onderwerp:</strong> ${safeSubject}</p><p><strong>Bericht:</strong><br>${safeMessage}</p></div></body></html>`,
  });

  return true;
}
