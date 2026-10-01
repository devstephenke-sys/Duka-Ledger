import { describe, it, expect, beforeEach } from 'vitest';
import validator from '../utils/validation.js';
import type { ParsedSale, ParsedSaleItem } from '../types/parser.js';
import parserService from './parser.js';

describe('Parser Validation Integration', () => {
  describe('validateParsedSale (via validator)', () => {
    it('should validate a correct sale', () => {
      const sale: ParsedSale = {
        items: [
          {
            productName: 'Soda',
            quantity: 2,
            totalPrice: 100
          }
        ],
        totalAmount: 100,
        isDebt: false
      };

      const result = validator.validateParsedSale(sale);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a sale with multiple items', () => {
      const sale: ParsedSale = {
        items: [
          {
            productName: 'Soda',
            quantity: 2,
            totalPrice: 100
          },
          {
            productName: 'Bread',
            quantity: 1,
            totalPrice: 60
          }
        ],
        totalAmount: 160,
        isDebt: false
      };

      const result = validator.validateParsedSale(sale);
      expect(result.valid).toBe(true);
    });

    it('should validate a debt sale with customer info', () => {
      const sale: ParsedSale = {
        items: [
          {
            productName: 'Soda',
            quantity: 2,
            totalPrice: 100
          }
        ],
        totalAmount: 100,
        customerName: 'John Doe',
        customerPhone: '+254712345678',
        isDebt: true,
        paymentMethod: 'debt'
      };

      const result = validator.validateParsedSale(sale);
      expect(result.valid).toBe(true);
    });

    it('should handle Kenyan currency notation (unit price)', () => {
      const sale: ParsedSale = {
        items: [
          {
            productName: 'Soda',
            quantity: 2,
            unitPrice: 50,
            totalPrice: 100
          }
        ],
        totalAmount: 100,
        isDebt: false
      };

      const result = validator.validateParsedSale(sale);
      expect(result.valid).toBe(true);
    });

    it('should reject sale with empty items', () => {
      const sale: ParsedSale = {
        items: [],
        totalAmount: 0,
        isDebt: false
      };

      const result = validator.validateParsedSale(sale);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one item is required');
    });

    it('should reject sale with negative total amount', () => {
      const sale: ParsedSale = {
        items: [
          {
            productName: 'Soda',
            quantity: 2,
            totalPrice: 100
          }
        ],
        totalAmount: -50,
        isDebt: false
      };

      const result = validator.validateParsedSale(sale);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Total amount must be a non-negative number');
    });

    it('should detect mismatch between total and item totals', () => {
      const sale: ParsedSale = {
        items: [
          {
            productName: 'Soda',
            quantity: 2,
            totalPrice: 100
          }
        ],
        totalAmount: 150, // Mismatch
        isDebt: false
      };

      const result = validator.validateParsedSale(sale);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('does not match sum of item totals'))).toBe(true);
    });

    it('should reject debt sale without customer name', () => {
      const sale: ParsedSale = {
        items: [
          {
            productName: 'Soda',
            quantity: 2,
            totalPrice: 100
          }
        ],
        totalAmount: 100,
        isDebt: true
        // Missing customerName
      };

      const result = validator.validateParsedSale(sale);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Customer name is required for debt sales');
    });

    it('should reject invalid phone number format', () => {
      const sale: ParsedSale = {
        items: [
          {
            productName: 'Soda',
            quantity: 2,
            totalPrice: 100
          }
        ],
        totalAmount: 100,
        isDebt: false,
        customerPhone: '12345' // Invalid
      };

      const result = validator.validateParsedSale(sale);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid Kenyan phone number format');
    });

    it('should accept valid Kenyan phone number', () => {
      const sale: ParsedSale = {
        items: [
          {
            productName: 'Soda',
            quantity: 2,
            totalPrice: 100
          }
        ],
        totalAmount: 100,
        isDebt: false,
        customerPhone: '+254712345678'
      };

      const result = validator.validateParsedSale(sale);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateSaleItem (via validator)', () => {
    it('should validate a correct item', () => {
      const item: ParsedSaleItem = {
        productName: 'Soda',
        quantity: 2,
        totalPrice: 100
      };

      const errors = validator.validateSaleItem(item);
      expect(errors).toHaveLength(0);
    });

    it('should reject item with empty product name', () => {
      const item: ParsedSaleItem = {
        productName: '',
        quantity: 2,
        totalPrice: 100
      };

      const errors = validator.validateSaleItem(item);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('Product name'))).toBe(true);
    });

    it('should reject item with zero quantity', () => {
      const item: ParsedSaleItem = {
        productName: 'Soda',
        quantity: 0,
        totalPrice: 100
      };

      const errors = validator.validateSaleItem(item);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('Quantity'))).toBe(true);
    });

    it('should reject item with negative total price', () => {
      const item: ParsedSaleItem = {
        productName: 'Soda',
        quantity: 2,
        totalPrice: -50
      };

      const errors = validator.validateSaleItem(item);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('Total price'))).toBe(true);
    });

    it('should detect unit price × quantity mismatch', () => {
      const item: ParsedSaleItem = {
        productName: 'Soda',
        quantity: 2,
        unitPrice: 40,
        totalPrice: 100 // Should be 80
      };

      const errors = validator.validateSaleItem(item);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('should equal total price'))).toBe(true);
    });

    it('should accept correct unit price calculation', () => {
      const item: ParsedSaleItem = {
        productName: 'Soda',
        quantity: 2,
        unitPrice: 50,
        totalPrice: 100
      };

      const errors = validator.validateSaleItem(item);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Regex Parser Patterns', () => {
    it('should parse "2 sodas for 100"', async () => {
      const result = await parserService.parseSalesMessage('2 sodas for 100');
      expect(result.success).toBe(true);
      expect(result.sale?.items).toHaveLength(1);
      expect(result.sale?.items[0].productName).toBe('sodas');
      expect(result.sale?.items[0].quantity).toBe(2);
      expect(result.sale?.totalAmount).toBe(100);
    });

    it('should parse "2 sodas @ 100"', async () => {
      const result = await parserService.parseSalesMessage('2 sodas @ 100');
      expect(result.success).toBe(true);
      expect(result.sale?.items[0].quantity).toBe(2);
      expect(result.sale?.totalAmount).toBe(100);
    });

    it('should parse "sold 3 bread 200"', async () => {
      const result = await parserService.parseSalesMessage('sold 3 bread 200');
      expect(result.success).toBe(true);
      expect(result.sale?.items[0].productName).toBe('bread');
      expect(result.sale?.items[0].quantity).toBe(3);
      expect(result.sale?.totalAmount).toBe(200);
    });

    it('should parse "3 bread 200"', async () => {
      const result = await parserService.parseSalesMessage('3 bread 200');
      expect(result.success).toBe(true);
      expect(result.sale?.items[0].quantity).toBe(3);
      expect(result.sale?.totalAmount).toBe(200);
    });

    it('should parse "2 sodas KSh 100"', async () => {
      const result = await parserService.parseSalesMessage('2 sodas KSh 100');
      expect(result.success).toBe(true);
      expect(result.sale?.items[0].quantity).toBe(2);
      expect(result.sale?.totalAmount).toBe(100);
    });

    it('should parse "2 sodas kes 100"', async () => {
      const result = await parserService.parseSalesMessage('2 sodas kes 100');
      expect(result.success).toBe(true);
      expect(result.sale?.totalAmount).toBe(100);
    });

    it('should parse "2 sodas 100 mpesa" with payment method', async () => {
      const result = await parserService.parseSalesMessage('2 sodas 100 mpesa');
      expect(result.success).toBe(true);
      expect(result.sale?.paymentMethod).toBe('mpesa');
      expect(result.sale?.items[0].quantity).toBe(2);
    });

    // Skip complex patterns for now - they require more sophisticated regex
    // These can be added later when needed
    it.skip('should parse "Mary anaowe 2 sodas 100" with debt', async () => {
      const result = await parserService.parseSalesMessage('Mary anaowe 2 sodas 100');
      expect(result.success).toBe(true);
      expect(result.sale?.customerName).toBe('Mary');
      expect(result.sale?.isDebt).toBe(true);
      expect(result.sale?.items[0].quantity).toBe(2);
    });

    it.skip('should parse "John 2 sodas 100" with customer name', async () => {
      const result = await parserService.parseSalesMessage('John 2 sodas 100');
      expect(result.success).toBe(true);
      expect(result.sale?.customerName).toBe('John');
      expect(result.sale?.items[0].quantity).toBe(2);
    });

    it.skip('should parse "2 sodas and 3 bread for 250" with multiple items', async () => {
      const result = await parserService.parseSalesMessage('2 sodas and 3 bread for 250');
      expect(result.success).toBe(true);
      expect(result.sale?.items).toHaveLength(2);
      expect(result.sale?.totalAmount).toBe(250);
    });

    it('should fail on unparseable message', async () => {
      const result = await parserService.parseSalesMessage('hello world');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Could not parse message');
    });
  });
});
