import { useEffect, useMemo, useState } from 'react';
import {
  addToCart,
  clearCart,
  getCartCount,
  getCartEventName,
  getCartItems,
  getCartLines,
  removeFromCart,
  updateCartItemQuantity
} from '@/lib/cart';
import { CartItem, Product } from '@/types';

type CartLine = {
  product: Product;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(() => getCartItems());
  const [lines, setLines] = useState<CartLine[]>(() => getCartLines());
  const [count, setCount] = useState<number>(() => getCartCount());

  useEffect(() => {
    const sync = () => {
      setItems(getCartItems());
      setLines(getCartLines());
      setCount(getCartCount());
    };

    const eventName = getCartEventName();
    window.addEventListener(eventName, sync);
    window.addEventListener('storage', sync);

    return () => {
      window.removeEventListener(eventName, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + line.lineTotal, 0),
    [lines]
  );

  return {
    items,
    lines,
    count,
    subtotal,
    addToCart,
    updateItemQuantity: updateCartItemQuantity,
    removeItem: removeFromCart,
    clearCart
  };
}
