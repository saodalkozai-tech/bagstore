import { beforeEach, describe, expect, it, vi } from "vitest";
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
  beforeEach(() => {
    localStorage.clear();
  });

  it("adds and counts items", () => {
    expect(addToCart("p1", 2).success).toBe(true);
    expect(addToCart("p1", 1).success).toBe(true);
    expect(getCartCount()).toBe(3);
    expect(getCartItems()).toEqual([{ productId: "p1", quantity: 3 }]);
  });

  it("updates quantity and removes when set to zero", () => {
    addToCart("p1", 2);
    expect(updateCartItemQuantity("p1", 5).success).toBe(true);
    expect(getCartItems()[0].quantity).toBe(5);

    expect(updateCartItemQuantity("p1", 0).success).toBe(true);
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

  it("caps quantities at available stock", () => {
    expect(addToCart("p1", 10).success).toBe(true);

    const result = addToCart("p1", 2);
    expect(result.success).toBe(false);
    expect(result.reason).toBe("exceeds_stock");
    expect(getCartItems()).toEqual([{ productId: "p1", quantity: 10 }]);
  });
});
