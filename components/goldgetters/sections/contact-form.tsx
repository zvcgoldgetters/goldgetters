'use client';

import { useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Turnstile, TurnstileRef } from '@/components/turnstile';
import { nl } from '@/lib/i18n/nl';
import { GoldgettersButton } from '@/components/goldgetters/design/button';
import {
  GoldgettersCard,
  GoldgettersCardContent,
  GoldgettersCardHeader,
} from '@/components/goldgetters/design/card';
import {
  BodyText,
  DisplayTitle,
  SectionLabel,
} from '@/components/goldgetters/design/typography';
import { GoldgettersGrid } from '@/components/goldgetters/layout/grid';
import { GoldgettersStack } from '@/components/goldgetters/layout/stack';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

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
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [turnstileLoadError, setTurnstileLoadError] = useState(false);
  const turnstileRef = useRef<TurnstileRef>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const shouldRenderTurnstile = Boolean(siteKey);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) newErrors.name = nl.contact.form.nameRequired;

    if (!formData.email.trim()) {
      newErrors.email = nl.contact.form.emailRequired;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = nl.contact.form.emailInvalid;
    }

    if (!formData.subject.trim())
      newErrors.subject = nl.contact.form.subjectRequired;
    if (!formData.message.trim())
      newErrors.message = nl.contact.form.messageRequired;
    if (shouldRenderTurnstile && !turnstileToken) {
      newErrors.turnstile = nl.contact.form.turnstileRequired;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          turnstileToken,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

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

    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <GoldgettersCard>
      <GoldgettersCardHeader>
        <GoldgettersStack gap="md">
          <SectionLabel>{nl.contact.form.label}</SectionLabel>
          <DisplayTitle asChild size="callout">
            <h2>{nl.contact.form.title}</h2>
          </DisplayTitle>
        </GoldgettersStack>
        <Badge variant="outline" layout="note">
          <ShieldCheck />
          <span>{nl.contact.form.note}</span>
        </Badge>
        <Separator />
      </GoldgettersCardHeader>

      <GoldgettersCardContent>
        <form onSubmit={handleSubmit}>
          <GoldgettersStack gap="lg">
            <FieldGroup>
              <GoldgettersGrid gap="md" columns="twoSm">
                <Field data-invalid={!!errors.name}>
                  <FieldLabel htmlFor="name">
                    {nl.contact.form.nameLabel} *
                  </FieldLabel>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder={nl.contact.form.namePlaceholder}
                    aria-invalid={!!errors.name}
                  />
                  <FieldError>{errors.name}</FieldError>
                </Field>

                <Field data-invalid={!!errors.email}>
                  <FieldLabel htmlFor="email">
                    {nl.contact.form.emailLabel} *
                  </FieldLabel>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder={nl.contact.form.emailPlaceholder}
                    aria-invalid={!!errors.email}
                  />
                  <FieldError>{errors.email}</FieldError>
                </Field>
              </GoldgettersGrid>
            </FieldGroup>

            <FieldGroup>
              <GoldgettersStack gap="lg">
                <Field data-invalid={!!errors.subject}>
                  <FieldLabel htmlFor="subject">
                    {nl.contact.form.subjectLabel} *
                  </FieldLabel>
                  <Input
                    id="subject"
                    name="subject"
                    type="text"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder={nl.contact.form.subjectPlaceholder}
                    aria-invalid={!!errors.subject}
                  />
                  <FieldError>{errors.subject}</FieldError>
                </Field>

                <Field data-invalid={!!errors.message}>
                  <FieldLabel htmlFor="message">
                    {nl.contact.form.messageLabel} *
                  </FieldLabel>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder={nl.contact.form.messagePlaceholder}
                    rows={7}
                    aria-invalid={!!errors.message}
                  />
                  <FieldError>{errors.message}</FieldError>
                </Field>
              </GoldgettersStack>
            </FieldGroup>

            {shouldRenderTurnstile && siteKey && (
              <Field data-invalid={!!errors.turnstile}>
                {!turnstileReady && !turnstileLoadError ? (
                  <BodyText size="detail" tone="muted">
                    {nl.contact.form.turnstileLoading}
                  </BodyText>
                ) : null}
                {turnstileLoadError ? (
                  <BodyText size="detail" tone="muted">
                    {nl.contact.form.turnstileLoadError}
                  </BodyText>
                ) : null}
                <Turnstile
                  ref={turnstileRef}
                  siteKey={siteKey}
                  onReady={() => {
                    setTurnstileReady(true);
                    setTurnstileLoadError(false);
                  }}
                  onLoadError={() => {
                    setTurnstileReady(false);
                    setTurnstileLoadError(true);
                  }}
                  onVerify={(token) => {
                    setTurnstileToken(token);
                    setErrors((prev) => ({
                      ...prev,
                      turnstile: undefined,
                    }));
                  }}
                  onError={() => {
                    setErrors((prev) => ({
                      ...prev,
                      turnstile: nl.contact.form.turnstileError,
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
                <CheckCircle2 />
                <AlertDescription>{nl.contact.form.success}</AlertDescription>
              </Alert>
            )}

            {submitStatus === 'error' && (
              <Alert variant="destructive">
                <AlertDescription>{nl.contact.form.failure}</AlertDescription>
              </Alert>
            )}

            <Separator />

            <GoldgettersGrid gap="md" columns="trailingAutoSm" align="centerSm">
              <BodyText size="detail" tone="muted">
                {nl.contact.form.privacy}
              </BodyText>
              <GoldgettersButton
                type="submit"
                disabled={isSubmitting}
                size="lg"
              >
                {isSubmitting
                  ? nl.contact.form.submitting
                  : nl.contact.form.submit}
                {!isSubmitting && <ArrowRight data-icon="inline-end" />}
              </GoldgettersButton>
            </GoldgettersGrid>
          </GoldgettersStack>
        </form>
      </GoldgettersCardContent>
    </GoldgettersCard>
  );
}
