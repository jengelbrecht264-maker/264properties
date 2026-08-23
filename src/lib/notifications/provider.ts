export interface NotificationMessage {
  to: string; // email address
  subject: string;
  body: string;
}

export interface NotificationProvider {
  send(message: NotificationMessage): Promise<void>;
}

/** Logs instead of sending — the default when EMAIL_PROVIDER_API_KEY is unset. */
export class MockEmailProvider implements NotificationProvider {
  async send(message: NotificationMessage): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`[MockEmailProvider] would send to ${message.to}: ${message.subject}`);
  }
}

/**
 * Swap this for a real provider (Resend, SendGrid, Postmark, etc.) by
 * implementing NotificationProvider and returning it here once
 * EMAIL_PROVIDER_API_KEY is set. Kept as a single seam so the rest of the
 * app never imports a specific email vendor's SDK directly.
 */
export function getNotificationProvider(): NotificationProvider {
  if (!process.env.EMAIL_PROVIDER_API_KEY) {
    return new MockEmailProvider();
  }
  // TODO: return new ResendProvider(process.env.EMAIL_PROVIDER_API_KEY) or similar.
  return new MockEmailProvider();
}
