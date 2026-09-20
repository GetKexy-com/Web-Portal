import { Injectable } from '@angular/core';

import { environment } from '../../environments/environment';

/**
 * The slice of the Gleap SDK this app uses.
 *
 * Declared structurally rather than imported from the package so nothing here creates a
 * static dependency on it — the whole point of this service is that `gleap` is reached
 * only through a dynamic `import()`.
 */
interface GleapSdk {
  initialize(key: string): void;
  identify(id: string, data: Record<string, unknown>): void;
  open(): void;
}

/**
 * Loads the Gleap support widget on demand instead of at bootstrap.
 *
 * It used to be imported and initialised at module scope in `AppComponent`, which put
 * ~233 kB of minified SDK — about a quarter of the initial bundle — in front of first
 * paint for a widget most sessions never open. Behind a dynamic `import()` it becomes
 * its own lazy chunk and is fetched when the browser is idle.
 *
 * Every method is failure-tolerant on purpose: a blocked or unreachable support widget
 * must never break the page it sits on.
 */
@Injectable({ providedIn: 'root' })
export class GleapService {
  /**
   * The one in-flight or settled load. Memoised so concurrent callers share a single
   * fetch and `initialize` runs exactly once, which the SDK requires.
   */
  private sdk: Promise<GleapSdk> | null = null;

  /**
   * Fetches and initialises the SDK, or returns the existing load.
   *
   * A failed load clears the memo so a later call can retry — a transient network
   * failure should not disable support for the rest of the session.
   */
  load(): Promise<GleapSdk> {
    if (!this.sdk) {
      this.sdk = import('gleap')
        .then(({ default: Gleap }) => {
          const sdk = Gleap as unknown as GleapSdk;
          sdk.initialize(environment.GLEAP_KEY);
          return sdk;
        })
        .catch((error) => {
          this.sdk = null;
          throw error;
        });
    }
    return this.sdk;
  }

  /**
   * Starts the load once the browser is idle, so it competes with nothing that the user
   * is waiting on. Call this once, after the app has rendered.
   */
  preload(): void {
    const start = () => void this.load().catch(() => undefined);

    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(start, { timeout: 5000 });
    } else {
      // Safari has no requestIdleCallback; a macrotask still puts this after first paint.
      setTimeout(start, 2000);
    }
  }

  /** Attaches the signed-in user to their support conversation. */
  async identify(id: string, data: Record<string, unknown>): Promise<void> {
    try {
      (await this.load()).identify(id, data);
    } catch {
      // Support metadata is not worth an error to the user.
    }
  }

  /** Opens the support widget, loading it first if it is not up yet. */
  async open(): Promise<void> {
    try {
      (await this.load()).open();
    } catch {
      // Nothing useful to offer here; the widget simply does not appear.
    }
  }

  /**
   * Resolves once the SDK has loaded, or immediately if it cannot. For callers that need
   * to touch the DOM the widget creates rather than the SDK itself.
   */
  async whenLoaded(): Promise<void> {
    try {
      await this.load();
    } catch {
      // Swallowed: the caller must cope with the widget being absent anyway.
    }
  }
}
