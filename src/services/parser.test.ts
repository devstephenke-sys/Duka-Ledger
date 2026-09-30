import { describe, it, expect } from 'vitest';
import validator from '../utils/validation.js';
import type { ParsedSale, ParsedSaleItem } from '../types/parser.js';

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
});
