import { after } from 'next/server';
import nodemailer from 'nodemailer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPayloadEmailAdapter } from './emailAdapter';

vi.mock('next/server', () => ({
  after: vi.fn(),
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(),
  },
}));

const SMTP_STARTTLS_PORT = 587;
const SMTP_IMPLICIT_TLS_PORT = 465;

describe('Payload email adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enforces STARTTLS via requireTLS on port 587 and resolves before scheduled SMTP delivery runs', async () => {
    const sendMail = vi.fn().mockImplementation(
      () =>
        new Promise<{ messageId: string }>(() => {
          // Intentionally left pending to prove sendEmail returns without waiting on SMTP.
        }),
    );
    const logError = vi.fn();
    vi.mocked(nodemailer.createTransport).mockReturnValue({
      sendMail,
    } as never);

    const adapter = createPayloadEmailAdapter({
      fromAddress: 'noreply@example.test',
      fromName: 'Goldgetters',
      smtpHost: 'smtp.example.test',
      smtpPass: 'password',
      smtpPort: SMTP_STARTTLS_PORT,
      smtpUser: 'smtp-user',
    });

    await expect(
      adapter({ payload: { logger: { error: logError } } as never }).sendEmail({
        html: '<p>Reset password</p>',
        subject: 'Reset your password',
        to: 'member@example.test',
      }),
    ).resolves.toBeUndefined();

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      auth: { pass: 'password', user: 'smtp-user' },
      host: 'smtp.example.test',
      port: SMTP_STARTTLS_PORT,
      requireTLS: true,
      secure: false,
    });
    expect(after).toHaveBeenCalledTimes(1);
    expect(sendMail).not.toHaveBeenCalled();

    const scheduledTask = vi.mocked(after).mock.calls[0]?.[0] as
      (() => Promise<void>) | undefined;
    expect(typeof scheduledTask).toBe('function');

    void scheduledTask?.();
    expect(sendMail).toHaveBeenCalledWith({
      from: '"Goldgetters" <noreply@example.test>',
      html: '<p>Reset password</p>',
      subject: 'Reset your password',
      to: 'member@example.test',
    });
    expect(logError).not.toHaveBeenCalled();
  });

  it('uses implicit TLS without requireTLS on port 465', () => {
    vi.mocked(nodemailer.createTransport).mockReturnValue({
      sendMail: vi.fn(),
    } as never);

    createPayloadEmailAdapter({
      fromAddress: 'noreply@example.test',
      fromName: 'Goldgetters',
      smtpHost: 'smtp.example.test',
      smtpPass: 'password',
      smtpPort: SMTP_IMPLICIT_TLS_PORT,
      smtpUser: 'smtp-user',
    });

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      auth: { pass: 'password', user: 'smtp-user' },
      host: 'smtp.example.test',
      port: SMTP_IMPLICIT_TLS_PORT,
      secure: true,
    });
  });

  it('falls back to asynchronous timer scheduling when called outside a Next request scope', async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: 'message-id' });
    const logError = vi.fn();
    vi.mocked(after).mockImplementation(() => {
      throw new Error('outside request scope');
    });
    vi.mocked(nodemailer.createTransport).mockReturnValue({
      sendMail,
    } as never);

    const adapter = createPayloadEmailAdapter({
      fromAddress: 'noreply@example.test',
      fromName: 'Goldgetters',
      smtpHost: 'smtp.example.test',
      smtpPass: 'password',
      smtpPort: SMTP_STARTTLS_PORT,
      smtpUser: 'smtp-user',
    });

    await expect(
      adapter({ payload: { logger: { error: logError } } as never }).sendEmail({
        subject: 'Reset your password',
        to: 'member@example.test',
      }),
    ).resolves.toBeUndefined();

    expect(sendMail).not.toHaveBeenCalled();
    await vi.waitFor(() => {
      expect(sendMail).toHaveBeenCalledTimes(1);
    });
    expect(logError).not.toHaveBeenCalled();
  });

  it('logs an error and resolves cleanly without scheduling when SMTP is not configured', async () => {
    const logError = vi.fn();
    const adapter = createPayloadEmailAdapter({
      fromAddress: 'noreply@example.test',
      fromName: 'Goldgetters',
      smtpHost: '',
      smtpPass: '',
      smtpPort: SMTP_STARTTLS_PORT,
      smtpUser: '',
    });

    await expect(
      adapter({ payload: { logger: { error: logError } } as never }).sendEmail({
        subject: 'Reset your password',
        to: 'member@example.test',
      }),
    ).resolves.toBeUndefined();

    expect(after).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith(
      'Payload email delivery is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.',
    );
  });

  it('logs transport failures inside the background task without failing password-reset responses', async () => {
    const transportError = new Error('SMTP connection refused');
    const sendMail = vi.fn().mockRejectedValue(transportError);
    const logError = vi.fn();
    vi.mocked(nodemailer.createTransport).mockReturnValue({
      sendMail,
    } as never);

    const adapter = createPayloadEmailAdapter({
      fromAddress: 'noreply@example.test',
      fromName: 'Goldgetters',
      smtpHost: 'smtp.example.test',
      smtpPass: 'password',
      smtpPort: SMTP_STARTTLS_PORT,
      smtpUser: 'smtp-user',
    });

    await expect(
      adapter({ payload: { logger: { error: logError } } as never }).sendEmail({
        subject: 'Reset your password',
        to: 'member@example.test',
      }),
    ).resolves.toBeUndefined();

    const scheduledTask = vi.mocked(after).mock.calls[0]?.[0] as
      (() => Promise<void>) | undefined;
    await scheduledTask?.();
    expect(logError).toHaveBeenCalledWith(
      { err: transportError },
      'Payload email delivery failed.',
    );
  });
});
