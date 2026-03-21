import { Product } from '@/types';

// تعريف أنواع حركة المخزون
export type StockMovementType = 
  | 'purchase'      // شراء جديد
  | 'sale'          // بيع
  | 'return'        // إرجاع
  | 'adjustment'    // تعديل يدوي
  | 'transfer'      // نقل بين المستودعات
  | 'damage'        // تالف
  | 'loss';         // فاقد

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  warehouseId?: string;
  reason?: string;
  userId?: string;
  createdAt: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  isActive: boolean;
}

export interface StockAlert {
  id: string;
  productId: string;
  productName: string;
  currentStock: number;
  threshold: number;
  alertType: 'low_stock' | 'out_of_stock' | 'overstock';
  createdAt: string;
  resolvedAt?: string;
}

export interface ReorderSuggestion {
  productId: string;
  productName: string;
  currentStock: number;
  suggestedQuantity: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface InventoryReport {
  period: {
    start: string;
    end: string;
  };
  totalMovements: number;
  movementsByType: Record<StockMovementType, number>;
  productsInStock: number;
  productsOutOfStock: number;
  productsLowStock: number;
  totalValue: number;
  topSellingProducts: Array<{
    productId: string;
    productName: string;
    quantitySold: number;
    revenue: number;
  }>;
}

// مفتاح التخزين في localStorage
const MOVEMENTS_KEY = 'bagstore_stock_movements';
const WAREHOUSES_KEY = 'bagstore_warehouses';
const ALERTS_KEY = 'bagstore_stock_alerts';

// قراءة حركات المخزون
function readMovements(): StockMovement[] {
  try {
    const raw = localStorage.getItem(MOVEMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// كتابة حركات المخزون
function writeMovements(movements: StockMovement[]): void {
  localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(movements));
}

// تسجيل حركة مخزون جديدة
export function recordStockMovement(
  productId: string,
  productName: string,
  type: StockMovementType,
  quantity: number,
  previousStock: number,
  newStock: number,
  warehouseId?: string,
  reason?: string,
  userId?: string
): StockMovement {
  const movements = readMovements();
  const movement: StockMovement = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    productId,
    productName,
    type,
    quantity,
    previousStock,
    newStock,
    warehouseId,
    reason,
    userId,
    createdAt: new Date().toISOString()
  };

  movements.push(movement);
  writeMovements(movements);

  // التحقق من الحاجة لإنشاء تنبيه
  checkAndCreateAlert(productId, productName, newStock);

  return movement;
}

// الحصول على حركات المخزون لمنتج معين
export function getProductMovements(productId: string): StockMovement[] {
  return readMovements()
    .filter(m => m.productId === productId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// الحصول على حركات المخزون لفترة زمنية
export function getMovementsInPeriod(startDate: Date, endDate: Date): StockMovement[] {
  const start = startDate.getTime();
  const end = endDate.getTime();

  return readMovements().filter(m => {
    const movementTime = new Date(m.createdAt).getTime();
    return movementTime >= start && movementTime <= end;
  });
}

// إنشاء تنبيه مخزون
function createAlert(
  productId: string,
  productName: string,
  currentStock: number,
  threshold: number,
  alertType: 'low_stock' | 'out_of_stock' | 'overstock'
): StockAlert {
  const alerts = readAlerts();
  const alert: StockAlert = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    productId,
    productName,
    currentStock,
    threshold,
    alertType,
    createdAt: new Date().toISOString()
  };

  alerts.push(alert);
  writeAlerts(alerts);

  return alert;
}

// التحقق من الحاجة لإنشاء تنبيه
function checkAndCreateAlert(productId: string, productName: string, newStock: number): void {
  const LOW_STOCK_THRESHOLD = 5;
  const OVERSTOCK_THRESHOLD = 100;

  // التحقق من نفاد المخزون
  if (newStock === 0) {
    createAlert(productId, productName, newStock, 0, 'out_of_stock');
  }
  // التحقق من انخفاض المخزون
  else if (newStock > 0 && newStock <= LOW_STOCK_THRESHOLD) {
    createAlert(productId, productName, newStock, LOW_STOCK_THRESHOLD, 'low_stock');
  }
  // التحقق من زيادة المخزون
  else if (newStock > OVERSTOCK_THRESHOLD) {
    createAlert(productId, productName, newStock, OVERSTOCK_THRESHOLD, 'overstock');
  }
}

// قراءة التنبيهات
function readAlerts(): StockAlert[] {
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// كتابة التنبيهات
function writeAlerts(alerts: StockAlert[]): void {
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
}

// الحصول على التنبيهات النشطة
export function getActiveAlerts(): StockAlert[] {
  return readAlerts().filter(a => !a.resolvedAt);
}

// حل تنبيه
export function resolveAlert(alertId: string): void {
  const alerts = readAlerts();
  const index = alerts.findIndex(a => a.id === alertId);

  if (index >= 0) {
    alerts[index].resolvedAt = new Date().toISOString();
    writeAlerts(alerts);
  }
}

// اقتراح كمية إعادة الطلب
export function calculateReorderSuggestion(
  productId: string,
  productName: string,
  currentStock: number,
  monthlySalesRate: number
): ReorderSuggestion {
  const LEAD_TIME_DAYS = 7; // زمن التوريد
  const SAFETY_STOCK_DAYS = 3; // أيام المخزون الاحتياطي
  const MIN_ORDER_QUANTITY = 10; // الحد الأدنى للطلب

  // حساب الطلب اليومي المتوقع
  const dailyDemand = monthlySalesRate / 30;

  // حساب المخزون المطلوب
  const requiredStock = Math.ceil(dailyDemand * (LEAD_TIME_DAYS + SAFETY_STOCK_DAYS));

  // حساب كمية إعادة الطلب
  let suggestedQuantity = requiredStock - currentStock;

  // التأكد من أن الكمية لا تقل عن الحد الأدنى
  suggestedQuantity = Math.max(MIN_ORDER_QUANTITY, suggestedQuantity);

  // تحديد الأولوية
  let priority: 'high' | 'medium' | 'low' = 'low';
  if (currentStock === 0) {
    priority = 'high';
  } else if (currentStock <= 5) {
    priority = 'high';
  } else if (currentStock <= 10) {
    priority = 'medium';
  }

  // تحديد السبب
  let reason = '';
  if (currentStock === 0) {
    reason = 'المنتج نفد تماماً من المخزون';
  } else if (currentStock <= 5) {
    reason = 'المخزون منخفض جداً';
  } else if (currentStock <= 10) {
    reason = 'المخزون منخفض';
  } else {
    reason = 'إعادة الطلب الدوري';
  }

  return {
    productId,
    productName,
    currentStock,
    suggestedQuantity,
    reason,
    priority
  };
}

// إنشاء تقرير المخزون
export function generateInventoryReport(startDate: Date, endDate: Date): InventoryReport {
  const movements = getMovementsInPeriod(startDate, endDate);
  const products = require('./storage').getProducts();

  // حساب إجمالي الحركات حسب النوع
  const movementsByType = movements.reduce((acc, m) => {
    acc[m.type] = (acc[m.type] || 0) + m.quantity;
    return acc;
  }, {} as Record<StockMovementType, number>);

  // حساب المنتجات المتوفرة وغير المتوفرة
  const productsInStock = products.filter(p => p.inStock).length;
  const productsOutOfStock = products.filter(p => !p.inStock).length;
  const productsLowStock = products.filter(p => p.stock > 0 && p.stock <= 5).length;

  // حساب القيمة الإجمالية للمخزون
  const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);

  // حساب المنتجات الأكثر مبيعاً
  const salesMovements = movements.filter(m => m.type === 'sale');
  const salesByProduct = salesMovements.reduce((acc, m) => {
    if (!acc[m.productId]) {
      acc[m.productId] = {
        productId: m.productId,
        productName: m.productName,
        quantitySold: 0,
        revenue: 0
      };
    }
    acc[m.productId].quantitySold += m.quantity;
    return acc;
  }, {} as Record<string, { productId: string; productName: string; quantitySold: number; revenue: number }>);

  const topSellingProducts = Object.values(salesByProduct)
    .map(item => ({
      ...item,
      revenue: item.quantitySold * products.find(p => p.id === item.productId)?.price || 0
    }))
    .sort((a, b) => b.quantitySold - a.quantitySold)
    .slice(0, 10);

  return {
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    },
    totalMovements: movements.length,
    movementsByType,
    productsInStock,
    productsOutOfStock,
    productsLowStock,
    totalValue,
    topSellingProducts
  };
}

// التنبؤ بالطلب المستقبلي
export function forecastDemand(productId: string, daysToForecast: number): {
  predictedDemand: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
} {
  const movements = getProductMovements(productId);
  const salesMovements = movements.filter(m => m.type === 'sale');

  if (salesMovements.length < 2) {
    return {
      predictedDemand: 0,
      confidence: 'low',
      reasoning: 'بيانات غير كافية للتنبؤ'
    };
  }

  // حساب متوسط المبيعات اليومية
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const recentSales = salesMovements.filter(m => 
    new Date(m.createdAt) >= thirtyDaysAgo
  );

  if (recentSales.length === 0) {
    return {
      predictedDemand: 0,
      confidence: 'low',
      reasoning: 'لا توجد مبيعات في الـ 30 يوماً الماضية'
    };
  }

  const totalQuantity = recentSales.reduce((sum, m) => sum + m.quantity, 0);
  const averageDailySales = totalQuantity / 30;

  // حساب الانحراف المعياري
  const variance = recentSales.reduce((sum, m) => {
    const diff = m.quantity - averageDailySales;
    return sum + (diff * diff);
  }, 0) / recentSales.length;

  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = stdDev / averageDailySales;

  // تحديد مستوى الثقة
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (coefficientOfVariation < 0.3) {
    confidence = 'high';
  } else if (coefficientOfVariation < 0.6) {
    confidence = 'medium';
  }

  const predictedDemand = Math.round(averageDailySales * daysToForecast);

  let reasoning = '';
  if (confidence === 'high') {
    reasoning = 'نمط مبيعات ثابت مع ثقة عالية';
  } else if (confidence === 'medium') {
    reasoning = 'نمط مبيعات متغير مع ثقة متوسطة';
  } else {
    reasoning = 'نمط مبيعات غير ثابت مع ثقة منخفضة';
  }

  return {
    predictedDemand,
    confidence,
    reasoning
  };
}

// إدارة المستودعات
export function addWarehouse(name: string, location: string): Warehouse {
  const warehouses = readWarehouses();
  const warehouse: Warehouse = {
    id: `WH-${Date.now()}`,
    name,
    location,
    isActive: true
  };

  warehouses.push(warehouse);
  writeWarehouses(warehouses);

  return warehouse;
}

export function readWarehouses(): Warehouse[] {
  try {
    const raw = localStorage.getItem(WAREHOUSES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeWarehouses(warehouses: Warehouse[]): void {
  localStorage.setItem(WAREHOUSES_KEY, JSON.stringify(warehouses));
}

export function updateWarehouse(id: string, updates: Partial<Warehouse>): void {
  const warehouses = readWarehouses();
  const index = warehouses.findIndex(w => w.id === id);

  if (index >= 0) {
    warehouses[index] = { ...warehouses[index], ...updates };
    writeWarehouses(warehouses);
  }
}

export function deleteWarehouse(id: string): void {
  const warehouses = readWarehouses();
  const filtered = warehouses.filter(w => w.id !== id);
  writeWarehouses(filtered);
}

export function getActiveWarehouses(): Warehouse[] {
  return readWarehouses().filter(w => w.isActive);
}
