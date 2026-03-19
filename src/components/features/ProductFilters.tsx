import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { COLORS } from '@/lib/mockData';
import { FilterOptions } from '@/types';

interface ProductFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  maxPrice: number;
  categories: string[];
}

export function ProductFilters({ filters, onFiltersChange, maxPrice, categories }: ProductFiltersProps) {
  const resetFilters = () => {
    onFiltersChange({
      search: '',
      category: 'الكل',
      color: 'الكل',
      priceRange: [0, maxPrice],
      inStockOnly: false
    });
  };

  return (
    <div className="bg-white p-4 md:p-6 rounded-lg border shadow-sm space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-base md:text-lg">تصفية المنتجات</h3>
        <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
          إعادة ضبط
        </Button>
      </div>

      {/* Search */}
      <div className="space-y-2">
        <Label htmlFor="product-search">البحث</Label>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="product-search"
            placeholder="ابحث عن منتج..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pr-10"
          />
        </div>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="product-category">الفئة</Label>
        <Select
          value={filters.category}
          onValueChange={(value) => onFiltersChange({ ...filters, category: value })}
        >
          <SelectTrigger id="product-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Color */}
      <div className="space-y-2">
        <Label htmlFor="product-color">اللون</Label>
        <Select
          value={filters.color}
          onValueChange={(value) => onFiltersChange({ ...filters, color: value })}
        >
          <SelectTrigger id="product-color">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COLORS.map((color) => (
              <SelectItem key={color} value={color}>
                {color}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* In Stock Only */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="inStock"
          checked={filters.inStockOnly}
          onCheckedChange={(checked) =>
            onFiltersChange({ ...filters, inStockOnly: checked as boolean })
          }
        />
        <Label htmlFor="inStock" className="cursor-pointer">
          المنتجات المتوفرة فقط
        </Label>
      </div>

      {/* Price Range */}
      <div className="space-y-2">
        <Label htmlFor="price-min">نطاق السعر</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            id="price-min"
            type="number"
            min={0}
            value={filters.priceRange[0]}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                priceRange: [Number(e.target.value) || 0, filters.priceRange[1]]
              })
            }
            placeholder="من"
          />
          <Input
            id="price-max"
            type="number"
            min={0}
            value={filters.priceRange[1]}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                priceRange: [filters.priceRange[0], Number(e.target.value) || 0]
              })
            }
            placeholder="إلى"
          />
        </div>
      </div>
    </div>
  );
}
