import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient, ProductType, RelationType, SoldAs, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Admin123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@freshharvest.ae' },
    update: {
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      isActive: true,
      emailVerified: true,
    },
    create: {
      email: 'admin@freshharvest.ae',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      emailVerified: true,
      wallet: { create: {} },
      loyaltyAccount: { create: {} },
    },
  });

  const customerPhone = '+971509876543';
  const phoneTaken = await prisma.user.findFirst({
    where: { phone: customerPhone, NOT: { email: 'customer@freshharvest.ae' } },
  });
  if (phoneTaken) {
    await prisma.user.update({
      where: { id: phoneTaken.id },
      data: { phone: null },
    });
  }

  const customer = await prisma.user.upsert({
    where: { email: 'customer@freshharvest.ae' },
    update: {
      passwordHash,
      firstName: 'Sara',
      lastName: 'Customer',
      role: UserRole.CUSTOMER,
      isActive: true,
      emailVerified: true,
      phone: customerPhone,
      phoneVerified: true,
    },
    create: {
      email: 'customer@freshharvest.ae',
      username: 'sara.customer',
      passwordHash,
      firstName: 'Sara',
      lastName: 'Customer',
      role: UserRole.CUSTOMER,
      emailVerified: true,
      phone: customerPhone,
      phoneVerified: true,
      wallet: { create: { balance: 50 } },
      loyaltyAccount: { create: { points: 250 } },
      addresses: {
        create: {
          label: 'Home',
          line1: 'Marina Walk, Dubai Marina',
          city: 'Dubai',
          emirate: 'Dubai',
          lat: 25.0805,
          lng: 55.1403,
          isDefault: true,
        },
      },
    },
  });
  const hasAddr = await prisma.address.findFirst({ where: { userId: customer.id } });
  if (!hasAddr) {
    await prisma.address.create({
      data: {
        userId: customer.id,
        label: 'Home',
        line1: 'Marina Walk, Dubai Marina',
        city: 'Dubai',
        emirate: 'Dubai',
        lat: 25.0805,
        lng: 55.1403,
        isDefault: true,
      },
    });
  }

  const existingSettings = await prisma.companySettings.findFirst();
  const paymentGateways = {
    cod: true,
    stripe: true,
    tabby: true,
    tamara: true,
    applePay: true,
    googlePay: true,
  };
  if (existingSettings) {
    await prisma.companySettings.update({
      where: { id: existingSettings.id },
      data: {
        companyName: 'Fresh Harvest UAE',
        trn: '100000000000003',
        vatRate: 5,
        currency: 'AED',
        timezone: 'Asia/Dubai',
        address: 'Dubai Investment Park, Dubai, UAE',
        paymentGateways,
      },
    });
  } else {
    await prisma.companySettings.create({
      data: {
        companyName: 'Fresh Harvest UAE',
        trn: '100000000000003',
        vatRate: 5,
        currency: 'AED',
        timezone: 'Asia/Dubai',
        address: 'Dubai Investment Park, Dubai, UAE',
        paymentGateways,
      },
    });
  }

  await prisma.membershipLevel.upsert({
    where: { slug: 'green' },
    update: {},
    create: { name: 'Green', slug: 'green', minPoints: 0, earnRate: 1 },
  });
  await prisma.membershipLevel.upsert({
    where: { slug: 'gold' },
    update: {},
    create: { name: 'Gold', slug: 'gold', minPoints: 1000, earnRate: 1.5 },
  });

  const branch = await prisma.branch.upsert({
    where: { code: 'DXB-01' },
    update: {},
    create: {
      name: 'Dubai Main',
      code: 'DXB-01',
      address: 'Dubai Investment Park, Dubai',
    },
  });

  const warehouse = await prisma.warehouse.upsert({
    where: { code: 'WH-DXB-01' },
    update: { isDefault: true },
    create: {
      name: 'Dubai Cold Store',
      code: 'WH-DXB-01',
      branchId: branch.id,
      isDefault: true,
    },
  });

  await prisma.warehouse.upsert({
    where: { code: 'WH-AUH-01' },
    update: {},
    create: {
      name: 'Abu Dhabi Hub',
      code: 'WH-AUH-01',
      branchId: branch.id,
      isDefault: false,
    },
  });

  const categories = [
    { nameEn: 'Fruits', nameAr: 'فواكه', slug: 'fruits', sortOrder: 1 },
    { nameEn: 'Vegetables', nameAr: 'خضروات', slug: 'vegetables', sortOrder: 2 },
    { nameEn: 'Leafy Greens', nameAr: 'ورقيات', slug: 'leafy-greens', sortOrder: 3 },
    { nameEn: 'Organic', nameAr: 'عضوي', slug: 'organic', sortOrder: 4 },
  ];

  const placeholder = (seed: string) =>
    `https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=80&sig=${encodeURIComponent(seed)}`;

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { nameEn: cat.nameEn, nameAr: cat.nameAr, sortOrder: cat.sortOrder, isActive: true },
      create: { ...cat, imageUrl: placeholder(cat.slug) },
    });
  }

  const brands = [
    { name: 'Fresh Harvest', slug: 'fresh-harvest' },
    { name: 'Farm Direct', slug: 'farm-direct' },
    { name: 'Oasis Organics', slug: 'oasis-organics' },
  ];

  for (const brand of brands) {
    await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: { name: brand.name },
      create: { ...brand, logoUrl: placeholder(`brand-${brand.slug}`) },
    });
  }

  const fruits = await prisma.category.findUniqueOrThrow({ where: { slug: 'fruits' } });
  const veggies = await prisma.category.findUniqueOrThrow({ where: { slug: 'vegetables' } });
  const organic = await prisma.category.findUniqueOrThrow({ where: { slug: 'organic' } });
  const fhBrand = await prisma.brand.findUniqueOrThrow({ where: { slug: 'fresh-harvest' } });
  const oasis = await prisma.brand.findUniqueOrThrow({ where: { slug: 'oasis-organics' } });

  const products = [
    {
      nameEn: 'Alphonso Mango',
      nameAr: 'مانجو ألفونسو',
      slug: 'alphonso-mango',
      sku: 'FR-MNG-001',
      basePrice: 29.9,
      compareAtPrice: 34.9,
      stockQty: 120,
      soldAs: SoldAs.PIECE,
      weight: 1,
      unit: 'kg',
      type: ProductType.SIMPLE,
      brandId: fhBrand.id,
      categoryIds: [fruits.id],
      isFeatured: true,
      isBestSeller: true,
      isSeasonal: true,
      tags: ['mango', 'seasonal'],
      descriptionEn: 'Sweet premium Alphonso mangoes, carefully ripened.',
      descriptionAr: 'مانجو ألفونسو فاخرة وحلوة النضج.',
    },
    {
      nameEn: 'Organic Baby Spinach',
      nameAr: 'سبانخ عضوية',
      slug: 'organic-baby-spinach',
      sku: 'VG-SPN-001',
      basePrice: 9.5,
      stockQty: 80,
      soldAs: SoldAs.PIECE,
      weight: 200,
      unit: 'g',
      type: ProductType.SIMPLE,
      brandId: oasis.id,
      categoryIds: [veggies.id, organic.id],
      isOrganic: true,
      isFeatured: true,
      isNew: true,
      tags: ['spinach', 'organic', 'leafy'],
      descriptionEn: 'Tender organic baby spinach leaves.',
      descriptionAr: 'أوراق سبانخ عضوية طرية.',
    },
    {
      nameEn: 'Cherry Tomatoes',
      nameAr: 'طماطم كرزية',
      slug: 'cherry-tomatoes',
      sku: 'VG-TMT-001',
      basePrice: 7.75,
      stockQty: 200,
      soldAs: SoldAs.PIECE,
      weight: 250,
      unit: 'g',
      type: ProductType.SIMPLE,
      brandId: fhBrand.id,
      categoryIds: [veggies.id],
      isBestSeller: true,
      tags: ['tomato', 'salad'],
      descriptionEn: 'Juicy cherry tomatoes perfect for salads.',
      descriptionAr: 'طماطم كرزية مثالية للسلطات.',
    },
    {
      nameEn: 'Medjool Dates',
      nameAr: 'تمر مجهول',
      slug: 'medjool-dates',
      sku: 'FR-DAT-001',
      basePrice: 45,
      stockQty: 60,
      soldAs: SoldAs.PIECE,
      weight: 1,
      unit: 'kg',
      type: ProductType.SIMPLE,
      brandId: fhBrand.id,
      categoryIds: [fruits.id],
      isFeatured: true,
      isImported: false,
      originCountry: 'UAE',
      tags: ['dates', 'ramadan'],
      descriptionEn: 'Premium UAE Medjool dates.',
      descriptionAr: 'تمر مجهول إماراتي فاخر.',
    },
    {
      nameEn: 'Hass Avocado Box',
      nameAr: 'صندوق أفوكادو هاس',
      slug: 'hass-avocado-box',
      sku: 'FR-AVC-BOX',
      basePrice: 59,
      stockQty: 40,
      soldAs: SoldAs.BOX,
      weight: 2,
      unit: 'kg',
      type: ProductType.BUNDLE,
      brandId: fhBrand.id,
      categoryIds: [fruits.id],
      isLimited: true,
      allowPreorder: true,
      tags: ['avocado', 'bundle'],
      descriptionEn: 'Box of ripe Hass avocados.',
      descriptionAr: 'صندوق أفوكادو هاس ناضج.',
    },
  ];

  for (const p of products) {
    const { categoryIds, ...data } = p;
    const product = await prisma.product.upsert({
      where: { slug: data.slug },
      update: {
        ...data,
        isActive: true,
      },
      create: {
        ...data,
        descriptionEn: data.descriptionEn,
        descriptionAr: data.descriptionAr,
        images: {
          create: [
            {
              url: placeholder(data.slug),
              sortOrder: 0,
              isPrimary: true,
            },
          ],
        },
        categories: {
          create: categoryIds.map((categoryId) => ({ categoryId })),
        },
      },
    });

    for (const categoryId of categoryIds) {
      await prisma.productCategory.upsert({
        where: { productId_categoryId: { productId: product.id, categoryId } },
        update: {},
        create: { productId: product.id, categoryId },
      });
    }

    const imageCount = await prisma.productImage.count({ where: { productId: product.id } });
    if (imageCount === 0) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: placeholder(data.slug),
          sortOrder: 0,
          isPrimary: true,
        },
      });
    }

    const existingLevel = await prisma.stockLevel.findFirst({
      where: { warehouseId: warehouse.id, productId: product.id, productVariantId: null },
    });
    if (existingLevel) {
      await prisma.stockLevel.update({
        where: { id: existingLevel.id },
        data: { qty: data.stockQty, reorderLevel: 10 },
      });
    } else {
      await prisma.stockLevel.create({
        data: {
          warehouseId: warehouse.id,
          productId: product.id,
          qty: data.stockQty,
          reorderLevel: 10,
        },
      });
    }

    const batchExists = await prisma.stockBatch.findFirst({
      where: { warehouseId: warehouse.id, productId: product.id, batchNumber: `SEED-${data.sku}` },
    });
    if (!batchExists) {
      await prisma.stockBatch.create({
        data: {
          warehouseId: warehouse.id,
          productId: product.id,
          batchNumber: `SEED-${data.sku}`,
          lotNumber: 'LOT-SEED',
          expiryDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
          qty: data.stockQty,
        },
      });
    }
  }

  // Rough Dubai bbox as GeoJSON polygon [lng, lat]
  const dubaiPolygon = {
    type: 'Polygon',
    coordinates: [
      [
        [54.89, 24.85],
        [55.65, 24.85],
        [55.65, 25.45],
        [54.89, 25.45],
        [54.89, 24.85],
      ],
    ],
  };
  const abuDhabiPolygon = {
    type: 'Polygon',
    coordinates: [
      [
        [54.2, 24.2],
        [54.85, 24.2],
        [54.85, 24.7],
        [54.2, 24.7],
        [54.2, 24.2],
      ],
    ],
  };

  const existingZone = await prisma.deliveryZone.findFirst({ where: { name: 'Dubai Metro' } });
  if (!existingZone) {
    await prisma.deliveryZone.create({
      data: {
        name: 'Dubai Metro',
        emirate: 'Dubai',
        polygon: dubaiPolygon,
        baseFee: 15,
        freeAbove: 150,
        etaMinutes: 90,
      },
    });
  } else if (!existingZone.polygon) {
    await prisma.deliveryZone.update({
      where: { id: existingZone.id },
      data: { polygon: dubaiPolygon },
    });
  }

  const abuZone = await prisma.deliveryZone.findFirst({ where: { name: 'Abu Dhabi City' } });
  if (!abuZone) {
    await prisma.deliveryZone.create({
      data: {
        name: 'Abu Dhabi City',
        emirate: 'Abu Dhabi',
        polygon: abuDhabiPolygon,
        baseFee: 20,
        freeAbove: 200,
        etaMinutes: 120,
      },
    });
  }

  const driverUser = await prisma.user.upsert({
    where: { email: 'driver@freshharvest.ae' },
    update: { role: UserRole.DRIVER, isActive: true, passwordHash },
    create: {
      email: 'driver@freshharvest.ae',
      passwordHash,
      firstName: 'Ahmed',
      lastName: 'Driver',
      role: UserRole.DRIVER,
      phone: '+971500000001',
      phoneVerified: true,
      wallet: { create: {} },
      loyaltyAccount: { create: {} },
    },
  });
  const existingDriver = await prisma.driver.findFirst({ where: { userId: driverUser.id } });
  if (!existingDriver) {
    await prisma.driver.create({
      data: {
        userId: driverUser.id,
        licenseNo: 'DXB-DRV-001',
        isActive: true,
        isOnline: true,
        vehicles: {
          create: {
            plateNo: 'D-12345',
            make: 'Toyota',
            model: 'Hilux',
          },
        },
      },
    });
  }

  await prisma.cmsPage.upsert({
    where: { slug: 'about' },
    update: {},
    create: {
      titleEn: 'About Fresh Harvest',
      titleAr: 'عن فريش هارفيست',
      slug: 'about',
      bodyEn: 'Farm-fresh produce delivered across the UAE.',
      bodyAr: 'منتجات طازجة تُوصل في جميع أنحاء الإمارات.',
    },
  });

  const faqCount = await prisma.faq.count();
  if (faqCount === 0) {
    await prisma.faq.createMany({
      data: [
        {
          questionEn: 'Do you deliver same day?',
          questionAr: 'هل التوصيل في نفس اليوم؟',
          answerEn: 'Yes, same-day delivery is available in selected Dubai zones.',
          answerAr: 'نعم، يتوفر التوصيل في نفس اليوم في مناطق مختارة بدبي.',
          sortOrder: 1,
        },
        {
          questionEn: 'What is your VAT rate?',
          questionAr: 'ما هي نسبة ضريبة القيمة المضافة؟',
          answerEn: 'We charge 5% UAE VAT on applicable goods.',
          answerAr: 'نفرض ضريبة القيمة المضافة بنسبة 5٪ على السلع الخاضعة.',
          sortOrder: 2,
        },
      ],
    });
  }

  await prisma.blogPost.upsert({
    where: { slug: 'seasonal-uae-produce' },
    update: {},
    create: {
      titleEn: 'What’s in season in the UAE',
      titleAr: 'ما هو موسمي في الإمارات',
      slug: 'seasonal-uae-produce',
      excerptEn: 'A quick guide to peak-flavour fruits and vegetables this month.',
      excerptAr: 'دليل سريع لأفضل الفواكه والخضروات هذا الشهر.',
      bodyEn:
        'Shop mango, dates, and leafy greens at their peak. Same-day delivery keeps produce cooler and fresher for your table.',
      bodyAr: 'تسوق المانجو والتمر والورقيات في أفضل حالاتها مع توصيل في نفس اليوم.',
      coverUrl:
        'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
      publishedAt: new Date(),
      isActive: true,
    },
  });

  for (const unit of [
    { name: 'Gram', slug: 'g', symbol: 'g' },
    { name: 'Kilogram', slug: 'kg', symbol: 'kg' },
    { name: 'Bunch', slug: 'bunch', symbol: 'bunch' },
    { name: 'Pack', slug: 'pack', symbol: 'pack' },
  ]) {
    await prisma.unit.upsert({
      where: { slug: unit.slug },
      update: { name: unit.name, symbol: unit.symbol },
      create: unit,
    });
  }

  await prisma.deliveryCompany.upsert({
    where: { code: 'FH-FLEET' },
    update: {},
    create: {
      name: 'Fresh Harvest Fleet',
      code: 'FH-FLEET',
      contact: 'Dispatch',
      phone: '+97140000000',
      email: 'dispatch@freshharvest.ae',
    },
  });

  const spinach = await prisma.product.findUnique({ where: { slug: 'organic-baby-spinach' } });
  const tomatoes = await prisma.product.findUnique({ where: { slug: 'cherry-tomatoes' } });
  await prisma.recipe.upsert({
    where: { slug: 'garden-salad' },
    update: {},
    create: {
      titleEn: 'Garden Fresh Salad',
      titleAr: 'سلطة الحديقة الطازجة',
      slug: 'garden-salad',
      bodyEn:
        'Toss baby spinach with cherry tomatoes, a squeeze of lemon, olive oil, salt and pepper. Serve chilled.',
      bodyAr: 'اخلط السبانخ مع الطماطم الكرزية وعصير الليمون وزيت الزيتون والملح والفلفل.',
      imageUrl:
        'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80',
      prepMinutes: 10,
      items: {
        create: [
          ...(spinach ? [{ productId: spinach.id, quantity: '1 pack' }] : []),
          ...(tomatoes ? [{ productId: tomatoes.id, quantity: '1 pack' }] : []),
        ],
      },
    },
  });

  const couponCount = await prisma.coupon.count();
  if (couponCount === 0) {
    await prisma.coupon.create({
      data: {
        code: 'FRESH10',
        type: 'PERCENT',
        value: 10,
        minOrder: 50,
        maxUses: 1000,
        isActive: true,
      },
    });
  }

  const flashCount = await prisma.flashSale.count();
  if (flashCount === 0) {
    const flashProducts = await prisma.product.findMany({
      where: { isActive: true },
      take: 4,
      orderBy: { createdAt: 'asc' },
    });
    if (flashProducts.length) {
      await prisma.flashSale.create({
        data: {
          nameEn: 'Weekend Fresh Flash',
          nameAr: 'تخفيضات نهاية الأسبوع',
          startsAt: new Date(Date.now() - 60 * 60 * 1000),
          endsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          isActive: true,
          items: {
            create: flashProducts.map((p) => ({
              productId: p.id,
              salePrice: Math.max(1, Math.round(Number(p.basePrice) * 0.85 * 100) / 100),
              stockLimit: 50,
            })),
          },
        },
      });
    }
  }

  // Demo pack variants on cherry tomatoes if present
  const variantProduct = await prisma.product.findUnique({ where: { slug: 'cherry-tomatoes' } });
  if (variantProduct) {
    const vCount = await prisma.productVariant.count({ where: { productId: variantProduct.id } });
    if (vCount === 0) {
      await prisma.productVariant.createMany({
        data: [
          {
            productId: variantProduct.id,
            name: '250g pack',
            sku: `${variantProduct.sku}-250`,
            price: Math.max(1, Number(variantProduct.basePrice) * 0.55),
            stockQty: 40,
          },
          {
            productId: variantProduct.id,
            name: '500g pack',
            sku: `${variantProduct.sku}-500`,
            price: Number(variantProduct.basePrice),
            stockQty: 40,
          },
        ],
      });
      await prisma.product.update({
        where: { id: variantProduct.id },
        data: { type: ProductType.VARIABLE },
      });
    }
  }

  const vendor = await prisma.vendor.upsert({
    where: { slug: 'al-ain-farms' },
    update: { name: 'Al Ain Farms', isActive: true },
    create: {
      name: 'Al Ain Farms',
      slug: 'al-ain-farms',
      email: 'vendors@alainfarms.example',
      phone: '+97137000000',
    },
  });
  await prisma.product.updateMany({
    where: {
      slug: { in: ['cherry-tomatoes', 'organic-baby-spinach', 'hass-avocado-box'] },
    },
    data: { vendorId: vendor.id },
  });

  const mango = await prisma.product.findUnique({ where: { slug: 'alphonso-mango' } });
  const dates = await prisma.product.findUnique({ where: { slug: 'medjool-dates' } });
  const avocado = await prisma.product.findUnique({ where: { slug: 'hass-avocado-box' } });
  const relationPairs: Array<[string, string]> = [];
  if (mango && dates) relationPairs.push([mango.id, dates.id], [dates.id, mango.id]);
  if (spinach && tomatoes) relationPairs.push([spinach.id, tomatoes.id], [tomatoes.id, spinach.id]);
  if (tomatoes && avocado) relationPairs.push([tomatoes.id, avocado.id]);
  for (const [productId, relatedId] of relationPairs) {
    await prisma.productRelation.upsert({
      where: {
        productId_relatedId_relationType: {
          productId,
          relatedId,
          relationType: RelationType.RELATED,
        },
      },
      update: {},
      create: { productId, relatedId, relationType: RelationType.RELATED },
    });
  }

  const existingSupplier = await prisma.supplier.findFirst({ where: { name: 'Gulf Fresh Produce' } });
  if (!existingSupplier) {
    await prisma.supplier.create({
      data: {
        name: 'Gulf Fresh Produce',
        email: 'orders@gulffresh.example',
        phone: '+97145000000',
        address: 'Al Quoz, Dubai',
        trn: '100000000000099',
        isActive: true,
      },
    });
  }

  const bannerCount = await prisma.banner.count();
  if (bannerCount === 0) {
    await prisma.banner.createMany({
      data: [
        {
          titleEn: 'Weekend citrus haul',
          titleAr: 'عرض الحمضيات',
          imageUrl:
            'https://images.unsplash.com/photo-1557800636-894a64c1696f?auto=format&fit=crop&w=1200&q=80',
          linkUrl: '/products?category=fruits',
          sortOrder: 0,
          isActive: true,
        },
        {
          titleEn: 'Farm greens, same-day Dubai',
          titleAr: 'خضار طازجة في دبي',
          imageUrl:
            'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80',
          linkUrl: '/products?category=vegetables',
          sortOrder: 1,
          isActive: true,
        },
      ],
    });
  }

  await prisma.giftCard.upsert({
    where: { code: 'GIFT50' },
    update: {
      balance: 50,
      initialAmount: 50,
      isActive: true,
      redeemedById: null,
      redeemedAt: null,
      note: 'Demo gift card 50 AED',
    },
    create: {
      code: 'GIFT50',
      initialAmount: 50,
      balance: 50,
      note: 'Demo gift card 50 AED',
    },
  });

  const horeca = await prisma.customerGroup.upsert({
    where: { slug: 'horeca' },
    update: { name: 'HORECA', discount: 5 },
    create: { name: 'HORECA', slug: 'horeca', discount: 5 },
  });
  await prisma.customerGroupMember.upsert({
    where: { groupId_userId: { groupId: horeca.id, userId: customer.id } },
    update: {},
    create: { groupId: horeca.id, userId: customer.id },
  });
  let wholesaleList = await prisma.priceList.findFirst({
    where: { name: 'HORECA wholesale', groupId: horeca.id },
  });
  if (!wholesaleList) {
    wholesaleList = await prisma.priceList.create({
      data: { name: 'HORECA wholesale', groupId: horeca.id, isActive: true },
    });
  }
  const tomato = await prisma.product.findUnique({ where: { slug: 'cherry-tomatoes' } });
  if (tomato) {
    const existingItem = await prisma.priceListItem.findFirst({
      where: { priceListId: wholesaleList.id, productId: tomato.id },
    });
    if (!existingItem) {
      await prisma.priceListItem.create({
        data: {
          priceListId: wholesaleList.id,
          productId: tomato.id,
          price: Math.max(1, Math.round(Number(tomato.basePrice) * 0.75 * 100) / 100),
        },
      });
    }
  }

  console.log('Seed complete');
  console.log(`Admin: admin@freshharvest.ae / Admin123! (${admin.id})`);
  console.log(`Customer: customer@freshharvest.ae / Admin123! (${customer.id})`);
  console.log(`Warehouse: ${warehouse.code}`);
  console.log('Gift card: GIFT50 (50 AED)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
