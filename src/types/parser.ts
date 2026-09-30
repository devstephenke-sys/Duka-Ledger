interface ParsedSaleItem {
  productName: string;
  quantity: number;
  unitPrice?: number;
  totalPrice: number;
}

interface ParsedSale {
  items: ParsedSaleItem[];
  totalAmount: number;
  customerName?: string;
  customerPhone?: string;
  isDebt: boolean;
  paymentMethod?: 'cash' | 'mpesa' | 'debt';
  notes?: string;
}

interface ParseResult {
  success: boolean;
  sale?: ParsedSale;
  error?: string;
  rawMessage: string;
}

export type { ParsedSale, ParsedSaleItem, ParseResult };
