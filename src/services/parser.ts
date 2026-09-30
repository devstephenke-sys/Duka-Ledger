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
    // Try Claude Haiku first if API key is configured
    if (this.client) {
      try {
        const result = await this.parseWithClaude(message);
        if (result.success) {
          return result;
        }
        // Fall through to regex parser if Claude fails
        console.log('Claude parsing failed, falling back to regex parser');
      } catch (error) {
        console.log('Claude API error, falling back to regex parser:', error);
      }
    }

    // Fallback to regex-based parser
    return this.parseWithRegex(message);
  }

  private async parseWithClaude(message: string): Promise<ParseResult> {
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

Output ONLY valid JSON matching this schema:{
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
      console.error('Error parsing with Claude:', error);
      throw error; // Re-throw to trigger fallback
    }
  }

  private parseWithRegex(message: string): ParseResult {
    try {
      // Simple regex patterns for common sales formats
      // Pattern 1: "2 sodas for 100" or "2 sodas @ 100"
      const pattern1 = /(\d+)\s+(\w+)\s+(?:for|@)\s+(\d+)/i;
      // Pattern 2: "sold 3 bread 200"
      const pattern2 = /sold\s+(\d+)\s+(\w+)\s+(\d+)/i;
      // Pattern 3: "3 bread 200" (direct)
      const pattern3 = /(\d+)\s+(\w+)\s+(\d+)/i;

      let match = message.match(pattern1) || message.match(pattern2) || message.match(pattern3);

      if (!match) {
        return {
          success: false,
          error: 'Could not parse message with regex. Try format like "2 sodas for 100"',
          rawMessage: message
        };
      }

      const quantity = parseInt(match[1], 10);
      const productName = match[2].trim();
      const totalAmount = parseInt(match[3], 10);
      const unitPrice = totalAmount / quantity;

      const parsedSale: ParsedSale = {
        items: [
          {
            productName,
            quantity,
            unitPrice,
            totalPrice: totalAmount
          }
        ],
        totalAmount,
        isDebt: false
      };

      // Validate parsed data
      const validation = validator.validateParsedSale(parsedSale);
      if (!validation.valid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`,
          rawMessage: message
        };
      }

      return {
        success: true,
        sale: parsedSale,
        rawMessage: message
      };
    } catch (error) {
      console.error('Error parsing with regex:', error);
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
