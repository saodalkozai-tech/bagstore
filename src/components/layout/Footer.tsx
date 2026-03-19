import { useState } from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';
import { useStoreSettings } from '@/hooks/use-store-settings';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function Footer() {
  const settings = useStoreSettings();
  const logoSrc = settings.logoUrl.trim() || '/logo.png';
  const quickLinks = settings.quickLinks;
  const footerCategories = settings.footerCategories;
  const [activeMessage, setActiveMessage] = useState('');
  const whatsappLink = `https://wa.me/${settings.whatsapp.replace(/[^\d]/g, '')}`;

  const handleQuickLinkClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    message?: string
  ) => {
    const trimmedMessage = (message || '').trim();
    if (!trimmedMessage) return;
    event.preventDefault();
    setActiveMessage(trimmedMessage);
  };

  return (
    <>
      <footer className="mt-12 bg-gray-900 text-gray-300 md:mt-20">
        <div className="container mx-auto px-4 py-10 md:py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* About */}
          <div>
            <div className="mb-4">
              <img
                src={logoSrc}
                alt={settings.storeName}
                className="h-auto max-h-14 w-auto object-contain sm:max-h-20"
                height={settings.logoHeightFooter}
              />
            </div>
            <p className="text-sm leading-relaxed">
              متجرك الموثوق لأفضل الحقائب الفاخرة والعصرية. نقدم منتجات عالية الجودة بأسعار منافسة.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">روابط سريعة</h3>
            <ul className="space-y-2 text-sm">
              {quickLinks.map((item, index) => (
                <li key={`${item.url}-${index}`}>
                  <a
                    href={item.url}
                    className="hover:text-primary transition-colors"
                    onClick={(event) => handleQuickLinkClick(event, item.message)}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-semibold text-white mb-4">الفئات</h3>
            <ul className="space-y-2 text-sm">
              {footerCategories.map((category) => (
                <li key={category}>
                  <a href="/products" className="hover:text-primary transition-colors">
                    {category}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-white mb-4">تواصل معنا</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                <span>+9647768397293</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                <span>info@bagstore.com</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span>العراق - بغداد   </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
          <p>© 2026 متجر الحقائب. جميع الحقوق محفوظة.</p>
        </div>
      </div>
      </footer>

      <Dialog open={Boolean(activeMessage)} onOpenChange={(open) => !open && setActiveMessage('')}>
        <DialogContent className="max-w-md text-right">
          <DialogHeader>
            <DialogTitle>رسالة</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-700 leading-7">{activeMessage}</p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" asChild className="w-full sm:w-auto">
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                تواصل عبر واتس اب
              </a>
            </Button>
            <Button type="button" onClick={() => setActiveMessage('')} className="w-full sm:w-auto">
              إغلاق
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
