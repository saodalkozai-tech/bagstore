export interface Product {
  id: string;
  name: string;
  nameEn?: string;
  description: string;
  price: number;
  salePrice?: number;
  images: string[];
  category: string;
  color: string;
  size: string;
  material: string;
  weight?: string;
  brand?: string;
  countryOfOrigin?: string;
  warranty?: string;
  deliveryInfo?: string;
  stock: number;
  inStock: boolean;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  avatar?: string;
  createdAt: string;
}

export interface UserActivityLog {
  id: string;
  action:
    | 'login'
    | 'logout'
    | 'password_change'
    | 'user_create'
    | 'user_update'
    | 'user_delete'
    | 'user_password_update';
  actorId?: string;
  actorName?: string;
  targetUserId?: string;
  targetUserName?: string;
  details?: string;
  createdAt: string;
}

export interface Stats {
  totalProducts: number;
  inStockProducts: number;
  outOfStockProducts: number;
  totalCategories: number;
  lowStockProducts: number;
}

export type FilterOptions = {
  search: string;
  category: string;
  color: string;
  priceRange: [number, number];
  inStockOnly: boolean;
};

export interface QuickLinkItem {
  message?: string;
  label: string;
  url: string;
}

export interface StoreSettings {
  storeName: string;
  storeEmail: string;
  storePhone: string;
  whatsapp: string;
  logoUrl: string;
  faviconUrl: string;
  logoHeightNavbar: number;
  logoHeightFooter: number;
  heroImageUrl: string;
  heroImageUrls: string[];
  heroSlideIntervalSec: number;
  facebookUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
  footerCategories: string[];
  quickLinks: QuickLinkItem[];
  cloudinaryCloudName: string;
  cloudinaryUploadPreset: string;
  cloudinaryApiKey: string;
  externalDbEnabled: boolean;
  externalDbProvider: 'supabase' | 'firebase' | 'mongodb' | 'custom';
  externalDbUrl: string;
  externalDbName: string;
  externalDbApiKey: string;
  themePrimaryColor: string;
  themeAccentColor: string;
  themeBackgroundColor: string;
  themeForegroundColor: string;
  productsPerPage: number;
  currency: 'iqd' | 'usd' | 'eur' | 'sar';
  visitorCount: number;
  visitorUniqueCount: number;
  visitorDailyStats: Record<string, number>;
  visitorMonthlyStats: Record<string, number>;
  userName: string;
  userEmail: string;
}
