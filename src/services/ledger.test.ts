import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ledger from './ledger.js';
import prisma from '../db/client.js';

// Mock Prisma client
vi.mock('../db/client.js', () => ({
  default: {
    business: {
      findUnique: vi.fn(),
      create: vi.fn()
    },
    product: {
      findFirst: vi.fn(),
      create: vi.fn()
    },
    sale: {
      create: vi.fn(),
      findMany: vi.fn(),
      aggregate: vi.fn()
    },
    debt: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn()
    }
  }
}));

describe('LedgerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getOrCreateBusiness', () => {
    it('should return existing business', async () => {
      const mockBusiness = {
        id: '123',
        owner_phone: '+254712345678',
        owner_name: 'John Doe'
      };
      (prisma.business.findUnique as any).mockResolvedValue(mockBusiness);

      const result = await ledger.getOrCreateBusiness('+254712345678');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockBusiness);
      expect(prisma.business.create).not.toHaveBeenCalled();
    });

    it('should create new business if not exists', async () => {
      (prisma.business.findUnique as any).mockResolvedValue(null);
      const mockBusiness = {
        id: '123',
        owner_phone: '+254712345678',
        owner_name: 'Shop Owner'
      };
      (prisma.business.create as any).mockResolvedValue(mockBusiness);

      const result = await ledger.getOrCreateBusiness('+254712345678');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockBusiness);
      expect(prisma.business.create).toHaveBeenCalledWith({
        data: {
          owner_phone: '+254712345678',
          owner_name: 'Shop Owner'
        }
      });
    });

    it('should use provided owner name', async () => {
      (prisma.business.findUnique as any).mockResolvedValue(null);
      const mockBusiness = {
        id: '123',
        owner_phone: '+254712345678',
        owner_name: 'John Doe'
      };
      (prisma.business.create as any).mockResolvedValue(mockBusiness);

      const result = await ledger.getOrCreateBusiness('+254712345678', 'John Doe');

      expect(result.success).toBe(true);
      expect(prisma.business.create).toHaveBeenCalledWith({
        data: {
          owner_phone: '+254712345678',
          owner_name: 'John Doe'
        }
      });
    });
  });

  describe('recordSale', () => {
    it('should record a simple sale', async () => {
      const parsedSale = {
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

      const mockProduct = {
        id: 'prod1',
        business_id: 'biz1',
        name: 'Soda',
        unit_price: 50,
        stock_qty: 10
      };
      (prisma.product.findFirst as any).mockResolvedValue(mockProduct);

      const mockSale = {
        id: 'sale1',
        business_id: 'biz1',
        product_id: 'prod1',
        description: '2x Soda',
        amount: 100,
        quantity: 2,
        raw_message: '2 sodas'
      };
      (prisma.sale.create as any).mockResolvedValue(mockSale);

      const result = await ledger.recordSale('biz1', parsedSale, '2 sodas');

      expect(result.success).toBe(true);
      expect(prisma.sale.create).toHaveBeenCalled();
      expect(prisma.debt.create).not.toHaveBeenCalled();
    });

    it('should create product if not exists', async () => {
      const parsedSale = {
        items: [
          {
            productName: 'New Product',
            quantity: 1,
            totalPrice: 50
          }
        ],
        totalAmount: 50,
        isDebt: false
      };

      (prisma.product.findFirst as any).mockResolvedValue(null);

      const mockProduct = {
        id: 'prod1',
        business_id: 'biz1',
        name: 'New Product',
        unit_price: 50,
        stock_qty: 0
      };
      (prisma.product.create as any).mockResolvedValue(mockProduct);

      const mockSale = {
        id: 'sale1',
        business_id: 'biz1',
        product_id: 'prod1',
        description: '1x New Product',
        amount: 50,
        quantity: 1,
        raw_message: '1 new product'
      };
      (prisma.sale.create as any).mockResolvedValue(mockSale);

      const result = await ledger.recordSale('biz1', parsedSale, '1 new product');

      expect(result.success).toBe(true);
      expect(prisma.product.create).toHaveBeenCalledWith({
        data: {
          business_id: 'biz1',
          name: 'New Product',
          unit_price: 50,
          stock_qty: 0
        }
      });
    });

    it('should create debt record for debt sales', async () => {
      const parsedSale = {
        items: [
          {
            productName: 'Soda',
            quantity: 2,
            totalPrice: 100
          }
        ],
        totalAmount: 100,
        isDebt: true,
        customerName: 'John Doe',
        customerPhone: '+254712345678'
      };

      const mockProduct = {
        id: 'prod1',
        business_id: 'biz1',
        name: 'Soda',
        unit_price: 50,
        stock_qty: 10
      };
      (prisma.product.findFirst as any).mockResolvedValue(mockProduct);

      const mockSale = {
        id: 'sale1',
        business_id: 'biz1',
        product_id: 'prod1',
        description: '2x Soda',
        amount: 100,
        quantity: 2,
        raw_message: 'John anaowe 2 sodas'
      };
      (prisma.sale.create as any).mockResolvedValue(mockSale);

      const result = await ledger.recordSale('biz1', parsedSale, 'John anaowe 2 sodas');

      expect(result.success).toBe(true);
      expect(prisma.debt.create).toHaveBeenCalledWith({
        data: {
          business_id: 'biz1',
          customer_name: 'John Doe',
          customer_phone: '+254712345678',
          amount_owed: 100,
          status: 'OPEN'
        }
      });
    });

    it('should validate sale data', async () => {
      const invalidSale = {
        items: [],
        totalAmount: 0,
        isDebt: false
      } as any;

      const result = await ledger.recordSale('biz1', invalidSale, 'invalid');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });
  });

  describe('getTotalSales', () => {
    it('should calculate total sales amount', async () => {
      (prisma.sale.aggregate as any).mockResolvedValue({
        _sum: { amount: 1500 }
      });

      const result = await ledger.getTotalSales('biz1');

      expect(result.success).toBe(true);
      expect(result.data?.total).toBe(1500);
    });

    it('should return 0 for no sales', async () => {
      (prisma.sale.aggregate as any).mockResolvedValue({
        _sum: { amount: null }
      });

      const result = await ledger.getTotalSales('biz1');

      expect(result.success).toBe(true);
      expect(result.data?.total).toBe(0);
    });

    it('should handle errors', async () => {
      (prisma.sale.aggregate as any).mockRejectedValue(new Error('Database error'));

      const result = await ledger.getTotalSales('biz1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });
  });

  describe('getDebts', () => {
    it('should get open debts', async () => {
      const mockDebts = [
        {
          id: 'debt1',
          customer_name: 'John Doe',
          amount_owed: 100,
          status: 'OPEN'
        }
      ];
      (prisma.debt.findMany as any).mockResolvedValue(mockDebts);

      const result = await ledger.getDebts('biz1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDebts);
      expect(prisma.debt.findMany).toHaveBeenCalledWith({
        where: {
          business_id: 'biz1',
          status: 'OPEN'
        },
        orderBy: { created_at: 'desc' }
      });
    });
  });

  describe('settleDebt', () => {
    it('should settle a debt', async () => {
      const mockDebt = {
        id: 'debt1',
        customer_name: 'John Doe',
        amount_owed: 100,
        status: 'SETTLED',
        settled_at: new Date()
      };
      (prisma.debt.update as any).mockResolvedValue(mockDebt);

      const result = await ledger.settleDebt('debt1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDebt);
      expect(prisma.debt.update).toHaveBeenCalledWith({
        where: { id: 'debt1' },
        data: {
          status: 'SETTLED',
          settled_at: expect.any(Date)
        }
      });
    });
  });
});
