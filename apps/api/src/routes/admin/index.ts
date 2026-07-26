import { Router } from 'express';
import { authenticate, requireRoles } from '../../middleware/auth';
import { productsAdminRouter } from './products';
import { ordersAdminRouter } from './orders';
import { customersAdminRouter } from './customers';
import { settingsAdminRouter } from './settings';
import { inventoryAdminRouter } from './inventory';
import { suppliersAdminRouter } from './suppliers';
import { deliveryAdminRouter } from './delivery';
import { marketingAdminRouter } from './marketing';
import { financeAdminRouter } from './finance';
import { contentAdminRouter } from './content';
import { peopleAdminRouter } from './people';
import { reportsAdminRouter } from './reports';
import { catalogAdminRouter } from './catalog';
import { posAdminRouter } from './pos';

export const adminRouter = Router();

adminRouter.use(authenticate, requireRoles('ADMIN', 'STAFF'));

adminRouter.use('/catalog', catalogAdminRouter);
adminRouter.use('/pos', posAdminRouter);
adminRouter.use('/products', productsAdminRouter);
adminRouter.use('/orders', ordersAdminRouter);
adminRouter.use('/customers', customersAdminRouter);
adminRouter.use('/settings', settingsAdminRouter);
adminRouter.use('/inventory', inventoryAdminRouter);
adminRouter.use('/suppliers', suppliersAdminRouter);
adminRouter.use('/delivery', deliveryAdminRouter);
adminRouter.use('/marketing', marketingAdminRouter);
adminRouter.use('/finance', financeAdminRouter);
adminRouter.use('/content', contentAdminRouter);
adminRouter.use('/people', peopleAdminRouter);
adminRouter.use('/reports', reportsAdminRouter);
