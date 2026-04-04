import { NextResponse } from 'next/server';
import { validateContactPayload } from '@/features/contact/schema';
import { verifyTurnstileToken } from '@/features/contact/server/turnstile';
import { sendContactEmail } from '@/features/contact/server/mailer';
import { serverEnv } from '@/lib/env/server';

async function post(request: Request) {
  try {
    const payload = await request.json();
    const { data, error } = validateContactPayload(payload);

    if (!data) {
      return NextResponse.json({ error }, { status: 400 });
    }

    if (serverEnv.turnstileSecretKey) {
      if (!data.turnstileToken) {
        return NextResponse.json(
          { error: 'Turnstile verificatie is verplicht' },
          { status: 400 },
        );
      }

      if (!(await verifyTurnstileToken(data.turnstileToken))) {
        return NextResponse.json(
          { error: 'Ongeldige Turnstile verificatie' },
          { status: 400 },
        );
      }
    }

    const isSent = await sendContactEmail(data);

    if (!isSent) {
      return NextResponse.json(
        { error: 'E-mailservice niet beschikbaar of niet geconfigureerd' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { message: 'E-mail succesvol verzonden' },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ error: 'Interne serverfout' }, { status: 500 });
  }
}

export { post as POST };
