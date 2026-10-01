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
      // Enhanced regex patterns for Kenyan sales formats
      // Order matters - more specific patterns first
      
      // Pattern 1: "2 sodas and 3 bread for 250" (multiple items)
      const pattern1 = /(\d+)\s+(\w+)\s+and\s+(\d+)\s+(\w+)\s+(?:for|@)\s+(\d+)/i;
      
      // Pattern 2: "Mary anaowe 2 sodas 100" (debt notation)
      const pattern2 = /(\w+)\s+(?:anaowe|ana chuki|debt|hakuna)\s+(\d+)\s+(\w+)\s+(\d+)/i;
      
      // Pattern 3: "John 2 sodas 100" (customer name at start)
      const pattern3 = /^(\w+)\s+(\d+)\s+(\w+)\s+(\d+)/i;
      
      // Pattern 4: "2 sodas for 100" or "2 sodas @ 100"
      const pattern4 = /(\d+)\s+(\w+)\s+(?:for|@)\s+(\d+)/i;
      
      // Pattern 5: "sold 3 bread 200"
      const pattern5 = /sold\s+(\d+)\s+(\w+)\s+(\d+)/i;
      
      // Pattern 6: "2 sodas KSh 100" or "2 sodas kes 100"
      const pattern6 = /(\d+)\s+(\w+)\s+(?:KSh|KES|ksh|kes)\s*(\d+)/i;
      
      // Pattern 7: "2 sodas 100 mpesa" (payment method)
      const pattern7 = /(\d+)\s+(\w+)\s+(\d+)\s*(?:mpesa|m-pesa|cash)/i;
      
      // Pattern 8: "3 bread 200" (direct - least specific, check last)
      const pattern8 = /(\d+)\s+(\w+)\s+(\d+)/i;

      let match = message.match(pattern1) || 
                  message.match(pattern2) || 
                  message.match(pattern3) || 
                  message.match(pattern4) || 
                  message.match(pattern5) || 
                  message.match(pattern6) || 
                  message.match(pattern7) || 
                  message.match(pattern8);

      if (!match) {
        return {
          success: false,
          error: 'Could not parse message. Try formats like: "2 sodas for 100", "sold 3 bread 200", "2 sodas KSh 100", "Mary anaowe 2 sodas 100"',
          rawMessage: message
        };
      }

      // Determine which pattern matched and extract data accordingly
      let items: any[] = [];
      let totalAmount = 0;
      let customerName: string | undefined;
      let isDebt = false;
      let paymentMethod: string | undefined;

      // Pattern 1: Multiple items
      if (message.match(pattern1)) {
        const qty1 = parseInt(match[1], 10);
        const product1 = match[2].trim();
        const qty2 = parseInt(match[3], 10);
        const product2 = match[4].trim();
        totalAmount = parseInt(match[5], 10);
        
        // Distribute total equally between items
        const unitPrice1 = totalAmount / 2 / qty1;
        const unitPrice2 = totalAmount / 2 / qty2;
        
        items = [
          { productName: product1, quantity: qty1, unitPrice: unitPrice1, totalPrice: (totalAmount / 2) },
          { productName: product2, quantity: qty2, unitPrice: unitPrice2, totalPrice: (totalAmount / 2) }
        ];
      }
      // Pattern 2: Debt notation with customer name
      else if (message.match(pattern2)) {
        customerName = match[1];
        isDebt = true;
        const quantity = parseInt(match[2], 10);
        const productName = match[3].trim();
        totalAmount = parseInt(match[4], 10);
        const unitPrice = totalAmount / quantity;
        
        items = [{ productName, quantity, unitPrice, totalPrice: totalAmount }];
      }
      // Pattern 3: Customer name at start
      else if (message.match(pattern3)) {
        customerName = match[1];
        const quantity = parseInt(match[2], 10);
        const productName = match[3].trim();
        totalAmount = parseInt(match[4], 10);
        const unitPrice = totalAmount / quantity;
        
        items = [{ productName, quantity, unitPrice, totalPrice: totalAmount }];
      }
      // Pattern 7: Payment method
      else if (message.match(pattern7)) {
        const quantity = parseInt(match[1], 10);
        const productName = match[2].trim();
        totalAmount = parseInt(match[3], 10);
        const unitPrice = totalAmount / quantity;
        paymentMethod = 'mpesa';
        
        items = [{ productName, quantity, unitPrice, totalPrice: totalAmount }];
      }
      // Standard patterns (4, 5, 6, 8)
      else {
        const quantity = parseInt(match[1], 10);
        const productName = match[2].trim();
        totalAmount = parseInt(match[3], 10);
        const unitPrice = totalAmount / quantity;
        
        items = [{ productName, quantity, unitPrice, totalPrice: totalAmount }];
      }

      const parsedSale: ParsedSale = {
        items,
        totalAmount,
        isDebt,
        ...(customerName && { customerName }),
        ...(paymentMethod && { paymentMethod })
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
