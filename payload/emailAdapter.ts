import nodemailer from 'nodemailer';
import type { PayloadEmailAdapter, SendEmailOptions } from 'payload';

type PayloadEmailAdapterOptions = {
  smtpHost: string;
  smtpPass: string;
  smtpPort: number;
  smtpUser: string;
  fromAddress: string;
  fromName: string;
};

const SMTP_TLS_PORT = 465;

function formatFromAddress(
  from: SendEmailOptions['from'],
  options: PayloadEmailAdapterOptions,
): string {
  if (typeof from === 'string') {
    return from;
  }

  if (from) {
    return `"${from.name ?? options.fromName}" <${from.address}>`;
  }

  return `"${options.fromName}" <${options.fromAddress}>`;
}

export function createPayloadEmailAdapter(
  options: PayloadEmailAdapterOptions,
): PayloadEmailAdapter {
  const transporter = nodemailer.createTransport({
    host: options.smtpHost,
    port: options.smtpPort,
    secure: options.smtpPort === SMTP_TLS_PORT,
    auth: {
      user: options.smtpUser,
      pass: options.smtpPass,
    },
  });

  return () => ({
    name: 'goldgetters-nodemailer',
    defaultFromAddress: options.fromAddress,
    defaultFromName: options.fromName,
    sendEmail: async (message: SendEmailOptions) => {
      if (!options.smtpHost || !options.smtpUser || !options.smtpPass) {
        throw new Error(
          'Payload email delivery is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.',
        );
      }

      return transporter.sendMail({
        ...message,
        from: formatFromAddress(message.from, options),
      });
    },
  });
}
