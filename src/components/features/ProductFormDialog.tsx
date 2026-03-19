import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Trash2, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { addProduct, updateProduct } from '@/lib/storage';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import { useStoreSettings } from '@/hooks/use-store-settings';
import { Product } from '@/types';
import { CATEGORIES, COLORS } from '@/lib/mockData';
import { toast } from 'sonner';

const productSchema = z.object({
  name: z.string().min(3, 'الاسم يجب أن يكون 3 أحرف على الأقل'),
  price: z.number().min(1, 'السعر يجب أن يكون أكبر من 0'),
  salePrice: z.number().optional(),
  images: z.string().min(1, 'يجب إضافة صورة واحدة على الأقل'),
  category: z.string().min(1, 'يجب اختيار الفئة'),
  color: z.string().min(1, 'يجب اختيار اللون'),
  deliveryInfo: z.string().optional(),
  stock: z.number().min(0, 'الكمية لا يمكن أن تكون سالبة'),
  featured: z.boolean()
});

type ProductFormData = z.infer<typeof productSchema>;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSuccess: () => void;
}

function getDefaultValues(product?: Product | null): ProductFormData {
  if (product) {
    return {
      name: product.name,
      price: product.price,
      salePrice: product.salePrice,
      images: product.images.join('\n'),
      category: product.category,
      color: product.color,
      deliveryInfo: product.deliveryInfo,
      stock: product.stock,
      featured: product.featured
    };
  }

  return {
    name: '',
    price: 0,
    salePrice: undefined,
    images: '',
    category: '',
    color: '',
    deliveryInfo: '',
    stock: 0,
    featured: false
  };
}

export function ProductFormDialog({ open, onOpenChange, product, onSuccess }: ProductFormDialogProps) {
  const settings = useStoreSettings();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: getDefaultValues(product)
  });

  useEffect(() => {
    reset(getDefaultValues(product));
  }, [product, open, reset]);

  const category = watch('category');
  const color = watch('color');
  const featured = watch('featured');
  const watchedImages = watch('images') || '';
  const imageUrls = useMemo(() => {
    if (!watchedImages.trim()) return [];
    return watchedImages.split('\n');
  }, [watchedImages]);
  const categoryOptions = useMemo(() => {
    const categories = settings.footerCategories
      .map((category) => category.trim())
      .filter(Boolean);
    return categories.length > 0 ? categories : CATEGORIES.filter((c) => c !== 'الكل');
  }, [settings.footerCategories]);

  const setImages = (images: string[]) => {
    setValue('images', images.join('\n'), { shouldValidate: true, shouldDirty: true });
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    const validFiles = files.filter((file) => {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        return false;
      }
      return file.size <= MAX_IMAGE_SIZE_BYTES;
    });

    if (validFiles.length === 0) {
      toast.error('يرجى اختيار صور بصيغة JPG/PNG/WEBP/GIF وبحجم لا يتجاوز 5MB');
      event.target.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const uploadedUrls: string[] = [];
      let failedCount = 0;
      const skippedCount = files.length - validFiles.length;

      for (const file of validFiles) {
        try {
          const url = await uploadImageToCloudinary(file);
          uploadedUrls.push(url);
        } catch {
          failedCount += 1;
        }
      }

      if (uploadedUrls.length > 0) {
        setImages([...imageUrls.filter((url) => url.trim().length > 0), ...uploadedUrls]);
      }

      if (uploadedUrls.length > 0 && failedCount === 0 && skippedCount === 0) {
        toast.success(`تم رفع ${uploadedUrls.length} صورة بنجاح`);
      } else if (uploadedUrls.length > 0 && (failedCount > 0 || skippedCount > 0)) {
        toast.warning(`تم رفع ${uploadedUrls.length} صورة، فشل ${failedCount} وتخطي ${skippedCount}`);
      } else {
        toast.error('فشل رفع الصور');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'فشل رفع الصورة');
    } finally {
      event.target.value = '';
      setIsUploading(false);
    }
  };

  const handleImageUrlChange = (index: number, value: string) => {
    const nextImages = [...imageUrls];
    nextImages[index] = value;
    setImages(nextImages);
  };

  const handleRemoveImage = (index: number) => {
    const nextImages = imageUrls.filter((_, i) => i !== index);
    setImages(nextImages);
  };

  const handleAddImageRow = () => {
    setImages([...imageUrls, '']);
  };

  const onSubmit = (data: ProductFormData) => {
    const images = data.images
      .split('\n')
      .map((url) => url.trim())
      .filter((url) => {
        if (!url) return false;
        try {
          const parsed = new URL(url);
          return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
          return false;
        }
      });

    if (images.length === 0) {
      toast.error('أضف رابط صورة واحد على الأقل بصيغة URL صحيحة');
      return;
    }

    const normalizeOptionalString = (value?: string) => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : undefined;
    };

    const productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> = {
      name: data.name.trim(),
      price: data.price,
      salePrice: data.salePrice ?? undefined,
      images,
      category: data.category.trim(),
      color: data.color.trim(),
      deliveryInfo: normalizeOptionalString(data.deliveryInfo),
      stock: data.stock,
      inStock: data.stock > 0,
      featured: data.featured
    };

    if (product) {
      const updated = updateProduct(product.id, productData);
      if (!updated) {
        toast.error('فشل تحديث المنتج');
        return;
      }
      toast.success('تم تحديث المنتج بنجاح');
    } else {
      addProduct(productData);
      toast.success('تم إضافة المنتج بنجاح');
    }

    reset(getDefaultValues(null));
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl">
            {product ? 'تعديل المنتج' : 'إضافة منتج جديد'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-base font-semibold sm:text-lg">المعلومات الأساسية</h3>

            <div className="space-y-2">
              <Label htmlFor="name">اسم المنتج *</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">الفئة *</Label>
                <Select value={category} onValueChange={(value) => setValue('category', value, { shouldValidate: true })}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الفئة" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-sm text-red-600">{errors.category.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">اللون *</Label>
                <Select value={color} onValueChange={(value) => setValue('color', value, { shouldValidate: true })}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر اللون" />
                  </SelectTrigger>
                  <SelectContent>
                    {COLORS.filter((c) => c !== 'الكل').map((col) => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.color && <p className="text-sm text-red-600">{errors.color.message}</p>}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-semibold sm:text-lg">التسعير</h3>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">السعر الأساسي *</Label>
                <Input
                  id="price"
                  type="number"
                  min={1}
                  step="0.01"
                  {...register('price', { valueAsNumber: true })}
                />
                {errors.price && <p className="text-sm text-red-600">{errors.price.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="salePrice">سعر التخفيض</Label>
                <Input
                  id="salePrice"
                  type="number"
                  min={0}
                  step="0.01"
                  {...register('salePrice', {
                    setValueAs: (value) => value === '' ? undefined : Number(value)
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock">الكمية المتوفرة *</Label>
                <Input
                  id="stock"
                  type="number"
                  min={0}
                  {...register('stock', { valueAsNumber: true })}
                />
                {errors.stock && <p className="text-sm text-red-600">{errors.stock.message}</p>}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-semibold sm:text-lg">معلومات إضافية</h3>
            <div className="space-y-2">
              <Label htmlFor="deliveryInfo">معلومات التوصيل</Label>
              <Input id="deliveryInfo" {...register('deliveryInfo')} placeholder="التوصيل خلال 3-5 أيام" />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-semibold sm:text-lg">الصور</h3>
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
              <Button type="button" onClick={handleUploadClick} disabled={isUploading} className="w-full sm:w-auto">
                <Upload className="w-4 h-4 ml-2" />
                {isUploading ? 'جار رفع الصور...' : 'رفع صور إلى Cloudinary'}
              </Button>
              <Button type="button" variant="outline" onClick={handleAddImageRow} disabled={isUploading} className="w-full sm:w-auto">
                <Plus className="w-4 h-4 ml-2" />
                إضافة رابط صورة
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
                aria-label="Upload product images"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="images">روابط الصور *</Label>
              <Textarea 
                id="images" 
                {...register('images')} 
                rows={3} 
                placeholder="أدخل روابط الصور (واحدة لكل سطر):&#10;https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                className="font-mono text-sm resize-vertical min-h-[100px]"
              />
              {imageUrls.length > 0 ? (
                <div className="border rounded-lg p-3 bg-slate-50">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">معاينة الصور ({imageUrls.length}):</p>
                  <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
                    {imageUrls.map((url, index) => (
                      <div key={`${index}-${url}`} className="relative group">
                        <img 
                          src={url.trim() || '/placeholder.svg'} 
                          alt={`Preview ${index + 1}`}
                          className="w-full h-20 object-cover rounded border"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder.svg';
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline" 
                          size="sm"
                          className="absolute -top-2 -right-2 h-5 w-5 p-0 bg-white border-2 border-background rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all"
                          onClick={() => handleRemoveImage(index)}
                        >
                          <Trash2 className="w-3 h-3 text-red-600" />
                        </Button>
                        {url.trim() && (
                          <Input
                            value={url}
                            onChange={(e) => handleImageUrlChange(index, e.target.value)}
                            className="mt-1 text-xs px-2 py-0.5"
                            placeholder="تعديل الرابط..."
                            aria-label="رابط الصورة"
                            title="رابط الصورة"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">لم تتم إضافة صور بعد.</p>
              )}
              {errors.images && <p className="text-sm text-red-600">{errors.images.message}</p>}
              <p className="text-xs text-muted-foreground mt-2">
                يمكنك رفع عدة صور مرة واحدة أو إضافة روابط يدوياً. الرفع يعمل بدون Cloudinary (placeholders).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="featured"
              checked={featured}
              onCheckedChange={(checked) => setValue('featured', checked as boolean, { shouldValidate: true })}
            />
            <Label htmlFor="featured" className="cursor-pointer">
              عرض كمنتج مميز في الصفحة الرئيسية
            </Label>
          </div>

          <div className="flex flex-col-reverse justify-end gap-2 border-t pt-4 sm:flex-row sm:gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              إلغاء
            </Button>
            <Button type="submit" className="w-full sm:w-auto">
              {product ? 'حفظ التعديلات' : 'إضافة المنتج'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
