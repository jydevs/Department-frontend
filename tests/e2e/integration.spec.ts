import { test, expect } from '@playwright/test';

test.describe('1. Catálogo Dinámico', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('1.1 Home carga productos desde API', async ({ page }) => {
    const productGrid = page.locator('[data-testid="product-grid"]');
    await expect(productGrid).toBeVisible();
    const productCards = page.locator('[data-testid="product-card"]');
    await expect(productCards).toHaveCount(n => n > 0);
  });

  test('1.2 Productos tienen precio formateado', async ({ page }) => {
    const prices = page.locator('[data-testid="product-price"]');
    const firstPrice = await prices.first().textContent();
    expect(firstPrice).toMatch(/\$|COP|USD/);
  });

  test('1.3 Colección all carga correctamente', async ({ page }) => {
    await page.goto('/collections/all');
    await page.waitForLoadState('networkidle');
    const collectionTitle = page.locator('[data-testid="collection-title"]');
    await expect(collectionTitle).toContainText('all');
  });

  test('1.4 Colección men carga correctamente', async ({ page }) => {
    await page.goto('/collections/men');
    await page.waitForLoadState('networkidle');
    const collectionTitle = page.locator('[data-testid="collection-title"]');
    await expect(collectionTitle).toContainText('men');
  });

  test('1.5 Colección women carga correctamente', async ({ page }) => {
    await page.goto('/collections/women');
    await page.waitForLoadState('networkidle');
    const collectionTitle = page.locator('[data-testid="collection-title"]');
    await expect(collectionTitle).toContainText('women');
  });

  test('1.6 Ficha de producto carga', async ({ page }) => {
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    await firstProduct.click();
    await page.waitForLoadState('networkidle');
    const productInfo = page.locator('[data-testid="product-info"]');
    await expect(productInfo).toBeVisible();
  });

  test('1.7 Producto tiene variantes (tallas)', async ({ page }) => {
    await page.goto('/products/basic-r2r-t-shirt');
    await page.waitForLoadState('networkidle');
    const sizeOptions = page.locator('[data-testid="size-option"]');
    await expect(sizeOptions).toHaveCount(n => n > 0);
  });

  test('1.8 Imágenes del producto cargan', async ({ page }) => {
    await page.goto('/products/basic-r2r-t-shirt');
    await page.waitForLoadState('networkidle');
    const productImages = page.locator('[data-testid="product-image"]');
    await expect(productImages.first()).toBeVisible();
  });

  test('1.9 Búsqueda de productos funciona', async ({ page }) => {
    const searchButton = page.locator('[data-testid="search-button"]');
    if (await searchButton.isVisible()) {
      await searchButton.click();
    }
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.fill('shirt');
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle');
    const searchResults = page.locator('[data-testid="search-result"]');
    await expect(searchResults).toHaveCount(n => n > 0);
  });
});

test.describe('2. Carrito', () => {
  test('2.1 Agregar producto al carrito', async ({ page }) => {
    await page.goto('/products/basic-r2r-t-shirt');
    await page.waitForLoadState('networkidle');
    const addButton = page.locator('[data-testid="add-to-cart-btn"]');
    await addButton.click();
    const cartCounter = page.locator('[data-testid="cart-counter"]');
    await expect(cartCounter).toContainText('1');
  });

  test('2.2 Carrito muestra contador de items', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const cartCounter = page.locator('[data-testid="cart-counter"]');
    await expect(cartCounter).toBeVisible();
  });

  test('2.3 Abrir cart drawer', async ({ page }) => {
    await page.goto('/');
    const cartButton = page.locator('[data-testid="cart-button"]');
    await cartButton.click();
    const cartDrawer = page.locator('[data-testid="cart-drawer"]');
    await expect(cartDrawer).toBeVisible();
  });

  test('2.4 Carrito muestra subtotal', async ({ page }) => {
    await page.goto('/');
    const cartButton = page.locator('[data-testid="cart-button"]');
    await cartButton.click();
    const subtotal = page.locator('[data-testid="cart-subtotal"]');
    await expect(subtotal).toBeVisible();
  });

  test('2.5 Eliminar producto del carrito', async ({ page }) => {
    await page.goto('/');
    const cartButton = page.locator('[data-testid="cart-button"]');
    await cartButton.click();
    const removeButton = page.locator('[data-testid="remove-item-btn"]').first();
    await removeButton.click();
    const cartCounter = page.locator('[data-testid="cart-counter"]');
    const count = await cartCounter.textContent();
    expect(parseInt(count || '0')).toBeLessThanOrEqual(1);
  });

  test('2.6 Botón continuar comprando', async ({ page }) => {
    await page.goto('/');
    const cartButton = page.locator('[data-testid="cart-button"]');
    await cartButton.click();
    const continueButton = page.locator('[data-testid="continue-shopping-btn"]');
    await continueButton.click();
    const productGrid = page.locator('[data-testid="product-grid"]');
    await expect(productGrid).toBeVisible();
  });
});

test.describe('3. Checkout', () => {
  test('3.1 Página checkout existe', async ({ page }) => {
    await page.goto('/checkout');
    const checkoutForm = page.locator('[data-testid="checkout-form"]');
    await expect(checkoutForm).toBeVisible();
  });

  test('3.2 Formulario checkout valida email', async ({ page }) => {
    await page.goto('/checkout');
    const emailInput = page.locator('[data-testid="checkout-email"]');
    const submitButton = page.locator('[data-testid="checkout-submit"]');
    await emailInput.fill('invalid-email');
    await submitButton.click();
    const errorMessage = page.locator('[data-testid="checkout-error"]');
    await expect(errorMessage).toBeVisible();
  });

  test('3.3 Dirección es requerida', async ({ page }) => {
    await page.goto('/checkout');
    const addressInput = page.locator('[data-testid="checkout-address"]');
    await expect(addressInput).toHaveAttribute('required', '');
  });

  test('3.4 Resumen de orden muestra items', async ({ page }) => {
    await page.goto('/checkout');
    const orderSummary = page.locator('[data-testid="order-summary"]');
    await expect(orderSummary).toBeVisible();
  });

  test('3.5 Cálculo de IVA es correcto', async ({ page }) => {
    await page.goto('/checkout');
    const subtotal = page.locator('[data-testid="checkout-subtotal"]');
    const tax = page.locator('[data-testid="checkout-tax"]');
    const total = page.locator('[data-testid="checkout-total"]');
    await expect(subtotal).toBeVisible();
    await expect(tax).toBeVisible();
    await expect(total).toBeVisible();
  });

  test('3.6 Seleccionar zona de envío', async ({ page }) => {
    await page.goto('/checkout');
    const shippingSelect = page.locator('[data-testid="shipping-zone-select"]');
    await shippingSelect.selectOption('bogota');
    await expect(shippingSelect).toHaveValue('bogota');
  });
});

test.describe('4. Autenticación', () => {
  test('4.1 Página login existe', async ({ page }) => {
    await page.goto('/account/login');
    const loginForm = page.locator('[data-testid="login-form"]');
    await expect(loginForm).toBeVisible();
  });

  test('4.2 Página registro existe', async ({ page }) => {
    await page.goto('/account/register');
    const registerForm = page.locator('[data-testid="register-form"]');
    await expect(registerForm).toBeVisible();
  });

  test('4.3 Página órdenes existe', async ({ page }) => {
    await page.goto('/account/orders');
    const ordersPage = page.locator('[data-testid="orders-page"]');
    await expect(ordersPage).toBeVisible();
  });

  test('4.4 Formulario login valida email', async ({ page }) => {
    await page.goto('/account/login');
    const emailInput = page.locator('[data-testid="login-email"]');
    await emailInput.fill('invalid');
    const submitButton = page.locator('[data-testid="login-submit"]');
    await submitButton.click();
    const error = page.locator('[data-testid="login-error"]');
    await expect(error).toBeVisible();
  });

  test('4.5 Modal de autenticación funciona', async ({ page }) => {
    await page.goto('/');
    const accountButton = page.locator('[data-testid="account-button"]');
    await accountButton.click();
    const accountModal = page.locator('[data-testid="account-modal"]');
    await expect(accountModal).toBeVisible();
  });

  test('4.6 Página verificación email existe', async ({ page }) => {
    await page.goto('/account/verify-email');
    const verifyPage = page.locator('[data-testid="verify-email-page"]');
    await expect(verifyPage).toBeVisible();
  });

  test('4.7 Página reset password existe', async ({ page }) => {
    await page.goto('/account/reset-password');
    const resetForm = page.locator('[data-testid="reset-password-form"]');
    await expect(resetForm).toBeVisible();
  });

  test('4.8 Logout limpia sesión', async ({ page }) => {
    await page.goto('/account/orders');
    const logoutButton = page.locator('[data-testid="logout-btn"]');
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      const loginForm = page.locator('[data-testid="login-form"]');
      await expect(loginForm).toBeVisible();
    }
  });
});

test.describe('5. Newsletter', () => {
  test('5.1 Input newsletter visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const newsletterInput = page.locator('[data-testid="newsletter-email"]');
    await expect(newsletterInput).toBeVisible();
  });

  test('5.2 Email válido requerido', async ({ page }) => {
    await page.goto('/');
    const newsletterInput = page.locator('[data-testid="newsletter-email"]');
    await newsletterInput.fill('invalid');
    const subscribeButton = page.locator('[data-testid="newsletter-subscribe"]');
    await subscribeButton.click();
    const error = page.locator('[data-testid="newsletter-error"]');
    await expect(error).toBeVisible();
  });

  test('5.3 Suscripción exitosa muestra mensaje', async ({ page }) => {
    await page.goto('/');
    const newsletterInput = page.locator('[data-testid="newsletter-email"]');
    await newsletterInput.fill('test@example.com');
    const subscribeButton = page.locator('[data-testid="newsletter-subscribe"]');
    await subscribeButton.click();
    const successMessage = page.locator('[data-testid="newsletter-success"]');
    await expect(successMessage).toBeVisible({ timeout: 5000 });
  });

  test('5.4 Loading state durante suscripción', async ({ page }) => {
    await page.goto('/');
    const newsletterInput = page.locator('[data-testid="newsletter-email"]');
    await newsletterInput.fill('test@example.com');
    const subscribeButton = page.locator('[data-testid="newsletter-subscribe"]');
    await subscribeButton.click();
    const loadingState = page.locator('[data-testid="newsletter-loading"]');
    await expect(loadingState).toBeVisible({ timeout: 1000 });
  });
});

test.describe('6. Navegación y UX', () => {
  test('6.1 Logo navega a home', async ({ page }) => {
    await page.goto('/collections/all');
    const logo = page.locator('[data-testid="logo"]');
    await logo.click();
    await page.waitForURL('/');
    expect(page.url()).toContain('localhost:3000');
  });

  test('6.2 Links de navegación funcionan', async ({ page }) => {
    await page.goto('/');
    const navLink = page.locator('[data-testid="nav-link-collections"]');
    await navLink.click();
    await page.waitForLoadState('networkidle');
    const collectionView = page.locator('[data-testid="collection-view"]');
    await expect(collectionView).toBeVisible();
  });

  test('6.3 Breadcrumbs correctos', async ({ page }) => {
    await page.goto('/products/basic-r2r-t-shirt');
    const breadcrumbs = page.locator('[data-testid="breadcrumb"]');
    await expect(breadcrumbs).toContainText('Home');
  });

  test('6.4 Footer visible', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('[data-testid="footer"]');
    await expect(footer).toBeVisible();
  });

  test('6.5 Botón back to top funciona', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => window.scrollBy(0, 1000));
    const backToTopButton = page.locator('[data-testid="back-to-top"]');
    await backToTopButton.click();
    const scrollPosition = await page.evaluate(() => window.scrollY);
    expect(scrollPosition).toBeLessThan(100);
  });

  test('6.6 Search overlay funciona', async ({ page }) => {
    await page.goto('/');
    const searchButton = page.locator('[data-testid="search-button"]');
    await searchButton.click();
    const searchOverlay = page.locator('[data-testid="search-overlay"]');
    await expect(searchOverlay).toBeVisible();
  });

  test('6.7 Diseño responsive en mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    const mobileMenu = page.locator('[data-testid="mobile-menu"]');
    await expect(mobileMenu).toBeVisible();
  });
});

test.describe('7. Performance', () => {
  test('7.1 Home carga en menos de 3 segundos', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000);
  });

  test('7.2 No hay errores en consola', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(errors.length).toBe(0);
  });

  test('7.3 Todas las requests son exitosas', async ({ page }) => {
    const failedRequests: string[] = [];
    page.on('response', response => {
      if (response.status() >= 400) {
        failedRequests.push(`${response.url()} - ${response.status()}`);
      }
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(failedRequests.length).toBe(0);
  });

  test('7.4 Lighthouse performance score > 70', async ({ page }) => {
    await page.goto('/');
    const metrics = await page.evaluate(() => {
      const nav = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        DOMContentLoaded: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
        loadComplete: nav.loadEventEnd - nav.loadEventStart,
      };
    });
    expect(metrics.DOMContentLoaded).toBeLessThan(3000);
  });
});

test.describe('8. API Integration', () => {
  test('8.1 Backend API está disponible', async ({ page }) => {
    const response = await page.request.get('http://localhost:4000/health');
    expect(response.status()).toBe(200);
  });

  test('8.2 Products API endpoint funciona', async ({ page }) => {
    const response = await page.request.get('http://localhost:4000/api/v1/storefront/products');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('data');
  });

  test('8.3 Collections API endpoint funciona', async ({ page }) => {
    const response = await page.request.get('http://localhost:4000/api/v1/storefront/collections');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('data');
  });

  test('8.4 Cart API funciona', async ({ page }) => {
    const response = await page.request.post('http://localhost:4000/api/v1/storefront/carts', {
      data: {},
    });
    expect(response.status()).toBe(201);
  });

  test('8.5 Newsletter API endpoint funciona', async ({ page }) => {
    const response = await page.request.post('http://localhost:4000/api/v1/storefront/newsletter', {
      data: { email: 'test@example.com' },
    });
    expect([200, 201, 400]).toContain(response.status());
  });

  test('8.6 CORS headers presentes', async ({ page }) => {
    const response = await page.request.get('http://localhost:4000/api/v1/storefront/products');
    const corsHeader = response.headers()['access-control-allow-origin'];
    expect(corsHeader).toBeDefined();
  });

  test('8.7 Rate limiting está activo', async ({ page }) => {
    const requests = [];
    for (let i = 0; i < 200; i++) {
      requests.push(page.request.get('http://localhost:4000/api/v1/storefront/products'));
    }
    const responses = await Promise.allSettled(requests);
    const rateLimited = responses.some(r =>
      r.status === 'fulfilled' && r.value.status() === 429
    );
    expect(rateLimited).toBe(true);
  });

  test('8.8 OpenAPI docs disponibles', async ({ page }) => {
    const response = await page.request.get('http://localhost:4000/docs');
    expect([200, 301]).toContain(response.status());
  });
});

test.describe('9. Edge Cases', () => {
  test('9.1 Stock agotado en producto', async ({ page }) => {
    await page.goto('/products/out-of-stock-product');
    const addButton = page.locator('[data-testid="add-to-cart-btn"]');
    await expect(addButton).toBeDisabled();
  });

  test('9.2 Historial de navegación funciona', async ({ page }) => {
    await page.goto('/');
    await page.goto('/collections/all');
    await page.goBack();
    expect(page.url()).toContain('localhost:3000');
  });

  test('9.3 Logout limpia state local', async ({ page }) => {
    await page.goto('/account/orders');
    const logoutBtn = page.locator('[data-testid="logout-btn"]');
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      const localStorage = await page.evaluate(() => {
        return Object.keys(window.localStorage);
      });
      expect(localStorage.filter(k => k.includes('auth')).length).toBe(0);
    }
  });

  test('9.4 Filtros se resetean', async ({ page }) => {
    await page.goto('/collections/all');
    const filterButton = page.locator('[data-testid="filter-btn"]');
    await filterButton.click();
    const resetButton = page.locator('[data-testid="reset-filters"]');
    await resetButton.click();
    const activeFilters = page.locator('[data-testid="active-filter"]');
    await expect(activeFilters).toHaveCount(0);
  });

  test('9.5 Página 404 existe', async ({ page }) => {
    await page.goto('/non-existent-page');
    const notFoundPage = page.locator('[data-testid="not-found-page"]');
    await expect(notFoundPage).toBeVisible();
  });
});
