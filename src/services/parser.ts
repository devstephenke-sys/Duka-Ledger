import Anthropic from '@anthropic-ai/sdk';
import type { ParsedSale, ParseResult } from '../types/parser.js';
import validator from '../utils/validation.js';

class ParserService {
  private client: Anthropic | null = null;

  constructor() {
    const apiKey = process.env['ANTHROPIC_API_KEY'];
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    }
  }

  private ensureClient(): Anthropic {
    if (!this.client) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }
    return this.client;
  }

  async parseSalesMessage(message: string): Promise<ParseResult> {
    try {
      const client = this.ensureClient();

      const systemPrompt = `You are a sales parser for Kenyan micro-retailers. Parse WhatsApp messages about sales into structured JSON.

Rules:
- Extract product names, quantities, and prices
- Handle Kenyan Shilling (KSh, KES, /-) notation
- Identify debt/credit sales ("anaowe", "ana chuki", "debt", "hakuna")
- Extract customer names/phone numbers when mentioned
- Calculate total amounts from individual items
- Default quantity to 1 if not specified
- Return empty array if no sale detected

Output ONLY valid JSON matching this schema:
{
  "items": [
    {
      "productName": "string",
      "quantity": number,
      "unitPrice": number (optional),
      "totalPrice": number
    }
  ],
  "totalAmount": number,
  "customerName": "string (optional)",
  "customerPhone": "string (optional)",
  "isDebt": boolean,
  "paymentMethod": "cash" | "mpesa" | "debt" (optional),
  "notes": "string (optional)"
}`;

      const response = await client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Parse this sales message: "${message}"`
          }
        ]
      });

      const content = response.content[0];
      if (!content || content.type !== 'text') {
        return {
          success: false,
          error: 'Invalid response from AI',
          rawMessage: message
        };
      }

      // Extract JSON from response (in case of extra text)
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          success: false,
          error: 'No JSON found in AI response',
          rawMessage: message
        };
      }

      const parsedData = JSON.parse(jsonMatch[0]) as ParsedSale;

      // Validate parsed data using validator
      const validation = validator.validateParsedSale(parsedData);
      if (!validation.valid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`,
          rawMessage: message
        };
      }

      return {
        success: true,
        sale: parsedData,
        rawMessage: message
      };
    } catch (error) {
      console.error('Error parsing sales message:', error);
      return {
        success: false,
        error: String(error),
        rawMessage: message
      };
    }
  }
}

const parserService = new ParserService();
export default parserService;
