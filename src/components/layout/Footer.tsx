import { useState } from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';
import { useStoreSettings } from '@/hooks/use-store-settings';
import { useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import './footer.css';

export function Footer() {
  const location = useLocation();
  const settings = useStoreSettings();
  const logoSrc = settings.logoUrl.trim() || '/logo.png';
  const quickLinks = settings.quickLinks;
  const footerCategories = settings.footerCategories;
  const [activeMessage, setActiveMessage] = useState('');
  const whatsappLink = `https://wa.me/${settings.whatsapp.replace(/[^\d]/g, '')}`;
  const isSettingsPage = location.pathname.startsWith('/admin/settings');

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
      <footer className="footer">
        <div className="container footer-container">
        <div className="footer-grid">
          {/* About */}
          <div>
            <div className="footer-logo-container">
              <img
                src={logoSrc}
                alt={settings.storeName}
                className="footer-logo"
                height={settings.logoHeightFooter}
              />
            </div>
            <p className="footer-description">
              متجرك الموثوق لأفضل الحقائب الفاخرة والعصرية. نقدم منتجات عالية الجودة بأسعار منافسة.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="footer-section-title">روابط سريعة</h3>
            <ul className="footer-links-list">
              {quickLinks.map((item, index) => (
                <li key={`${item.url}-${index}`}>
                  <a
                    href={item.url}
                    className="footer-link"
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
            <h3 className="footer-section-title">الفئات</h3>
            <ul className="footer-links-list">
              {footerCategories.map((category) => (
                <li key={category}>
                  <a href="/products" className="footer-link">
                    {category}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="footer-section-title">تواصل معنا</h3>
            <ul className="footer-links-list">
              <li className="footer-contact-item">
                <Phone className="footer-contact-icon" />
                <span>+9647768397293</span>
              </li>
              <li className="footer-contact-item">
                <Mail className="footer-contact-icon" />
                <span>info@bagstore.com</span>
              </li>
              <li className="footer-contact-item">
                <MapPin className="footer-contact-icon" />
                <span>العراق - بغداد   </span>
              </li>
            </ul>
          </div>
        </div>

        {!isSettingsPage && (
          <div className="footer-bottom">
            <p>© 2026 متجر الحقائب. جميع الحقوق محفوظة.</p>
          </div>
        )}
      </div>
      </footer>

      <Dialog open={Boolean(activeMessage)} onOpenChange={(open) => !open && setActiveMessage('')}>
        <DialogContent className="footer-dialog">
          <DialogHeader>
            <DialogTitle>رسالة</DialogTitle>
          </DialogHeader>
          <p className="footer-dialog-message">{activeMessage}</p>
          <div className="footer-dialog-actions">
            <Button type="button" variant="outline" asChild className="footer-dialog-button">
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                تواصل عبر واتس اب
              </a>
            </Button>
            <Button type="button" onClick={() => setActiveMessage('')} className="footer-dialog-button">
              إغلاق
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
