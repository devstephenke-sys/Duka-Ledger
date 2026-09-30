import type { ParsedSale, ParsedSaleItem } from '../types/parser.js';

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

class Validator {
  // Validate parsed sale data
  validateParsedSale(sale: ParsedSale): ValidationResult {
    const errors: string[] = [];

    // Check if sale exists
    if (!sale) {
      return { valid: false, errors: ['Sale data is missing'] };
    }

    // Validate items
    if (!sale.items || !Array.isArray(sale.items)) {
      errors.push('Items must be an array');
    } else if (sale.items.length === 0) {
      errors.push('At least one item is required');
    } else {
      sale.items.forEach((item, index) => {
        const itemErrors = this.validateSaleItem(item);
        if (itemErrors.length > 0) {
          errors.push(`Item ${index + 1}: ${itemErrors.join(', ')}`);
        }
      });
    }

    // Validate total amount
    if (typeof sale.totalAmount !== 'number' || sale.totalAmount < 0) {
      errors.push('Total amount must be a non-negative number');
    }

    // Validate calculated total matches item totals
    if (sale.items && sale.items.length > 0) {
      const calculatedTotal = sale.items.reduce((sum, item) => sum + item.totalPrice, 0);
      if (Math.abs(calculatedTotal - sale.totalAmount) > 0.01) {
        errors.push(`Total amount (${sale.totalAmount}) does not match sum of item totals (${calculatedTotal})`);
      }
    }

    // Validate customer phone format if provided
    if (sale.customerPhone) {
      const phoneRegex = /^(\+254|0)?[7]\d{8}$/;
      if (!phoneRegex.test(sale.customerPhone)) {
        errors.push('Invalid Kenyan phone number format');
      }
    }

    // Validate isDebt flag consistency
    if (sale.isDebt && !sale.customerName) {
      errors.push('Customer name is required for debt sales');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate individual sale item
  validateSaleItem(item: ParsedSaleItem): string[] {
    const errors: string[] = [];

    if (!item.productName || typeof item.productName !== 'string' || item.productName.trim() === '') {
      errors.push('Product name is required');
    }

    if (typeof item.quantity !== 'number' || item.quantity <= 0) {
      errors.push('Quantity must be a positive number');
    }

    if (typeof item.totalPrice !== 'number' || item.totalPrice < 0) {
      errors.push('Total price must be a non-negative number');
    }

    if (item.unitPrice !== undefined && (typeof item.unitPrice !== 'number' || item.unitPrice < 0)) {
      errors.push('Unit price must be a non-negative number');
    }

    // Validate that unit price * quantity = total price (within small margin for rounding)
    if (item.unitPrice !== undefined && item.quantity !== undefined) {
      const calculatedTotal = item.unitPrice * item.quantity;
      if (Math.abs(calculatedTotal - item.totalPrice) > 0.01) {
        errors.push(`Unit price (${item.unitPrice}) × quantity (${item.quantity}) should equal total price (${item.totalPrice})`);
      }
    }

    return errors;
  }

  // Validate phone number format
  validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^(\+254|0)?[7]\d{8}$/;
    return phoneRegex.test(phone);
  }

  // Sanitize and format phone number
  formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // If starts with 0, replace with +254
    if (digits.startsWith('0')) {
      return '+254' + digits.substring(1);
    }
    
    // If starts with 7, prepend +254
    if (digits.startsWith('7')) {
      return '+254' + digits;
    }
    
    // If already has country code, ensure it's +254
    if (digits.startsWith('254')) {
      return '+254' + digits.substring(3);
    }
    
    return phone;
  }

  // Validate money amount
  validateAmount(amount: number): boolean {
    return typeof amount === 'number' && amount >= 0 && Number.isFinite(amount);
  }
}

const validator = new Validator();
export default validator;
