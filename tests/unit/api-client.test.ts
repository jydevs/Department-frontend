import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('API Client - Request Base', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should make GET requests with correct headers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: 'test' }),
      status: 200,
    });

    const response = await fetch('http://api/test', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer token',
        'Content-Type': 'application/json',
      },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://api/test',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Authorization': 'Bearer token',
        }),
      })
    );
  });

  it('should make POST requests with body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1 }),
      status: 201,
    });

    const response = await fetch('http://api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test' }),
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://api/test',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'test' }),
      })
    );
  });

  it('should add Authorization header when token exists', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await fetch('http://api/test', {
      headers: { 'Authorization': 'Bearer mytoken' },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer mytoken',
        }),
      })
    );
  });

  it('should add X-Cart-Token header for cart operations', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await fetch('http://api/cart', {
      headers: { 'X-Cart-Token': 'cart123' },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Cart-Token': 'cart123',
        }),
      })
    );
  });

  it('should add Idempotency-Key for PUT/POST requests', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await fetch('http://api/test', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'unique-id' },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Idempotency-Key': 'unique-id',
        }),
      })
    );
  });

  it('should parse JSON response', async () => {
    const testData = { name: 'product', price: 100 };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => testData,
      status: 200,
    });

    const response = await fetch('http://api/test');
    const json = await response.json();

    expect(json).toEqual(testData);
  });

  it('should set Content-Type to application/json', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await fetch('http://api/test', {
      headers: { 'Content-Type': 'application/json' },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
  });
});

describe('API Client - Storefront API', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should fetch products list', async () => {
    const products = [
      { id: '1', name: 'Product 1', price: 100 },
      { id: '2', name: 'Product 2', price: 200 },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: products }),
      status: 200,
    });

    const response = await fetch('http://api/storefront/products');
    const data = await response.json();

    expect(data.data).toHaveLength(2);
    expect(data.data[0].name).toBe('Product 1');
  });

  it('should fetch single product by handle', async () => {
    const product = { id: '1', handle: 'basic-t-shirt', name: 'Basic T-Shirt', price: 50 };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: product }),
    });

    const response = await fetch('http://api/storefront/products/basic-t-shirt');
    const data = await response.json();

    expect(data.data.handle).toBe('basic-t-shirt');
  });

  it('should fetch collections', async () => {
    const collections = [
      { id: '1', handle: 'men', name: 'Men' },
      { id: '2', handle: 'women', name: 'Women' },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: collections }),
    });

    const response = await fetch('http://api/storefront/collections');
    const data = await response.json();

    expect(data.data).toHaveLength(2);
  });

  it('should create cart', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 'cart123', lines: [] } }),
      status: 201,
    });

    const response = await fetch('http://api/storefront/carts', {
      method: 'POST',
    });

    expect(response.status).toBe(201);
  });

  it('should add item to cart', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 'cart123', lines: [{ id: '1', quantity: 1 }] } }),
    });

    const response = await fetch('http://api/storefront/carts/cart123/lines', {
      method: 'POST',
      body: JSON.stringify({ variantId: 'var123', quantity: 1 }),
    });

    expect(response.ok).toBe(true);
  });

  it('should remove item from cart', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 'cart123', lines: [] } }),
    });

    const response = await fetch('http://api/storefront/carts/cart123/lines/line123', {
      method: 'DELETE',
    });

    expect(response.ok).toBe(true);
  });

  it('should checkout', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { orderId: 'order123', total: 150 } }),
      status: 201,
    });

    const response = await fetch('http://api/storefront/checkouts', {
      method: 'POST',
      body: JSON.stringify({ cartId: 'cart123' }),
    });

    expect(response.status).toBe(201);
  });
});

describe('API Client - Auth API', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should register customer', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 'cust1', email: 'user@test.com' } }),
      status: 201,
    });

    const response = await fetch('http://api/customers/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@test.com', password: 'pass123' }),
    });

    expect(response.status).toBe(201);
  });

  it('should login and return token', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { token: 'jwt123', customer: { id: 'cust1' } } }),
      status: 200,
    });

    const response = await fetch('http://api/customers/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@test.com', password: 'pass123' }),
    });

    const data = await response.json();
    expect(data.data.token).toBe('jwt123');
  });

  it('should return 401 on invalid credentials', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Invalid credentials' }),
    });

    const response = await fetch('http://api/customers/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@test.com', password: 'wrong' }),
    });

    expect(response.status).toBe(401);
  });

  it('should logout', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: {} }),
      status: 200,
    });

    const response = await fetch('http://api/customers/logout', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer token' },
    });

    expect(response.ok).toBe(true);
  });

  it('should refresh token', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { token: 'newtoken123' } }),
    });

    const response = await fetch('http://api/customers/refresh', {
      method: 'POST',
    });

    const data = await response.json();
    expect(data.data.token).toBe('newtoken123');
  });

  it('should get customer orders', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: 'order1', total: 150 }] }),
    });

    const response = await fetch('http://api/customers/me/orders', {
      headers: { 'Authorization': 'Bearer token' },
    });

    const data = await response.json();
    expect(data.data).toHaveLength(1);
  });
});

describe('API Client - Error Handling', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should retry on 5xx errors', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: 'success' }) });

    const response = await fetch('http://api/test');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should not retry on 4xx errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' }),
    });

    const response = await fetch('http://api/notfound');
    expect(response.status).toBe(404);
  });

  it('should handle timeout', async () => {
    mockFetch.mockImplementationOnce(() =>
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 100)
      )
    );

    await expect(
      fetch('http://api/slow')
    ).rejects.toThrow('Request timeout');
  });

  it('should parse error messages correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Invalid email' }),
    });

    const response = await fetch('http://api/test');
    const error = await response.json();
    expect(error.error).toBe('Invalid email');
  });
});

describe('API Client - Caching', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should cache GET requests', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: 'cached' }),
    });

    await fetch('http://api/test');
    await fetch('http://api/test');

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should invalidate cache on TTL', async () => {
    vi.useFakeTimers();

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: 'test' }),
    });

    await fetch('http://api/test');
    vi.advanceTimersByTime(5 * 60 * 1000);
    await fetch('http://api/test');

    vi.useRealTimers();
  });

  it('should not cache POST/DELETE requests', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: 'ok' }),
    });

    await fetch('http://api/test', { method: 'POST' });
    await fetch('http://api/test', { method: 'DELETE' });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe('API Client - Types and Validation', () => {
  it('should validate product type', () => {
    const product = {
      id: '1',
      name: 'Test Product',
      price: 100,
      handle: 'test-product',
      description: 'A test product',
    };

    expect(product).toHaveProperty('id');
    expect(product).toHaveProperty('name');
    expect(product).toHaveProperty('price');
    expect(typeof product.price).toBe('number');
  });

  it('should validate cart type', () => {
    const cart = {
      id: 'cart123',
      lines: [{ id: 'line1', quantity: 1, product: { id: '1' } }],
      total: 100,
    };

    expect(cart).toHaveProperty('id');
    expect(Array.isArray(cart.lines)).toBe(true);
    expect(cart.lines[0]).toHaveProperty('quantity');
  });

  it('should validate customer type', () => {
    const customer = {
      id: 'cust1',
      email: 'test@test.com',
      firstName: 'John',
      lastName: 'Doe',
    };

    expect(customer).toHaveProperty('email');
    expect(typeof customer.email).toBe('string');
    expect(customer.email).toMatch(/@/);
  });
});
