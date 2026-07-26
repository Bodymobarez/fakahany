export type NavIcon =
  | 'dashboard'
  | 'orders'
  | 'catalog'
  | 'customers'
  | 'delivery'
  | 'sales'
  | 'finance'
  | 'marketing'
  | 'content'
  | 'reports'
  | 'people'
  | 'settings';

export type NavItem = {
  label: string;
  href?: string;
  icon: NavIcon;
  children?: { label: string; href: string }[];
};

export const adminNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
  { label: 'Orders', href: '/orders', icon: 'orders' },
  {
    label: 'Catalog',
    icon: 'catalog',
    children: [
      { label: 'Products', href: '/catalog/products' },
      { label: 'Categories', href: '/catalog/categories' },
      { label: 'Brands', href: '/catalog/brands' },
      { label: 'Inventory', href: '/catalog/inventory' },
      { label: 'Attributes', href: '/catalog/attributes' },
      { label: 'Units', href: '/catalog/units' },
      { label: 'Suppliers', href: '/catalog/suppliers' },
      { label: 'Purchase Orders', href: '/catalog/purchase-orders' },
      { label: 'Vendors', href: '/catalog/vendors' },
      { label: 'Product Reviews', href: '/catalog/reviews' },
    ],
  },
  {
    label: 'Customers',
    icon: 'customers',
    children: [
      { label: 'Customers', href: '/customers' },
      { label: 'Customer Groups', href: '/customers/groups' },
      { label: 'Price Lists', href: '/customers/price-lists' },
      { label: 'Subscriptions', href: '/customers/subscriptions' },
      { label: 'Loyalty', href: '/customers/loyalty' },
      { label: 'Wallet', href: '/customers/wallet' },
      { label: 'Gift Cards', href: '/customers/gift-cards' },
      { label: 'Addresses', href: '/customers/addresses' },
      { label: 'Support', href: '/customers/support' },
    ],
  },
  {
    label: 'Delivery',
    icon: 'delivery',
    children: [
      { label: 'Drivers', href: '/delivery/drivers' },
      { label: 'Payouts', href: '/delivery/payouts' },
      { label: 'Delivery Companies', href: '/delivery/companies' },
      { label: 'Zones', href: '/delivery/zones' },
      { label: 'Route Planner', href: '/delivery/route-planner' },
      { label: 'Live Tracking', href: '/delivery/live-tracking' },
    ],
  },
  {
    label: 'Sales',
    icon: 'sales',
    children: [
      { label: 'Orders', href: '/sales/orders' },
      { label: 'Returns', href: '/sales/returns' },
      { label: 'Refunds', href: '/sales/refunds' },
      { label: 'POS', href: '/sales/pos' },
    ],
  },
  {
    label: 'Finance',
    icon: 'finance',
    children: [
      { label: 'Payments', href: '/finance/payments' },
      { label: 'Invoices', href: '/finance/invoices' },
      { label: 'Expenses', href: '/finance/expenses' },
      { label: 'VAT Reports', href: '/finance/vat-reports' },
      { label: 'Sales Reports', href: '/finance/sales-reports' },
    ],
  },
  {
    label: 'Marketing',
    icon: 'marketing',
    children: [
      { label: 'Promo Codes', href: '/marketing/promo-codes' },
      { label: 'Coupons', href: '/marketing/coupons' },
      { label: 'Flash Sales', href: '/marketing/flash-sales' },
      { label: 'Banners', href: '/marketing/banners' },
      { label: 'Notifications', href: '/marketing/notifications' },
      { label: 'Email', href: '/marketing/email' },
      { label: 'SMS', href: '/marketing/sms' },
      { label: 'Push', href: '/marketing/push' },
    ],
  },
  {
    label: 'Content',
    icon: 'content',
    children: [
      { label: 'Pages', href: '/content/pages' },
      { label: 'Blog', href: '/content/blog' },
      { label: 'Recipes', href: '/content/recipes' },
      { label: 'FAQ', href: '/content/faq' },
    ],
  },
  {
    label: 'Reports',
    icon: 'reports',
    children: [
      { label: 'Sales', href: '/reports/sales' },
      { label: 'Inventory', href: '/reports/inventory' },
      { label: 'Demand forecast', href: '/reports/demand-forecast' },
      { label: 'Customers', href: '/reports/customers' },
      { label: 'Finance', href: '/reports/finance' },
      { label: 'Marketing', href: '/reports/marketing' },
      { label: 'Delivery', href: '/reports/delivery' },
      { label: 'Profit', href: '/reports/profit' },
      { label: 'Best Sellers', href: '/reports/best-sellers' },
    ],
  },
  {
    label: 'People',
    icon: 'people',
    children: [
      { label: 'Users', href: '/people/users' },
      { label: 'Roles', href: '/people/roles' },
      { label: 'Permissions', href: '/people/permissions' },
      { label: 'Audit Logs', href: '/people/audit-logs' },
    ],
  },
  {
    label: 'Settings',
    icon: 'settings',
    children: [
      { label: 'Company', href: '/settings/company' },
      { label: 'Branches', href: '/settings/branches' },
      { label: 'Warehouses', href: '/settings/warehouses' },
      { label: 'Delivery Charges', href: '/settings/delivery-charges' },
      { label: 'Taxes', href: '/settings/taxes' },
      { label: 'Payment Gateway', href: '/settings/payment-gateway' },
      { label: 'Email', href: '/settings/email' },
      { label: 'SMS', href: '/settings/sms' },
      { label: 'WhatsApp', href: '/settings/whatsapp' },
      { label: 'Integrations', href: '/settings/integrations' },
      { label: 'Mobile App', href: '/settings/mobile-app' },
      { label: 'API', href: '/settings/api' },
      { label: 'Backup', href: '/settings/backup' },
    ],
  },
];
