import nodemailer from 'nodemailer';
import { describe, expect, it, vi } from 'vitest';
import { createPayloadEmailAdapter } from './emailAdapter';

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(),
  },
}));

describe('Payload email adapter', () => {
  it('sends Payload email messages through the configured SMTP transport', async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: 'message-id' });
    vi.mocked(nodemailer.createTransport).mockReturnValue({
      sendMail,
    } as never);

    const adapter = createPayloadEmailAdapter({
      fromAddress: 'noreply@example.test',
      fromName: 'Goldgetters',
      smtpHost: 'smtp.example.test',
      smtpPass: 'password',
      smtpPort: 587,
      smtpUser: 'smtp-user',
    });

    await expect(
      adapter({ payload: {} as never }).sendEmail({
        html: '<p>Reset password</p>',
        subject: 'Reset your password',
        to: 'member@example.test',
      }),
    ).resolves.toEqual({ messageId: 'message-id' });

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      auth: { pass: 'password', user: 'smtp-user' },
      host: 'smtp.example.test',
      port: 587,
      secure: false,
    });
    expect(sendMail).toHaveBeenCalledWith({
      from: '"Goldgetters" <noreply@example.test>',
      html: '<p>Reset password</p>',
      subject: 'Reset your password',
      to: 'member@example.test',
    });
  });

  it('fails clearly when SMTP is not configured', async () => {
    const adapter = createPayloadEmailAdapter({
      fromAddress: 'noreply@example.test',
      fromName: 'Goldgetters',
      smtpHost: '',
      smtpPass: '',
      smtpPort: 587,
      smtpUser: '',
    });

    await expect(
      adapter({ payload: {} as never }).sendEmail({
        subject: 'Reset your password',
        to: 'member@example.test',
      }),
    ).rejects.toThrow(
      'Payload email delivery is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.',
    );
  });
});
