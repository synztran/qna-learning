import 'react';

declare module 'react' {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    safe_top?: string | boolean;
    safe_bot?: string | boolean;
  }
}
