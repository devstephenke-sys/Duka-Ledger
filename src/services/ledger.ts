import prisma from '../db/client.js';
import type { ParsedSale } from '../types/parser.js';
import validator from '../utils/validation.js';

interface LedgerResponse {
  success: boolean;
  error?: string;
  data?: any;
}

class LedgerService {
  // Create or get business by phone number
  async getOrCreateBusiness(phone: string, ownerName?: string): Promise<LedgerResponse> {
    try {
      let business = await prisma.business.findUnique({
        where: { owner_phone: phone }
      });

      if (!business) {
        business = await prisma.business.create({
          data: {
            owner_phone: phone,
            owner_name: ownerName || 'Shop Owner'
          }
        });
      }

      return { success: true, data: business };
    } catch (error) {
      console.error('Error getting/creating business:', error);
      return { success: false, error: String(error) };
    }
  }

  // Record a sale from parsed data
  async recordSale(businessId: string, parsedSale: ParsedSale, rawMessage: string): Promise<LedgerResponse> {
    try {
      // Validate parsed sale
      const validation = validator.validateParsedSale(parsedSale);
      if (!validation.valid) {
        return { success: false, error: `Validation failed: ${validation.errors.join(', ')}` };
      }

      // Create sale record for each item
      const sales = [];
      for (const item of parsedSale.items) {
        // Try to find existing product
        let product = await prisma.product.findFirst({
          where: {
            business_id: businessId,
            name: {
              mode: 'insensitive',
              equals: item.productName
            }
          }
        });

        // Create product if doesn't exist
        if (!product) {
          product = await prisma.product.create({
            data: {
              business_id: businessId,
              name: item.productName,
              unit_price: item.unitPrice || item.totalPrice / item.quantity,
              stock_qty: 0
            }
          });
        }

        // Create sale record
        const sale = await prisma.sale.create({
          data: {
            business_id: businessId,
            product_id: product.id,
            description: `${item.quantity}x ${item.productName}`,
            amount: item.totalPrice,
            quantity: item.quantity,
            raw_message: rawMessage,
            source: 'MANUAL'
          }
        });

        sales.push(sale);
      }

      // Create debt record if applicable
      if (parsedSale.isDebt && parsedSale.customerName) {
        await prisma.debt.create({
          data: {
            business_id: businessId,
            customer_name: parsedSale.customerName,
            customer_phone: parsedSale.customerPhone || null,
            amount_owed: parsedSale.totalAmount,
            status: 'OPEN'
          }
        });
      }

      return { success: true, data: sales };
    } catch (error) {
      console.error('Error recording sale:', error);
      return { success: false, error: String(error) };
    }
  }

  // Get all sales for a business
  async getSales(businessId: string, limit = 50): Promise<LedgerResponse> {
    try {
      const sales = await prisma.sale.findMany({
        where: { business_id: businessId },
        include: { product: true },
        orderBy: { created_at: 'desc' },
        take: limit
      });

      return { success: true, data: sales };
    } catch (error) {
      console.error('Error getting sales:', error);
      return { success: false, error: String(error) };
    }
  }

  // Get total sales for a business
  async getTotalSales(businessId: string): Promise<LedgerResponse> {
    try {
      const result = await prisma.sale.aggregate({
        where: { business_id: businessId },
        _sum: { amount: true }
      });

      return { success: true, data: { total: result._sum.amount || 0 } };
    } catch (error) {
      console.error('Error getting total sales:', error);
      return { success: false, error: String(error) };
    }
  }

  // Get open debts for a business
  async getDebts(businessId: string): Promise<LedgerResponse> {
    try {
      const debts = await prisma.debt.findMany({
        where: {
          business_id: businessId,
          status: 'OPEN'
        },
        orderBy: { created_at: 'desc' }
      });

      return { success: true, data: debts };
    } catch (error) {
      console.error('Error getting debts:', error);
      return { success: false, error: String(error) };
    }
  }

  // Settle a debt
  async settleDebt(debtId: string): Promise<LedgerResponse> {
    try {
      const debt = await prisma.debt.update({
        where: { id: debtId },
        data: {
          status: 'SETTLED',
          settled_at: new Date()
        }
      });

      return { success: true, data: debt };
    } catch (error) {
      console.error('Error settling debt:', error);
      return { success: false, error: String(error) };
    }
  }

  // Get products for a business
  async getProducts(businessId: string): Promise<LedgerResponse> {
    try {
      const products = await prisma.product.findMany({
        where: { business_id: businessId },
        orderBy: { name: 'asc' }
      });

      return { success: true, data: products };
    } catch (error) {
      console.error('Error getting products:', error);
      return { success: false, error: String(error) };
    }
  }

  // Update product stock
  async updateStock(productId: string, quantity: number): Promise<LedgerResponse> {
    try {
      const product = await prisma.product.update({
        where: { id: productId },
        data: { stock_qty: quantity }
      });

      return { success: true, data: product };
    } catch (error) {
      console.error('Error updating stock:', error);
      return { success: false, error: String(error) };
    }
  }
}

const ledgerService = new LedgerService();
export default ledgerService;
