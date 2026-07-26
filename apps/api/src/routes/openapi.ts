import { Router } from 'express';

/** Lightweight OpenAPI stub for mobile/admin consumers (Phase 0 quality gate). */
export const openapiRouter = Router();

openapiRouter.get('/openapi.json', (_req, res) => {
  res.json({
    openapi: '3.0.3',
    info: {
      title: 'Fresh Harvest API',
      version: '0.1.0',
      description: 'Fruits & Vegetables eCommerce REST API',
    },
    servers: [{ url: 'http://localhost:4000' }],
    paths: {
      '/api/health': { get: { summary: 'Health check', responses: { '200': { description: 'OK' } } } },
      '/api/auth/login': { post: { summary: 'Login', responses: { '200': { description: 'Tokens' } } } },
      '/api/auth/register': { post: { summary: 'Register', responses: { '201': { description: 'Created' } } } },
      '/api/catalog/products': { get: { summary: 'List products', responses: { '200': { description: 'OK' } } } },
      '/api/catalog/categories': { get: { summary: 'Category tree', responses: { '200': { description: 'OK' } } } },
      '/api/cart': { get: { summary: 'Get cart' }, post: { summary: 'Mutate cart' } },
      '/api/checkout': { post: { summary: 'Place order' } },
      '/api/orders': { get: { summary: 'Customer orders' } },
      '/api/compliance/export': { get: { summary: 'PDPL data export' } },
      '/api/expansion/graphql': { get: { summary: 'GraphQL readiness stub' } },
      '/api/admin/reports/dashboard': { get: { summary: 'Admin KPIs' } },
    },
  });
});
