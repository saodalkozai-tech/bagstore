import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Star, Shield, Truck, Headphones, Facebook, Instagram, Music2, Youtube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/features/ProductCard';
import { getProducts } from '@/lib/storage';
import { useStoreSettings } from '@/hooks/use-store-settings';
import heroImage from '@/assets/hero-bags.jpg';

export function HomePage() {
  const products = getProducts();
  const settings = useStoreSettings();
  const featuredProducts = products.filter(p => p.featured).slice(0, 4);
  const whatsappLink = `https://wa.me/${settings.whatsapp.replace(/[^\d]/g, '')}`;
  const heroImages = useMemo(() => {
    const normalized = settings.heroImageUrls.map((url) => url.trim()).filter(Boolean);
    if (normalized.length > 0) return normalized;
    if (settings.heroImageUrl.trim()) return [settings.heroImageUrl.trim()];
    return [heroImage];
  }, [settings.heroImageUrl, settings.heroImageUrls]);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  useEffect(() => {
    setCurrentHeroIndex(0);
  }, [heroImages]);

  useEffect(() => {
    if (heroImages.length <= 1) return;
    const intervalMs = Math.max(2, settings.heroSlideIntervalSec) * 1000;
    const interval = window.setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroImages.length);
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [heroImages, settings.heroSlideIntervalSec]);

  const normalizeUrl = (url: string): string => {
    if (!url.trim()) return '';
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
  };

  const socialLinks = [
    { key: 'facebook', label: 'Facebook', icon: Facebook, url: normalizeUrl(settings.facebookUrl) },
    { key: 'instagram', label: 'Instagram', icon: Instagram, url: normalizeUrl(settings.instagramUrl) },
    { key: 'tiktok', label: 'TikTok', icon: Music2, url: normalizeUrl(settings.tiktokUrl) },
    { key: 'youtube', label: 'YouTube', icon: Youtube, url: normalizeUrl(settings.youtubeUrl) }
  ].filter((item) => item.url);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative min-h-[420px] md:min-h-[500px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          {heroImages.map((image, index) => (
            <img
              key={`${image}-${index}`}
              src={image}
              alt={`Hero ${index + 1}`}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                index === currentHeroIndex ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40" />
        </div>
        
        <div className="relative container mx-auto px-4 text-white text-center py-12">
          <h1 className="text-2xl sm:text-3xl md:text-6xl font-bold mb-4 md:mb-6 leading-tight">
            مجموعة حقائب فاخرة<br />
            <span className="text-primary">بتصاميم استثنائية</span>
          </h1>
          <p className="text-sm sm:text-base md:text-xl mb-6 md:mb-8 max-w-2xl mx-auto leading-relaxed">
            اكتشف أرقى وأجمل الحقائب الجلدية الفاخرة بجودة عالمية وأسعار تنافسية
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Button size="lg" asChild className="text-base md:text-lg px-6 md:px-8 w-full sm:w-auto">
              <Link to="/products">
                تصفح المنتجات
                <ArrowLeft className="mr-2 w-5 h-5" />
              </Link>
            </Button>
           <Button 
            size="lg" 
            variant="secondary" 
            className="text-base md:text-lg px-6 md:px-8 w-full sm:w-auto"
            onClick={() => window.open(whatsappLink, '_blank', 'noopener,noreferrer')}
          >
            تواصل عبر واتساب
          </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            <div className="text-center">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <Star className="w-6 h-6 md:w-8 md:h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-base md:text-lg mb-1 md:mb-2">جودة عالية</h3>
              <p className="text-sm text-muted-foreground">منتجات مصنوعة من أجود الخامات</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <Shield className="w-6 h-6 md:w-8 md:h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-base md:text-lg mb-1 md:mb-2">ضمان الجودة</h3>
              <p className="text-sm text-muted-foreground">ضمان على جميع المنتجات</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <Truck className="w-6 h-6 md:w-8 md:h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-base md:text-lg mb-1 md:mb-2">توصيل سريع</h3>
              <p className="text-sm text-muted-foreground">شحن  لجميع مدن العراق</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <Headphones className="w-6 h-6 md:w-8 md:h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-base md:text-lg mb-1 md:mb-2">دعم مستمر</h3>
              <p className="text-sm text-muted-foreground">خدمة عملاء على مدار الساعة</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 md:mb-4">المنتجات المميزة</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              تصفح مجموعتنا المختارة من أفضل الحقائب الفاخرة
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <div className="text-center">
            <Button size="lg" variant="outline" asChild>
              <Link to="/products">
                عرض جميع المنتجات
                <ArrowLeft className="mr-2 w-5 h-5" />
              </Link>
            </Button>
          </div>

          {socialLinks.length > 0 && (
            <div className="mt-10 text-center">
              <h3 className="text-xl font-semibold mb-4">تابعنا على السوشيال ميديا</h3>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {socialLinks.map((social) => (
                  <Button key={social.key} variant="secondary" size="sm" asChild>
                    <a href={social.url} target="_blank" rel="noopener noreferrer">
                      <social.icon className="w-4 h-4 ml-2" />
                      {social.label}
                    </a>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-14 md:py-20 bg-gradient-to-r from-primary to-amber-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 md:mb-6">هل لديك استفسار؟</h2>
          <p className="text-base md:text-xl mb-6 md:mb-8 max-w-2xl mx-auto">
            فريقنا جاهز لمساعدتك في اختيار الحقيبة المثالية
          </p>
          <Button 
            size="lg" 
            variant="secondary" 
            className="text-base md:text-lg px-6 md:px-8 w-full sm:w-auto"
            onClick={() => window.open(whatsappLink, '_blank', 'noopener,noreferrer')}
          >
            تواصل عبر واتساب
          </Button>
        </div>
      </section>
    </div>
  );
}
