import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingCart, Trash2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCart } from '@/hooks/use-cart';
import { formatPrice, getWhatsAppCartLink } from '@/lib/utils';
import { toast } from 'sonner';

const CUSTOMER_INFO_STORAGE_KEY = 'bagstore_customer_info';

export function CartPage() {
  const { lines, subtotal, updateItemQuantity, removeItem, clearCart } = useCart();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerNote, setCustomerNote] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CUSTOMER_INFO_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        customerName?: string;
        customerPhone?: string;
        customerAddress?: string;
        customerNote?: string;
      };
      setCustomerName(parsed.customerName || '');
      setCustomerPhone(parsed.customerPhone || '');
      setCustomerAddress(parsed.customerAddress || '');
      setCustomerNote(parsed.customerNote || '');
    } catch {
      // Ignore malformed cached customer data.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      CUSTOMER_INFO_STORAGE_KEY,
      JSON.stringify({ customerName, customerPhone, customerAddress, customerNote })
    );
  }, [customerName, customerPhone, customerAddress, customerNote]);

  const handleWhatsAppOrder = () => {
    if (lines.length === 0) return;
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error('يرجى إدخال اسم العميل ورقم الهاتف قبل إرسال الطلب');
      return;
    }

    const link = getWhatsAppCartLink(lines, subtotal, {
      name: customerName.trim(),
      phone: customerPhone.trim(),
      address: customerAddress.trim(),
      note: customerNote.trim()
    });
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  if (lines.length === 0) {
    return (
      <div className="container mx-auto px-4 py-14 text-center md:py-16">
        <ShoppingCart className="w-14 h-14 mx-auto mb-4 text-muted-foreground" />
        <h1 className="mb-3 text-2xl font-bold md:text-3xl">السلة فارغة</h1>
        <p className="text-muted-foreground mb-6">أضف منتجاتك المفضلة ثم أرسل الطلب عبر واتساب.</p>
        <Button asChild>
          <Link to="/products">تصفح المنتجات</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="mb-6 md:mb-8">
        <h1 className="mb-2 text-2xl font-bold sm:text-3xl md:text-4xl">سلة التسوق</h1>
        <p className="text-muted-foreground">عدد المنتجات في السلة: {lines.length}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {lines.map((line) => (
            <Card key={line.product.id}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                  <img
                    src={line.product.images[0]}
                    alt={line.product.name}
                    className="h-40 w-full rounded-md bg-gray-100 object-cover sm:h-24 sm:w-24"
                  />
                  <div className="flex-1">
                    <h2 className="mb-1 text-base font-semibold sm:text-lg">{line.product.name}</h2>
                    <p className="text-sm text-muted-foreground mb-2">{formatPrice(line.unitPrice)}</p>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center border rounded-md overflow-hidden">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-none"
                          onClick={() => updateItemQuantity(line.product.id, line.quantity - 1)}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-10 text-center text-sm font-medium sm:text-base">{line.quantity}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-none"
                          onClick={() => updateItemQuantity(line.product.id, line.quantity + 1)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="font-bold text-primary">{formatPrice(line.lineTotal)}</span>
                        <Button variant="ghost" size="sm" onClick={() => removeItem(line.product.id)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="h-fit lg:sticky lg:top-24">
          <CardContent className="p-5 space-y-4">
            <h2 className="text-xl font-bold">ملخص الطلب</h2>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="customerName">اسم العميل</Label>
              <Input
                id="customerName"
                placeholder="اسم العميل *"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              </div>
              <div className="space-y-1">
                <Label htmlFor="customerPhone">رقم الهاتف</Label>
              <Input
                id="customerPhone"
                placeholder="رقم الهاتف *"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
              </div>
              <div className="space-y-1">
                <Label htmlFor="customerAddress">العنوان</Label>
              <Input
                id="customerAddress"
                placeholder="العنوان"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
              />
              </div>
              <div className="space-y-1">
                <Label htmlFor="customerNote">ملاحظة</Label>
              <Textarea
                id="customerNote"
                placeholder="ملاحظة (اختياري)"
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                rows={3}
              />
              </div>
            </div>
            <div className="flex justify-between">
              <span>الإجمالي</span>
              <span className="font-bold text-primary">{formatPrice(subtotal)}</span>
            </div>
            <Button className="w-full" onClick={handleWhatsAppOrder}>
              <MessageCircle className="w-4 h-4 ml-2" />
              إرسال الطلب عبر واتساب
            </Button>
            <Button variant="outline" className="w-full" onClick={clearCart}>
              تفريغ السلة
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
