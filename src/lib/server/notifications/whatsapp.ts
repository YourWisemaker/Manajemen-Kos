/**
 * WhatsApp Provider — Task 10.2
 *
 * Integrates with Fonnte API for sending WhatsApp messages.
 * Supports interactive buttons (e.g. payment link).
 *
 * Requirements: 9.3
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WaButton {
  text: string;
  url: string;
}

interface FonnteRequestBody {
  target: string;
  message: string;
  url?: string;
  buttonJSON?: string;
}

interface FonnteResponse {
  status: boolean;
  detail?: string;
  id?: string;
}

// ---------------------------------------------------------------------------
// WhatsAppProvider
// ---------------------------------------------------------------------------

export class WhatsAppProvider {
  private readonly apiUrl = "https://api.fonnte.com/send";

  /**
   * Send a WhatsApp message via Fonnte API.
   * Supports optional interactive buttons (rendered as URL buttons).
   *
   * @param phone - Recipient phone number (Indonesian format, e.g. 08xxx or 628xxx)
   * @param body - Message text content
   * @param buttons - Optional interactive buttons with URL links
   */
  async sendMessage(phone: string, body: string, buttons?: WaButton[]): Promise<void> {
    const token = process.env.FONNTE_TOKEN;
    if (!token) {
      console.warn(
        "[whatsapp] FONNTE_TOKEN not set. Skipping WhatsApp message delivery.",
      );
      return;
    }

    // Normalize phone number to international format
    const normalizedPhone = normalizePhoneNumber(phone);

    // Build request body
    const requestBody: FonnteRequestBody = {
      target: normalizedPhone,
      message: body,
    };

    // Add interactive buttons if provided
    if (buttons && buttons.length > 0) {
      // Fonnte supports URL buttons via buttonJSON parameter
      const buttonPayload = buttons.map((btn) => ({
        id: btn.url,
        display_text: btn.text,
        url: btn.url,
      }));
      requestBody.buttonJSON = JSON.stringify(buttonPayload);

      // Also append the URL to the message body as fallback
      // (some WA clients don't render buttons)
      const linkText = buttons.map((btn) => `\n${btn.text}: ${btn.url}`).join("");
      requestBody.message = `${body}${linkText}`;
    }

    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(
        `Fonnte API error: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const result = (await response.json()) as FonnteResponse;

    if (!result.status) {
      throw new Error(`Fonnte delivery failed: ${result.detail ?? "Unknown reason"}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalize Indonesian phone number to international format (628xxx).
 * Handles common formats: 08xxx, +628xxx, 628xxx.
 */
function normalizePhoneNumber(phone: string): string {
  // Remove whitespace and dashes
  let cleaned = phone.replace(/[\s\-()]/g, "");

  // Remove leading +
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }

  // Convert 08xxx to 628xxx
  if (cleaned.startsWith("0")) {
    cleaned = `62${cleaned.slice(1)}`;
  }

  return cleaned;
}
