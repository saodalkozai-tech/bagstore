import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { getStoreSettings } from "@/lib/storage";
import { Product } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return `${price.toLocaleString('ar-IQ')} د.ع`;
}

export function getWhatsAppLink(product: { name: string; price: number; id: string; salePrice?: number }): string {
  const finalPrice = product.salePrice && product.salePrice > 0 ? product.salePrice : product.price;
  const message = `مرحباً، أود الاستفسار عن المنتج:\n${product.name}\nالسعر: ${formatPrice(finalPrice)}\nرقم المنتج: ${product.id}`;
  const phone = getStoreSettings().whatsapp.replace(/[^\d]/g, "");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function getWhatsAppCartLink(
  lines: Array<{ product: Product; quantity: number; lineTotal: number }>,
  subtotal: number,
  customer?: {
    name: string;
    phone: string;
    address?: string;
    note?: string;
  }
): string {
  const phone = getStoreSettings().whatsapp.replace(/[^\d]/g, "");
  const itemsText = lines
    .map((line, index) => {
      const unitPrice = line.product.salePrice || line.product.price;
      return `${index + 1}. ${line.product.name}\nالكمية: ${line.quantity}\nسعر القطعة: ${formatPrice(unitPrice)}\nالإجمالي: ${formatPrice(line.lineTotal)}`;
    })
    .join('\n\n');

  const customerText = customer
    ? [
        `اسم العميل: ${customer.name}`,
        `رقم الهاتف: ${customer.phone}`,
        customer.address?.trim() ? `العنوان: ${customer.address}` : '',
        customer.note?.trim() ? `ملاحظة: ${customer.note}` : ''
      ]
        .filter(Boolean)
        .join('\n')
    : '';

  const message = `مرحباً، أود طلب المنتجات التالية:\n\n${itemsText}\n\nالإجمالي الكلي: ${formatPrice(subtotal)}${customerText ? `\n\nبيانات العميل:\n${customerText}` : ''}`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function calculateDiscount(price: number, salePrice?: number): number {
  if (!salePrice || salePrice >= price) return 0;
  return Math.round(((price - salePrice) / price) * 100);
}
