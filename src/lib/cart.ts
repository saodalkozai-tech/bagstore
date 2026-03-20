import { CartItem, Product } from '@/types';
import { getProducts } from '@/lib/storage';

const CART_STORAGE_KEY = 'bagstore_cart';
const CART_EVENT = 'bagstore:cart-updated';

type CartLine = {
  product: Product;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type CartMutationResult = {
  success: boolean;
  quantity?: number;
  availableStock?: number;
  reason?: 'not_found' | 'out_of_stock' | 'exceeds_stock';
};

function readCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as CartItem[]) : [];

    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && typeof item.productId === 'string')
      .map((item) => ({
        productId: item.productId,
        quantity: Math.max(1, Number(item.quantity) || 1)
      }));
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]): void {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CART_EVENT));
}

export function getCartItems(): CartItem[] {
  return readCart();
}

export function getCartCount(): number {
  return readCart().reduce((sum, item) => sum + item.quantity, 0);
}

function getProductStock(productId: string): number | null {
  const product = getProducts().find((item) => item.id === productId);
  if (!product) return null;
  return Math.max(0, Math.floor(product.stock));
}

export function addToCart(productId: string, quantity = 1): CartMutationResult {
  const nextQty = Math.max(1, quantity);
  const items = readCart();
  const index = items.findIndex((item) => item.productId === productId);
  const availableStock = getProductStock(productId);

  if (availableStock === null) {
    return { success: false, reason: 'not_found' };
  }

  if (availableStock <= 0) {
    return { success: false, reason: 'out_of_stock', availableStock: 0 };
  }

  const currentQty = index >= 0 ? items[index].quantity : 0;
  const finalQty = Math.min(availableStock, currentQty + nextQty);

  if (finalQty <= currentQty) {
    return {
      success: false,
      reason: 'exceeds_stock',
      quantity: currentQty,
      availableStock
    };
  }

  if (index >= 0) {
    items[index] = {
      ...items[index],
      quantity: finalQty
    };
  } else {
    items.push({ productId, quantity: finalQty });
  }

  writeCart(items);
  return { success: true, quantity: finalQty, availableStock };
}

export function updateCartItemQuantity(productId: string, quantity: number): CartMutationResult {
  const items = readCart();
  const nextQty = Math.max(0, Math.floor(quantity));
  const index = items.findIndex((item) => item.productId === productId);
  if (index < 0) return { success: false, reason: 'not_found' };

  if (nextQty === 0) {
    const filtered = items.filter((item) => item.productId !== productId);
    writeCart(filtered);
    return { success: true, quantity: 0, availableStock: getProductStock(productId) ?? 0 };
  }

  const availableStock = getProductStock(productId);
  if (availableStock === null) {
    return { success: false, reason: 'not_found' };
  }

  if (availableStock <= 0) {
    return { success: false, reason: 'out_of_stock', availableStock: 0 };
  }

  const finalQty = Math.min(nextQty, availableStock);
  if (finalQty < nextQty) {
    items[index] = { ...items[index], quantity: finalQty };
    writeCart(items);
    return {
      success: false,
      reason: 'exceeds_stock',
      quantity: finalQty,
      availableStock
    };
  }

  items[index] = { ...items[index], quantity: finalQty };
  writeCart(items);
  return { success: true, quantity: finalQty, availableStock };
}

export function removeFromCart(productId: string): void {
  const items = readCart();
  const filtered = items.filter((item) => item.productId !== productId);
  writeCart(filtered);
}

export function clearCart(): void {
  writeCart([]);
}

export function getCartEventName(): string {
  return CART_EVENT;
}

export function getCartLines(): CartLine[] {
  const productsMap = new Map(getProducts().map((product) => [product.id, product]));
  return readCart()
    .map((item) => {
      const product = productsMap.get(item.productId);
      if (!product) return null;
      const unitPrice = product.salePrice || product.price;
      return {
        product,
        quantity: item.quantity,
        unitPrice,
        lineTotal: unitPrice * item.quantity
      };
    })
    .filter((line): line is CartLine => Boolean(line));
}
