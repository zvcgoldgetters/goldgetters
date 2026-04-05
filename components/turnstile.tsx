'use client';

import {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  type ForwardedRef,
} from 'react';

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

const widgetIds = new WeakMap<HTMLDivElement, string>();

function TurnstileRender(
  {
    siteKey,
    onVerify,
    onError,
    onExpire,
    onReady,
    onLoadError,
    theme = 'auto',
  }: TurnstileProps,
  ref: ForwardedRef<TurnstileRef>,
) {
  const turnstileRef = useRef<HTMLDivElement>(null);

  const getWidgetId = () => {
    const element = turnstileRef.current;
    if (!element) {
      return '';
    }
    return widgetIds.get(element) ?? '';
  };

  const setWidgetId = (widgetId: string) => {
    const element = turnstileRef.current;
    if (element) {
      widgetIds.set(element, widgetId);
    }
  };

  const clearWidgetId = () => {
    const element = turnstileRef.current;
    if (element) {
      widgetIds.delete(element);
    }
  };

  useImperativeHandle(ref, () => ({
    reset: () => {
      const widgetId = getWidgetId();
      if (widgetId && window.turnstile) {
        window.turnstile.reset(widgetId);
      }
    },
  }));

  useEffect(() => {
    if (!siteKey) {
      return;
    }

    const scriptId = 'cloudflare-turnstile-script';
    const existingScript = document.getElementById(scriptId);
    const script: HTMLScriptElement | null =
      existingScript instanceof HTMLScriptElement ? existingScript : null;

    const renderWidget = () => {
      if (turnstileRef.current && window.turnstile) {
        // If a widget already exists, remove it first (cleanup)
        const currentWidgetId = getWidgetId();
        if (currentWidgetId) {
          window.turnstile.remove(currentWidgetId);
        }

        const widgetId = window.turnstile.render(turnstileRef.current, {
          sitekey: siteKey,
          callback: onVerify,
          'error-callback': onError,
          'expired-callback': onExpire,
          theme,
        });
        setWidgetId(widgetId);
        onReady?.();
      } else {
        onLoadError?.();
      }
    };

    if (!script) {
      const createdScript = document.createElement('script');
      createdScript.setAttribute('id', scriptId);
      createdScript.setAttribute(
        'src',
        'https://challenges.cloudflare.com/turnstile/v0/api.js',
      );
      createdScript.setAttribute('async', '');
      createdScript.setAttribute('defer', '');
      createdScript.addEventListener('load', renderWidget);
      if (onLoadError) {
        createdScript.addEventListener('error', onLoadError);
      }
      document.body.appendChild(createdScript);
    } else if (window.turnstile) {
      // If script is already loaded
      renderWidget();
    } else {
      // Script exists but maybe not fully loaded, add listener
      script.addEventListener('load', renderWidget);
    }

    return () => {
      const widgetId = getWidgetId();
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId);
        clearWidgetId();
      }
      if (script) {
        script.removeEventListener('load', renderWidget);
        if (onLoadError) {
          script.removeEventListener('error', onLoadError);
        }
      }
    };
  }, [siteKey, theme, onVerify, onError, onExpire, onReady, onLoadError]);

  return <div ref={turnstileRef} />;
}

export const Turnstile = forwardRef<TurnstileRef, TurnstileProps>(
  TurnstileRender,
);
