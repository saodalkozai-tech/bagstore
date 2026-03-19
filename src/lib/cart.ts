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

export function addToCart(productId: string, quantity = 1): void {
  const nextQty = Math.max(1, quantity);
  const items = readCart();
  const index = items.findIndex((item) => item.productId === productId);

  if (index >= 0) {
    items[index] = {
      ...items[index],
      quantity: items[index].quantity + nextQty
    };
  } else {
    items.push({ productId, quantity: nextQty });
  }

  writeCart(items);
}

export function updateCartItemQuantity(productId: string, quantity: number): void {
  const items = readCart();
  const nextQty = Math.max(0, Math.floor(quantity));
  const index = items.findIndex((item) => item.productId === productId);
  if (index < 0) return;

  if (nextQty === 0) {
    const filtered = items.filter((item) => item.productId !== productId);
    writeCart(filtered);
    return;
  }

  items[index] = { ...items[index], quantity: nextQty };
  writeCart(items);
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
