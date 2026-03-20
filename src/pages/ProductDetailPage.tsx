
import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowRight, ShoppingCart, Check, Package, Truck, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { formatPrice, getWhatsAppLink, calculateDiscount } from '@/lib/utils';
import { useCart } from '@/hooks/use-cart';
import { useProducts } from '@/hooks/use-products';
import { toast } from 'sonner';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const products = useProducts();
  const product = useMemo(
    () => (id ? products.find((item) => item.id === id) || null : null),
    [id, products]
  );
  const [selectedImage, setSelectedImage] = useState(0);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();

  useEffect(() => {
    setSelectedImage(0);
  }, [product?.id]);

  useEffect(() => {
    if (!product) return;
    setQuantity((prev) => Math.min(Math.max(1, prev), Math.max(1, product.stock)));
  }, [product]);

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">المنتج غير موجود</h1>
        <Button asChild>
          <Link to="/products">العودة للمنتجات</Link>
        </Button>
      </div>
    );
  }

  const discount = calculateDiscount(product.price, product.salePrice);

  const handleAddToCart = () => {
    const result = addToCart(product.id, quantity);
    if (!result.success) {
      toast.error(
        result.reason === 'out_of_stock'
          ? 'المنتج غير متوفر حاليًا'
          : `المخزون المتاح حاليًا هو ${result.availableStock ?? product.stock} فقط`
      );
      return;
    }

    toast.success('تمت إضافة المنتج إلى السلة');
  };

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      {/* Breadcrumb */}
      <div className="mb-4 md:mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/products">
            <ArrowRight className="w-4 h-4 ml-2" />
            العودة للمنتجات
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:gap-10 lg:grid-cols-2 lg:gap-12">
        {/* Images */}
        <div>
          {/* Main Image */}
          <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
            <img
              src={product.images[selectedImage]}
              alt={product.name}
              className="h-full w-full cursor-zoom-in object-contain p-2"
              onClick={() => setIsImageOpen(true)}
            />
            {discount > 0 && (
              <Badge className="absolute top-3 right-3 bg-green-600 px-2 py-1 text-sm md:top-4 md:right-4 md:px-3 md:text-base">
                <Tag className="w-4 h-4 ml-1" />
                خصم {discount}%
              </Badge>
            )}
          </div>

          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2 sm:gap-4">
              {product.images.map((image, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  onClick={() => setSelectedImage(index)}
                  aria-label={`عرض الصورة ${index + 1} من ${product.images.length}`}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-all p-0 ${
                    selectedImage === index ? 'border-primary' : 'border-transparent'
                  }`}
                >
                  <img src={image} alt={`صورة ${index + 1} من ${product.images.length}`} className="h-full w-full object-contain p-1" />
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          {/* Category */}
          <p className="text-primary font-medium mb-2">{product.category}</p>

          {/* Name */}
          <h1 className="mb-3 text-2xl font-bold leading-tight sm:mb-4 sm:text-3xl md:text-4xl">{product.name}</h1>

          {/* Price */}
          <div className="mb-5 flex flex-wrap items-end gap-2 sm:gap-4 md:mb-6">
            {product.salePrice ? (
              <>
                <span className="text-2xl font-bold text-primary sm:text-3xl md:text-4xl">
                  {formatPrice(product.salePrice)}
                </span>
                <span className="text-lg text-muted-foreground line-through sm:text-xl md:text-2xl">
                  {formatPrice(product.price)}
                </span>
              </>
            ) : (
              <span className="text-2xl font-bold text-primary sm:text-3xl md:text-4xl">
                {formatPrice(product.price)}
              </span>
            )}
          </div>

          {/* Stock Status */}
          <div className="mb-6">
            {product.inStock ? (
              <div className="flex items-center gap-2 text-green-600">
                <Check className="w-5 h-5" />
                <span className="font-medium">متوفر في المخزون ({product.stock} قطعة)</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600">
                <Package className="w-5 h-5" />
                <span className="font-medium">غير متوفر حالياً</span>
              </div>
            )}
          </div>

          {/* Specifications */}
          <div className="mb-6 md:mb-8">
            <h2 className="font-bold text-xl mb-3">المواصفات</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">اللون</p>
                <p className="font-medium">{product.color}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">الفئة</p>
                <p className="font-medium">{product.category}</p>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          {product.deliveryInfo && (
            <div className="mb-6 space-y-3 md:mb-8">
              {product.deliveryInfo && (
                <div className="flex items-center gap-3 text-sm">
                  <Truck className="w-5 h-5 text-primary" />
                  <span>{product.deliveryInfo}</span>
                </div>
              )}
            </div>
          )}

          {/* CTA */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-muted-foreground">الكمية</span>
              <div className="flex items-center border rounded-md overflow-hidden">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-none"
                  onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                >
                  -
                </Button>
                <span className="w-10 text-center text-sm font-medium sm:w-12 sm:text-base">{quantity}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-none"
                  onClick={() => {
                    if (quantity >= product.stock) {
                      toast.info(`الحد الأقصى المتاح هو ${product.stock}`);
                      return;
                    }
                    setQuantity((prev) => Math.min(product.stock, prev + 1));
                  }}
                >
                  +
                </Button>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full text-base md:text-lg"
              disabled={!product.inStock}
              onClick={handleAddToCart}
            >
              <ShoppingCart className="w-5 h-5 ml-2" />
              {product.inStock ? 'إضافة إلى السلة' : 'غير متوفر'}
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="w-full text-base md:text-lg"
              disabled={!product.inStock}
              onClick={() => window.open(getWhatsAppLink(product), '_blank', 'noopener,noreferrer')}
            >
              طلب مباشر عبر واتساب
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isImageOpen} onOpenChange={setIsImageOpen}>
        <DialogContent className="max-w-[95vw] p-2 sm:max-w-5xl">
          <DialogTitle className="sr-only">معاينة صورة المنتج</DialogTitle>
          <DialogDescription className="sr-only">
            عرض مكبر للصورة الحالية من المنتج {product.name}.
          </DialogDescription>
          <img
            src={product.images[selectedImage]}
            alt={product.name}
            className="max-h-[88vh] w-full object-contain"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
