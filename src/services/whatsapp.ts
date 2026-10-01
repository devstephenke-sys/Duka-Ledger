interface WhatsAppResponse {
  success: boolean;
  error?: string;
}

class WhatsAppService {
  private phoneNumberId: string;
  private accessToken: string;
  private apiUrl: string;

  constructor() {
    this.phoneNumberId = process.env['WHATSAPP_PHONE_NUMBER_ID'] || '';
    this.accessToken = process.env['WHATSAPP_ACCESS_TOKEN'] || '';
    this.apiUrl = `https://graph.facebook.com/v25.0/${this.phoneNumberId}/messages`;
  }

  async sendMessage(to: string, text: string): Promise<WhatsAppResponse> {
    try {
      if (!this.phoneNumberId || !this.accessToken) {
        console.error('WhatsApp credentials not configured');
        return { success: false, error: 'WhatsApp credentials not configured' };
      }

      const payload = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: text },
      };

      console.log('Sending WhatsApp message to:', to);
      console.log('Using Phone Number ID:', this.phoneNumberId);
      console.log('API URL:', this.apiUrl);
      console.log('Payload:', JSON.stringify(payload, null, 2));

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('WhatsApp API error:', response.status, errorText);
        return { success: false, error: `API error: ${response.status}` };
      }

      const data = await response.json();
      console.log('WhatsApp message sent successfully:', data);
      return { success: true };
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return { success: false, error: String(error) };
    }
  }
}

const whatsappService = new WhatsAppService();
export default whatsappService;