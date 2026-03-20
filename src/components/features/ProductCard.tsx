import { Link } from 'react-router-dom';
import { ShoppingCart, Eye, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Product } from '@/types';
import { formatPrice, getWhatsAppLink, calculateDiscount } from '@/lib/utils';
import { useCart } from '@/hooks/use-cart';
import { toast } from 'sonner';
import { useState } from 'react';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const discount = calculateDiscount(product.price, product.salePrice);
  const { addToCart } = useCart();
  const [isImageOpen, setIsImageOpen] = useState(false);

  const handleAddToCart = () => {
    const result = addToCart(product.id, 1);
    if (!result.success) {
      toast.error(
        result.reason === 'out_of_stock'
          ? 'المنتج غير متوفر حاليًا'
          : `لا يمكن تجاوز المخزون المتاح (${result.availableStock ?? product.stock})`
      );
      return;
    }

    toast.success('تمت إضافة المنتج إلى السلة');
  };

  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-all duration-300 hover:shadow-xl">
      {/* Image */}
      <div className="relative overflow-hidden aspect-[4/5] bg-gray-100">
        <img
          src={product.images[0]}
          alt={product.name}
          className="h-full w-full cursor-zoom-in object-contain p-2 transition-transform duration-500 group-hover:scale-105"
          onClick={() => setIsImageOpen(true)}
        />
        
        {/* Badges */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          {!product.inStock && (
            <Badge variant="destructive" className="text-xs">
              نفذت الكمية
            </Badge>
          )}
          {discount > 0 && (
            <Badge className="bg-green-600 text-xs flex items-center gap-1">
              <Tag className="w-3 h-3" />
              خصم {discount}%
            </Badge>
          )}
          {product.featured && (
            <Badge className="bg-amber-500 text-xs">
              مميز
            </Badge>
          )}
        </div>

        {/* Quick Actions */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-black/40 p-2 opacity-100 transition-opacity sm:inset-0 sm:bottom-auto sm:p-0 sm:opacity-0 sm:group-hover:opacity-100">
          <Button size="sm" variant="secondary" asChild className="w-full sm:w-auto">
            <Link to={`/products/${product.id}`}>
              <Eye className="w-4 h-4 ml-1" />
              عرض التفاصيل
            </Link>
          </Button>
        </div>
      </div>

      <CardContent className="flex-1 p-3 sm:p-4">
        {/* Category */}
        <p className="text-xs text-muted-foreground mb-1">{product.category}</p>
        
        {/* Name */}
        <h3 className="mb-2 line-clamp-2 text-base font-semibold sm:text-lg">{product.name}</h3>
        
        {/* Price */}
        <div className="flex items-center gap-2 mb-2">
          {product.salePrice ? (
            <>
              <span className="text-lg font-bold text-primary sm:text-xl">
                {formatPrice(product.salePrice)}
              </span>
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.price)}
              </span>
            </>
          ) : (
            <span className="text-lg font-bold text-primary sm:text-xl">
              {formatPrice(product.price)}
            </span>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>اللون: {product.color}</span>
          <span>•</span>
          <span>المخزون: {product.stock}</span>
        </div>
      </CardContent>

      <CardFooter className="p-3 pt-0 sm:p-4 sm:pt-0">
        <div className="w-full space-y-2">
          <Button
            className="w-full text-sm sm:text-base"
            disabled={!product.inStock}
            onClick={handleAddToCart}
          >
            <ShoppingCart className="w-4 h-4 ml-2" />
            {product.inStock ? 'إضافة إلى السلة' : 'غير متوفر'}
          </Button>
          <Button
            className="w-full text-sm sm:text-base"
            variant="outline"
            disabled={!product.inStock}
            onClick={() => window.open(getWhatsAppLink(product), '_blank', 'noopener,noreferrer')}
          >
            طلب مباشر عبر واتساب
          </Button>
        </div>
      </CardFooter>

      <Dialog open={isImageOpen} onOpenChange={setIsImageOpen}>
        <DialogContent className="max-w-[95vw] p-2 sm:max-w-4xl">
          <img
            src={product.images[0]}
            alt={product.name}
            className="max-h-[85vh] w-full object-contain"
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
