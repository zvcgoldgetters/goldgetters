'use client';

import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Turnstile, TurnstileRef } from '@/components/turnstile';
import { clientEnv } from '@/lib/env/client';

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  turnstile?: string;
}

export function ContactForm() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    'idle' | 'success' | 'error'
  >('idle');
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const turnstileRef = useRef<TurnstileRef>(null);
  const siteKey = clientEnv.turnstileSiteKey;

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Naam is verplicht';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-mailadres is verplicht';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Ongeldig e-mailadres';
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Onderwerp is verplicht';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Bericht is verplicht';
    }

    // Only validate turnstile if the site key is configured
    if (siteKey && !turnstileToken) {
      newErrors.turnstile = 'Gelieve de verificatie te voltooien';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          turnstileToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setSubmitStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
      setTurnstileToken('');
      turnstileRef.current?.reset();
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Field data-invalid={!!errors.name}>
        <FieldLabel htmlFor="name">
          Naam <span className="text-destructive">*</span>
        </FieldLabel>
        <Input
          id="name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          placeholder="Uw naam"
          aria-invalid={!!errors.name}
        />
        <FieldError>{errors.name}</FieldError>
      </Field>

      <Field data-invalid={!!errors.email}>
        <FieldLabel htmlFor="email">
          E-mailadres <span className="text-destructive">*</span>
        </FieldLabel>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="uw.email@voorbeeld.be"
          aria-invalid={!!errors.email}
        />
        <FieldError>{errors.email}</FieldError>
      </Field>

      <Field data-invalid={!!errors.subject}>
        <FieldLabel htmlFor="subject">
          Onderwerp <span className="text-destructive">*</span>
        </FieldLabel>
        <Input
          id="subject"
          name="subject"
          type="text"
          value={formData.subject}
          onChange={handleChange}
          placeholder="Onderwerp van uw bericht"
          aria-invalid={!!errors.subject}
        />
        <FieldError>{errors.subject}</FieldError>
      </Field>

      <Field data-invalid={!!errors.message}>
        <FieldLabel htmlFor="message">
          Bericht <span className="text-destructive">*</span>
        </FieldLabel>
        <Textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          placeholder="Uw bericht..."
          rows={6}
          aria-invalid={!!errors.message}
        />
        <FieldError>{errors.message}</FieldError>
      </Field>

      {siteKey && (
        <Field data-invalid={!!errors.turnstile}>
          <Turnstile
            ref={turnstileRef}
            siteKey={siteKey}
            onVerify={(token) => {
              setTurnstileToken(token);
              setErrors((prev) => ({ ...prev, turnstile: undefined }));
            }}
            onError={() => {
              setErrors((prev) => ({
                ...prev,
                turnstile: 'Turnstile verification failed',
              }));
            }}
            onExpire={() => {
              setTurnstileToken('');
            }}
          />
          <FieldError>{errors.turnstile}</FieldError>
        </Field>
      )}

      {submitStatus === 'success' && (
        <Alert>
          <AlertDescription>
            Bedankt voor uw bericht! We nemen zo snel mogelijk contact met u op.
          </AlertDescription>
        </Alert>
      )}

      {submitStatus === 'error' && (
        <Alert variant="destructive">
          <AlertDescription>
            Er is een fout opgetreden bij het verzenden van uw bericht. Probeer
            het later opnieuw.
          </AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Verzenden...' : 'Verzend bericht'}
      </Button>
    </form>
  );
}
