import { useEffect, useState, useMemo } from 'react';
import { ProductCard } from '@/components/features/ProductCard';
import { ProductFilters } from '@/components/features/ProductFilters';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination';
import { getStoreSettings } from '@/lib/storage';
import { FilterOptions } from '@/types';
import { useProducts } from '@/hooks/use-products';

export function ProductsPage() {
  const products = useProducts();
  const settings = getStoreSettings();
  const maxProductPrice = Math.max(...products.map((p) => p.salePrice || p.price), 0);
  const categories = useMemo(() => {
    const fromSettings = settings.footerCategories.map((category) => category.trim()).filter(Boolean);
    const fromProducts = [...new Set(products.map((product) => product.category.trim()).filter(Boolean))];
    return ['الكل', ...new Set([...fromSettings, ...fromProducts])];
  }, [products, settings.footerCategories]);
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    category: 'الكل',
    color: 'الكل',
    priceRange: [0, maxProductPrice || 10000],
    inStockOnly: false
  });
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!categories.includes(filters.category)) {
      setFilters((prev) => ({ ...prev, category: 'الكل' }));
    }
  }, [categories, filters.category]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.search, filters.category, filters.color, filters.inStockOnly, filters.priceRange]);

  const filteredProducts = useMemo(() => {
    const minPrice = Math.min(filters.priceRange[0], filters.priceRange[1]);
    const maxPrice = Math.max(filters.priceRange[0], filters.priceRange[1]);

    return products.filter((product) => {
      // Search
      if (filters.search && !product.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // Category
      if (filters.category !== 'الكل' && product.category !== filters.category) {
        return false;
      }

      // Color
      if (filters.color !== 'الكل' && product.color !== filters.color) {
        return false;
      }

      // In Stock
      if (filters.inStockOnly && !product.inStock) {
        return false;
      }

      // Price Range
      const effectivePrice = product.salePrice || product.price;
      if (effectivePrice < minPrice || effectivePrice > maxPrice) {
        return false;
      }

      return true;
    });
  }, [products, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / settings.productsPerPage));

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const visibleProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * settings.productsPerPage;
    return filteredProducts.slice(startIndex, startIndex + settings.productsPerPage);
  }, [currentPage, filteredProducts, settings.productsPerPage]);

  const paginationItems = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (currentPage <= 3) {
      return [1, 2, 3, 4, 'ellipsis-end'] as const;
    }

    if (currentPage >= totalPages - 2) {
      return ['ellipsis-start', totalPages - 3, totalPages - 2, totalPages - 1, totalPages] as const;
    }

    return ['ellipsis-start', currentPage - 1, currentPage, currentPage + 1, 'ellipsis-end'] as const;
  }, [currentPage, totalPages]);

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">جميع المنتجات</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          عرض {visibleProducts.length} من {filteredProducts.length} منتج (إجمالي {products.length})
        </p>
      </div>

      <div className="grid lg:grid-cols-4 gap-4 md:gap-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <ProductFilters
            filters={filters}
            onFiltersChange={setFilters}
            maxPrice={maxProductPrice || 10000}
            categories={categories}
          />
        </div>

        {/* Products Grid */}
        <div id="products-pagination" className="lg:col-span-3">
          {filteredProducts.length > 0 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {visibleProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#products-pagination"
                        onClick={(event) => {
                          event.preventDefault();
                          setCurrentPage((prev) => Math.max(1, prev - 1));
                        }}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>

                    {paginationItems.map((item, index) => (
                      <PaginationItem key={`${item}-${index}`}>
                        {typeof item === 'number' ? (
                          <PaginationLink
                            href="#products-pagination"
                            isActive={item === currentPage}
                            onClick={(event) => {
                              event.preventDefault();
                              setCurrentPage(item);
                            }}
                          >
                            {item}
                          </PaginationLink>
                        ) : (
                          <PaginationEllipsis />
                        )}
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <PaginationNext
                        href="#products-pagination"
                        onClick={(event) => {
                          event.preventDefault();
                          setCurrentPage((prev) => Math.min(totalPages, prev + 1));
                        }}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          ) : (
            <div id="products-pagination" className="text-center py-14 md:py-20">
              <p className="text-lg md:text-xl text-muted-foreground">
                لا توجد منتجات تطابق البحث
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
