import { after } from 'next/server';
import nodemailer from 'nodemailer';
import type { PayloadEmailAdapter, SendEmailOptions } from 'payload';

type PayloadEmailAdapterOptions = {
  smtpHost: string;
  smtpPass: string;
  smtpPort: number;
  smtpUser: string;
  fromAddress: string;
  fromName: string;
  schedule?: (task: () => Promise<void>) => void;
};

const SMTP_TLS_PORT = 465;

function scheduleEmailDelivery(task: () => Promise<void>): void {
  try {
    after(task);
  } catch {
    setTimeout(() => {
      void task();
    }, 0);
  }
}

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
  const isImplicitTls = options.smtpPort === SMTP_TLS_PORT;
  const schedule = options.schedule ?? scheduleEmailDelivery;
  const transporter = nodemailer.createTransport({
    host: options.smtpHost,
    port: options.smtpPort,
    secure: isImplicitTls,
    ...(isImplicitTls ? {} : { requireTLS: true }),
    auth: {
      user: options.smtpUser,
      pass: options.smtpPass,
    },
  });

  return ({ payload }) => ({
    name: 'goldgetters-nodemailer',
    defaultFromAddress: options.fromAddress,
    defaultFromName: options.fromName,
    sendEmail: (message: SendEmailOptions) => {
      if (!options.smtpHost || !options.smtpUser || !options.smtpPass) {
        payload.logger.error(
          'Payload email delivery is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.',
        );
        return Promise.resolve(undefined);
      }

      schedule(async () => {
        try {
          await transporter.sendMail({
            ...message,
            from: formatFromAddress(message.from, options),
          });
        } catch (err) {
          payload.logger.error({ err }, 'Payload email delivery failed.');
        }
      });

      return Promise.resolve(undefined);
    },
  });
}
