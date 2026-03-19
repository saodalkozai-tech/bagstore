import { describe, expect, it, vi } from "vitest";
import {
  addToCart,
  clearCart,
  getCartCount,
  getCartLines,
  getCartItems,
  removeFromCart,
  updateCartItemQuantity,
} from "@/lib/cart";

vi.mock("@/lib/storage", () => ({
  getProducts: () => [
    {
      id: "p1",
      name: "Bag One",
      price: 100,
      salePrice: 80,
      images: ["/bag.png"],
      category: "cat",
      color: "black",
      stock: 10,
      inStock: true,
      featured: false,
      createdAt: "2024-01-01",
      updatedAt: "2024-01-01",
    },
  ],
}));

describe("cart helpers", () => {
  it("adds and counts items", () => {
    addToCart("p1", 2);
    addToCart("p1", 1);
    expect(getCartCount()).toBe(3);
    expect(getCartItems()).toEqual([{ productId: "p1", quantity: 3 }]);
  });

  it("updates quantity and removes when set to zero", () => {
    addToCart("p1", 2);
    updateCartItemQuantity("p1", 5);
    expect(getCartItems()[0].quantity).toBe(5);

    updateCartItemQuantity("p1", 0);
    expect(getCartItems()).toEqual([]);
  });

  it("builds cart lines with sale price and clears", () => {
    addToCart("p1", 2);
    const lines = getCartLines();
    expect(lines).toHaveLength(1);
    expect(lines[0].unitPrice).toBe(80);
    expect(lines[0].lineTotal).toBe(160);

    removeFromCart("p1");
    expect(getCartItems()).toEqual([]);

    addToCart("p1", 1);
    clearCart();
    expect(getCartItems()).toEqual([]);
  });
});
