import { useState } from 'react';
import { Plus, Pencil, Trash2, Eye, Search, PackageCheck, PackageX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { deleteProduct } from '@/lib/storage';
import { formatPrice } from '@/lib/utils';
import { ProductFormDialog } from '@/components/features/ProductFormDialog';
import { useProducts } from '@/hooks/use-products';
import { Product } from '@/types';
import { toast } from 'sonner';

export function ProductsManagePage() {
  const products = useProducts();
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );
  const inStockCount = products.filter((product) => product.inStock).length;
  const outOfStockCount = products.length - inStockCount;

  const handleDelete = () => {
    if (!deleteId) return;
    
    if (deleteProduct(deleteId)) {
      toast.success('تم حذف المنتج بنجاح');
    } else {
      toast.error('فشل حذف المنتج');
    }
    setDeleteId(null);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditProduct(null);
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">إدارة المنتجات</h2>
            <p className="mt-1 text-sm text-slate-600">إضافة، تعديل، حذف وبحث المنتجات من مكان واحد.</p>
          </div>
          <Button onClick={() => setIsFormOpen(true)} className="w-full md:w-auto">
            <Plus className="w-4 h-4 ml-2" />
            إضافة منتج جديد
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">إجمالي المنتجات</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900 sm:text-3xl">{products.length}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/40 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">المتوفر</CardTitle>
            <PackageCheck className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600 sm:text-3xl">{inStockCount}</p>
          </CardContent>
        </Card>
        <Card className="border-rose-200 bg-rose-50/40 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">غير المتوفر</CardTitle>
            <PackageX className="h-5 w-5 text-rose-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-rose-600 sm:text-3xl">{outOfStockCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">البحث والتصفية</p>
          <p className="text-xs text-slate-500">عدد النتائج: {filteredProducts.length}</p>
        </div>
        <div className="relative w-full max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="البحث باسم المنتج أو الفئة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-slate-200 bg-slate-50 pr-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="space-y-3 md:hidden">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <Card key={product.id} className="border-slate-200 shadow-sm">
              <CardContent className="space-y-3 p-3.5">
                <div className="flex items-start gap-3">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="h-16 w-16 rounded object-cover"
                  />
                  <div className="flex-1">
                    <p className="line-clamp-1 font-semibold">{product.name}</p>
                    <p className="line-clamp-1 text-sm text-muted-foreground">{product.category}</p>
                    <div className="mt-1">
                      {product.salePrice ? (
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary">{formatPrice(product.salePrice)}</span>
                          <span className="text-xs text-muted-foreground line-through">{formatPrice(product.price)}</span>
                        </div>
                      ) : (
                        <span className="font-bold">{formatPrice(product.price)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">المخزون: {product.stock}</span>
                  {product.inStock ? (
                    <Badge variant="default" className="bg-green-600">متوفر</Badge>
                  ) : (
                    <Badge variant="destructive">نفذ</Badge>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`/products/${product.id}`, '_blank', 'noopener,noreferrer')}
                  >
                    <Eye className="w-4 h-4 ml-1" />
                    عرض
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditProduct(product);
                      setIsFormOpen(true);
                    }}
                  >
                    <Pencil className="w-4 h-4 ml-1" />
                    تعديل
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setDeleteId(product.id)}
                  >
                    <Trash2 className="w-4 h-4 ml-1" />
                    حذف
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-muted-foreground">
            لا توجد منتجات
          </div>
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الصورة</TableHead>
              <TableHead className="text-right">اسم المنتج</TableHead>
              <TableHead className="text-right">الفئة</TableHead>
              <TableHead className="text-right">السعر</TableHead>
              <TableHead className="text-right">المخزون</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-right">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>
                    {product.salePrice ? (
                      <div className="flex flex-col">
                        <span className="font-bold text-primary">
                          {formatPrice(product.salePrice)}
                        </span>
                        <span className="text-xs text-muted-foreground line-through">
                          {formatPrice(product.price)}
                        </span>
                      </div>
                    ) : (
                      <span className="font-bold">{formatPrice(product.price)}</span>
                    )}
                  </TableCell>
                  <TableCell>{product.stock}</TableCell>
                  <TableCell>
                    {product.inStock ? (
                      <Badge variant="default" className="bg-green-600">متوفر</Badge>
                    ) : (
                      <Badge variant="destructive">نفذ</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(`/products/${product.id}`, '_blank', 'noopener,noreferrer')}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditProduct(product);
                          setIsFormOpen(true);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteId(product.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  لا توجد منتجات
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Product Form Dialog */}
      <ProductFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditProduct(null);
        }}
        product={editProduct}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف هذا المنتج نهائياً ولا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
