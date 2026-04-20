// src/constants/paymentMethods.js
// Payment Methods Constants and Enums

export const PAYMENT_METHOD_TYPES = {
  CASH: 'cash',
  CARD: 'card', 
  BANK_TRANSFER: 'bank_transfer',
  DIGITAL: 'digital',
  OTHER: 'other'
};

export const PAYMENT_METHOD_ICONS = {
  [PAYMENT_METHOD_TYPES.CASH]: '💵',
  [PAYMENT_METHOD_TYPES.CARD]: '💳',
  [PAYMENT_METHOD_TYPES.BANK_TRANSFER]: '🏦',
  [PAYMENT_METHOD_TYPES.DIGITAL]: '📱',
  [PAYMENT_METHOD_TYPES.OTHER]: '📄'
};

export const PAYMENT_METHOD_COLORS = {
  [PAYMENT_METHOD_TYPES.CASH]: 'text-green-600 bg-green-100',
  [PAYMENT_METHOD_TYPES.CARD]: 'text-blue-600 bg-blue-100', 
  [PAYMENT_METHOD_TYPES.BANK_TRANSFER]: 'text-purple-600 bg-purple-100',
  [PAYMENT_METHOD_TYPES.DIGITAL]: 'text-orange-600 bg-orange-100',
  [PAYMENT_METHOD_TYPES.OTHER]: 'text-gray-600 bg-gray-100'
};

export const DEFAULT_PAYMENT_METHODS = [
  {
    id: 1,
    name: 'Cash',
    nameAr: 'نقدي',
    type: PAYMENT_METHOD_TYPES.CASH,
    description: 'نقدي - دفع نقدي مباشر',
    icon: PAYMENT_METHOD_ICONS[PAYMENT_METHOD_TYPES.CASH]
  },
  {
    id: 2,
    name: 'Visa',
    nameAr: 'فيزا',
    type: PAYMENT_METHOD_TYPES.CARD,
    description: 'فيزا - بطاقة ائتمان فيزا',
    icon: PAYMENT_METHOD_ICONS[PAYMENT_METHOD_TYPES.CARD]
  },
  {
    id: 3,
    name: 'Mastercard',
    nameAr: 'ماستر كارد',
    type: PAYMENT_METHOD_TYPES.CARD,
    description: 'ماستر كارد - بطاقة ائتمان ماستر كارد', 
    icon: PAYMENT_METHOD_ICONS[PAYMENT_METHOD_TYPES.CARD]
  },
  {
    id: 4,
    name: 'Bank Transfer',
    nameAr: 'تحويل بنكي',
    type: PAYMENT_METHOD_TYPES.BANK_TRANSFER,
    description: 'تحويل بنكي - تحويل من البنك',
    icon: PAYMENT_METHOD_ICONS[PAYMENT_METHOD_TYPES.BANK_TRANSFER]
  },
  {
    id: 5,
    name: 'Meeza',
    nameAr: 'ميزة',
    type: PAYMENT_METHOD_TYPES.CARD,
    description: 'ميزة - بطاقة دفع مصرية',
    icon: PAYMENT_METHOD_ICONS[PAYMENT_METHOD_TYPES.CARD]
  },
  {
    id: 6,
    name: 'Fawry',
    nameAr: 'فوري',
    type: PAYMENT_METHOD_TYPES.DIGITAL,
    description: 'فوري - محفظة إلكترونية',
    icon: PAYMENT_METHOD_ICONS[PAYMENT_METHOD_TYPES.DIGITAL]
  },
  {
    id: 7,
    name: 'Vodafone Cash',
    nameAr: 'فودافون كاش',
    type: PAYMENT_METHOD_TYPES.DIGITAL,
    description: 'فودافون كاش - محفظة إلكترونية',
    icon: PAYMENT_METHOD_ICONS[PAYMENT_METHOD_TYPES.DIGITAL]
  },
  {
    id: 8,
    name: 'Orange Money',
    nameAr: 'أورانج موني',
    type: PAYMENT_METHOD_TYPES.DIGITAL,
    description: 'أورانج موني - محفظة إلكترونية',
    icon: PAYMENT_METHOD_ICONS[PAYMENT_METHOD_TYPES.DIGITAL]
  },
  {
    id: 9,
    name: 'InstaPay',
    nameAr: 'إنستا باي',
    type: PAYMENT_METHOD_TYPES.DIGITAL,
    description: 'إنستا باي - نظام دفع فوري',
    icon: PAYMENT_METHOD_ICONS[PAYMENT_METHOD_TYPES.DIGITAL]
  },
  {
    id: 10,
    name: 'CIB Wallet',
    nameAr: 'محفظة CIB',
    type: PAYMENT_METHOD_TYPES.DIGITAL,
    description: 'محفظة البنك التجاري الدولي',
    icon: PAYMENT_METHOD_ICONS[PAYMENT_METHOD_TYPES.DIGITAL]
  },
  {
    id: 11,
    name: 'Check',
    nameAr: 'شيك',
    type: PAYMENT_METHOD_TYPES.OTHER,
    description: 'شيك - دفع بشيك بنكي',
    icon: PAYMENT_METHOD_ICONS[PAYMENT_METHOD_TYPES.OTHER]
  },
  {
    id: 12,
    name: 'Money Order',
    nameAr: 'حوالة مالية',
    type: PAYMENT_METHOD_TYPES.OTHER,
    description: 'حوالة مالية',
    icon: PAYMENT_METHOD_ICONS[PAYMENT_METHOD_TYPES.OTHER]
  }
];

// Helper functions
export const getPaymentMethodIcon = (type) => {
  return PAYMENT_METHOD_ICONS[type] || PAYMENT_METHOD_ICONS[PAYMENT_METHOD_TYPES.OTHER];
};

export const getPaymentMethodColor = (type) => {
  return PAYMENT_METHOD_COLORS[type] || PAYMENT_METHOD_COLORS[PAYMENT_METHOD_TYPES.OTHER];
};

export const getPaymentMethodByName = (name) => {
  return DEFAULT_PAYMENT_METHODS.find(method => 
    method.name.toLowerCase() === name.toLowerCase() || 
    method.nameAr === name
  );
};

export const getPaymentMethodById = (id) => {
  return DEFAULT_PAYMENT_METHODS.find(method => method.id === id);
};

export default {
  PAYMENT_METHOD_TYPES,
  PAYMENT_METHOD_ICONS,
  PAYMENT_METHOD_COLORS,
  DEFAULT_PAYMENT_METHODS,
  getPaymentMethodIcon,
  getPaymentMethodColor,
  getPaymentMethodByName,
  getPaymentMethodById
};
