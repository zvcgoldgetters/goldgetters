'use client';

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
        },
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export interface TurnstileRef {
  reset: () => void;
}

interface TurnstileProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  onReady?: () => void;
  onLoadError?: () => void;
  theme?: 'light' | 'dark' | 'auto';
}

export const Turnstile = forwardRef<TurnstileRef, TurnstileProps>(
  (
    {
      siteKey,
      onVerify,
      onError,
      onExpire,
      onReady,
      onLoadError,
      theme = 'auto',
    },
    ref,
  ) => {
    const turnstileRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string>('');

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
        }
      },
    }));

    useEffect(() => {
      if (!siteKey) return;

      const scriptId = 'cloudflare-turnstile-script';
      let script = document.getElementById(scriptId) as HTMLScriptElement;

      const renderWidget = () => {
        if (turnstileRef.current && window.turnstile) {
          // If a widget already exists, remove it first (cleanup)
          if (widgetIdRef.current) {
            window.turnstile.remove(widgetIdRef.current);
          }

          widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
            sitekey: siteKey,
            callback: onVerify,
            'error-callback': onError,
            'expired-callback': onExpire,
            theme,
          });
          onReady?.();
        } else {
          onLoadError?.();
        }
      };

      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        script.async = true;
        script.defer = true;
        script.onload = renderWidget;
        script.onerror = onLoadError ?? null;
        document.body.appendChild(script);
      } else if (window.turnstile) {
        // If script is already loaded
        renderWidget();
      } else {
        // Script exists but maybe not fully loaded, add listener
        // (Note: simplest way is usually to trust the existing script onload,
        // but if multiple components use it, we might need a more robust loader.
        // For now, simpler is better given the likely single usage).
        // If window.turnstile is missing but script exists, it might be loading.
        // We can just poll or hook into onload if possible, but let's assume
        // standard flow for now.
        const originalOnLoad = script.onload;
        script.onload = (e) => {
          if (typeof originalOnLoad === 'function') {
            originalOnLoad.call(script, e);
          }
          renderWidget();
        };
      }

      return () => {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = '';
        }
        // We don't remove the script tag to avoid breaking other instances if any,
        // or re-loading penalties.
      };
    }, [siteKey, theme, onVerify, onError, onExpire, onReady, onLoadError]);

    return <div ref={turnstileRef} />;
  },
);

Turnstile.displayName = 'Turnstile';
