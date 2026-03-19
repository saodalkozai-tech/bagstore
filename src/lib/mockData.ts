import { Product, User } from '@/types';
import bag1 from '@/assets/bag-1.jpg';
import bag2 from '@/assets/bag-2.jpg';
import bag3 from '@/assets/bag-3.jpg';

export const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'حقيبة يد جلدية فاخرة',
    price: 899,
    salePrice: 749,
    images: [bag1, 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800', 'https://images.unsplash.com/photo-1591561954557-26941169b49e?w=800'],
    category: 'حقائب يد',
    color: 'بني',
    deliveryInfo: 'التوصيل خلال 3-5 أيام عمل',
    stock: 15,
    inStock: true,
    featured: true,
    createdAt: '2024-01-15',
    updatedAt: '2024-02-01'
  },
  {
    id: '2',
    name: 'حقيبة كروس بودي سوداء',
    price: 499,
    images: [bag2, 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800'],
    category: 'حقائب كروس',
    color: 'أسود',
    deliveryInfo: 'التوصيل خلال 2-4 أيام عمل',
    stock: 28,
    inStock: true,
    featured: true,
    createdAt: '2024-01-20',
    updatedAt: '2024-01-28'
  },
  {
    id: '3',
    name: 'حقيبة توت بيج',
    price: 599,
    images: [bag3, 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800'],
    category: 'حقائب توت',
    color: 'بيج',
    deliveryInfo: 'التوصيل خلال 3-5 أيام عمل',
    stock: 20,
    inStock: true,
    featured: false,
    createdAt: '2024-02-01',
    updatedAt: '2024-02-03'
  },
  {
    id: '4',
    name: 'حقيبة ظهر رياضية',
    price: 399,
    images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800'],
    category: 'حقائب ظهر',
    color: 'رمادي',
    deliveryInfo: 'التوصيل خلال 2-4 أيام عمل',
    stock: 35,
    inStock: true,
    featured: false,
    createdAt: '2024-01-25',
    updatedAt: '2024-01-30'
  },
  {
    id: '5',
    name: 'حقيبة سهرة ذهبية',
    price: 699,
    salePrice: 599,
    images: ['https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=800'],
    category: 'حقائب سهرة',
    color: 'ذهبي',
    deliveryInfo: 'التوصيل خلال 3-5 أيام عمل',
    stock: 8,
    inStock: true,
    featured: true,
    createdAt: '2024-02-05',
    updatedAt: '2024-02-06'
  },
  {
    id: '6',
    name: 'حقيبة محفظة نسائية',
    price: 299,
    images: ['https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=800'],
    category: 'محافظ',
    color: 'أحمر',
    deliveryInfo: 'التوصيل خلال 2-3 أيام عمل',
    stock: 0,
    inStock: false,
    featured: false,
    createdAt: '2024-01-18',
    updatedAt: '2024-02-04'
  },
  {
    id: '7',
    name: 'حقيبة سفر كبيرة',
    price: 1299,
    images: ['https://images.unsplash.com/photo-1550348504-718a2f0b3f31?w=800'],
    category: 'حقائب سفر',
    color: 'أزرق داكن',
    deliveryInfo: 'التوصيل خلال 4-6 أيام عمل',
    stock: 12,
    inStock: true,
    featured: false,
    createdAt: '2024-01-10',
    updatedAt: '2024-01-22'
  },
  {
    id: '8',
    name: 'حقيبة كلاتش مخملية',
    price: 449,
    images: ['https://images.unsplash.com/photo-1564422170194-896b89110ef8?w=800'],
    category: 'حقائب كلاتش',
    color: 'أسود',
    deliveryInfo: 'التوصيل خلال 3-5 أيام عمل',
    stock: 5,
    inStock: true,
    featured: false,
    createdAt: '2024-02-02',
    updatedAt: '2024-02-05'
  }
];

export const MOCK_USER: User = {
  id: '1',
  name: 'سعود الخزاعي',
  username: 'admin',
  email: 'admin@bagstore.com',
  role: 'admin',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
  createdAt: '2024-01-01'
};

export const CATEGORIES = [
  'الكل',
  'حقائب يد',
  'حقائب كروس',
  'حقائب توت',
  'حقائب ظهر',
  'حقائب سهرة',
  'محافظ',
  'حقائب سفر',
  'حقائب كلاتش'
];

export const COLORS = [
  'الكل',
  'أسود',
  'بني',
  'بيج',
  'أبيض',
  'رمادي',
  'أحمر',
  'أزرق',
  'ذهبي',
  'فضي'
];
