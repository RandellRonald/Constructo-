import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';

// Helper to locate python executable from local venv or system
const getPythonCmd = () => {
  const venvPath = path.resolve(process.cwd(), '../backend/venv/Scripts/python.exe');
  if (fs.existsSync(venvPath)) {
    return `"${venvPath}"`;
  }
  return 'python';
};

test.describe('Constructo E2E Production Booking Flow', () => {
  // Pre-test DB Clean up to ensure a clean slate and database consistency
  test.beforeAll(() => {
    console.log('Cleaning up SQLite database records for deterministic test run...');
    const pythonCmd = getPythonCmd();
    const cleanScriptPath = 'C:\\\\Users\\\\hp\\\\.gemini\\\\antigravity-ide\\\\brain\\\\0a87bb71-794f-4609-a28a-74876871cad9\\\\scratch\\\\db_clean.py';
    try {
      const output = execSync(`${pythonCmd} "${cleanScriptPath}"`);
      console.log(output.toString().trim());
    } catch (error: any) {
      console.error('Failed to clean database:', error.message);
    }
  });

  test('Complete Customer-Provider Booking Life Cycle', async ({ browser }) => {
    // 1. Setup isolated browser contexts with Geolocation granted
    const customerContext = await browser.newContext({
      viewport: { width: 400, height: 800 }, // Simulate mobile layout
      geolocation: { latitude: 9.9816, longitude: 76.2999 },
      permissions: ['geolocation'],
    });
    
    const providerContext = await browser.newContext({
      viewport: { width: 400, height: 800 }, // Simulate mobile layout
      geolocation: { latitude: 10.0116, longitude: 76.3299 },
      permissions: ['geolocation'],
    });

    const customerPage = await customerContext.newPage();
    const providerPage = await providerContext.newPage();

    // 2. Setup network interception for Razorpay Payment signature verification on Customer Page
    await customerPage.route('**/api/v1/payments/verify', async (route) => {
      const request = route.request();
      const postData = JSON.parse(request.postData() || '{}');
      
      // Secret must match the Razorpay secret in settings
      const secret = "Y6GEIEEAgY0bPx2JG9enHKS1";
      const msg = `${postData.razorpay_order_id}|${postData.razorpay_payment_id}`;
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(msg);
      const signature = hmac.digest('hex');
      
      // Update signature in the payload
      postData.razorpay_signature = signature;
      console.log(`[E2E Payment Intercept] Order ID: ${postData.razorpay_order_id}, Verified signature: ${signature}`);
      
      await route.continue({
        postData: JSON.stringify(postData)
      });
    });

    // Intercept checkout.js to prevent it overwriting the mock Razorpay constructor
    await customerPage.route('https://checkout.razorpay.com/v1/checkout.js', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: 'console.log("Mocked Razorpay checkout.js load");'
      });
    });

    // Inject mock window.Razorpay script in customer page
    await customerPage.addInitScript(() => {
      (window as any).Razorpay = function(options: any) {
        this.open = function() {
          console.log('[E2E Mock Razorpay] Open called with order_id:', options.order_id);
          setTimeout(() => {
            // Trigger success callback
            options.handler({
              razorpay_order_id: options.order_id,
              razorpay_payment_id: 'pay_mock_' + Math.random().toString(36).substring(7),
              razorpay_signature: 'temporary_signature_will_be_signed_in_route_interceptor'
            });
          }, 500);
        };
        this.on = function(event: string, callback: any) {
          console.log(`[E2E Mock Razorpay] Listening for event: ${event}`);
        };
      };
    });

    // --- STEP 1: Customer Login ---
    console.log('Navigating Customer to Login Page...');
    const startTime = Date.now();
    await customerPage.goto('/customer/login');
    await customerPage.fill('input[placeholder*="email or phone"]', 'customer@test.com');
    await customerPage.fill('input[placeholder*="password"]', 'Password@123');
    await customerPage.click('button[type="submit"]:has-text("Sign In")');

    // Confirm navigation to Dashboard
    await expect(customerPage).toHaveURL(/\/customer\/dashboard/);
    console.log('Customer logged in successfully!');

    // --- STEP 2: Provider Login ---
    console.log('Navigating Provider to Login Page...');
    await providerPage.goto('/provider/login');
    await providerPage.fill('input[placeholder*="email or phone"]', 'provider@test.com');
    await providerPage.fill('input[placeholder*="password"]', 'Password@123');
    await providerPage.click('button[type="submit"]:has-text("Sign In")');

    // Confirm navigation to Provider Dashboard
    await expect(providerPage).toHaveURL(/\/provider\/dashboard/);
    console.log('Provider logged in successfully!');

    // --- STEP 3: Customer Pickup Pin Selection & Booking Creation ---
    console.log('Customer initiating booking...');
    await customerPage.click('button:has-text("Book a Service")');
    await customerPage.waitForURL(/\/customer\/book/);

    // Select category: Crane Services
    await customerPage.click('button:has-text("Crane Services")');

    // Site Location confirmation via Simulated location picker
    await customerPage.click('input[placeholder*="select location"]');
    await customerPage.waitForTimeout(1000); // Wait for modal transition and geocoding to stabilize
    await customerPage.click('button:has-text("Confirm Pickup Location")');

    // Toggle Emergency Service for immediate concurrent matching
    await customerPage.click('text=Emergency Service');

    // Proceed to Step 3 (Description)
    await customerPage.click('button:has-text("Continue")');
    
    // Add description
    await customerPage.fill('textarea[placeholder*="Describe your site"]', 'E2E simulated heavy girder lifting operation.');
    
    // Click Review Booking (Proceed to Step 4)
    await customerPage.click('button:has-text("Review Booking")');

    // Click Proceed to Payment
    await customerPage.click('button:has-text("Proceed to Payment")');
    await customerPage.waitForURL(/\/customer\/payment/);
    console.log('Booking created successfully, customer on Payment page.');

    // --- STEP 4: Customer Payments ---
    const totalAmountText = await customerPage.locator('button:has-text("Pay")').innerText();
    console.log(`Payment button text detected: ${totalAmountText}`);
    
    // Trigger simulated Razorpay gateway capture
    await customerPage.click('button:has-text("Pay")');
    
    // Wait for the success screen
    await customerPage.waitForSelector('text=Payment Successful!');
    console.log('Payment successful! Booking activated.');

    // Track booking
    await customerPage.click('button:has-text("Track Booking")');
    await customerPage.waitForURL(/\/customer\/tracking/);
    const trackingUrl = customerPage.url();
    const bookingIdMatch = trackingUrl.match(/\/customer\/tracking\/(\d+)/);
    const bookingId = bookingIdMatch ? bookingIdMatch[1] : '';
    expect(bookingId).not.toBe('');
    console.log(`Customer tracking booking ID: ${bookingId}`);

    // --- STEP 5: Provider Receives Dispatch Offer WS Popup ---
    console.log('Waiting for Provider to receive WebSocket offer popup...');
    const offerModal = providerPage.locator('h3:has-text("Crane Service")');
    await expect(offerModal).toBeVisible({ timeout: 15000 });
    console.log('Provider offer popup visible!');
    await providerPage.waitForTimeout(1000); // Wait for offer modal pop animation to stabilize

    // --- STEP 6: Slide to Accept (Framer Motion drag) ---
    console.log('Simulating Slide to Accept drag gesture...');
    const sliderHandle = providerPage.locator('div.cursor-grab');
    const dragBox = await sliderHandle.boundingBox();
    if (!dragBox) throw new Error('Slider handle bounding box not found');

    await sliderHandle.hover();
    await providerPage.mouse.down();
    // Drag the handle 300px to the right to trigger acceptance
    await providerPage.mouse.move(dragBox.x + 300, dragBox.y + dragBox.height / 2, { steps: 10 });
    await providerPage.mouse.up();

    // Verify active job card is visible on provider dashboard
    const activeJobTitle = providerPage.locator('h3:has-text("Active Job")');
    await expect(activeJobTitle).toBeVisible();
    console.log('Job accepted by Provider!');

    // Click Start Navigation
    await providerPage.click('button:has-text("Start Navigation")');
    await providerPage.waitForURL(new RegExp(`/provider/job/${bookingId}`));

    // --- STEP 7: Real-Time Chat Simulation ---
    console.log('Testing WebSocket Chat communication...');
    // Customer clicks Chat In-App
    await customerPage.click('button:has-text("Chat In-App")');
    const chatInputCustomer = customerPage.locator('input[placeholder*="Type your message"]');
    await chatInputCustomer.fill('E2E client: Crane ready for lift?');
    await customerPage.click('button:has(svg.lucide-send)');

    // Provider opens Chat Interface
    await providerPage.click('button:has(svg.lucide-message-circle)');
    const chatInputProvider = providerPage.locator('input[placeholder*="Type your message"]');
    
    // Verify customer's message is displayed on provider's side
    await expect(providerPage.locator('text=E2E client: Crane ready for lift?')).toBeVisible();
    
    // Provider sends reply
    await chatInputProvider.fill('E2E operator: Copy that. Navigating in.');
    await providerPage.click('button:has(svg.lucide-send)');

    // Verify reply visible on customer's side
    await expect(customerPage.locator('text=E2E operator: Copy that. Navigating in.')).toBeVisible();

    // Close chat interfaces
    await customerPage.click('button:has(svg.lucide-x)');
    await providerPage.click('button:has(svg.lucide-x)');
    console.log('Chat communication verified successfully!');

    // --- STEP 8: Provider Transit & Arrival ---
    console.log('Transitioning Provider Status: assigned -> en_route...');
    await providerPage.click('button:has-text("Start Transit")');
    await expect(providerPage.locator('text=Provider En Route')).toBeVisible();

    console.log('Transitioning Provider Status: en_route -> arrived...');
    await providerPage.click('button:has-text("I have arrived")');
    await expect(providerPage.locator('text=Verify Booking PIN')).toBeVisible();

    // --- STEP 9: Customer Verification Code Exchange ---
    console.log('Retrieving secure verification code from Customer Page...');
    // Locate the 6-digit verification code text
    const secureCodeLocator = customerPage.locator('p.tracking-\\[0\\.25em\\]');
    await expect(secureCodeLocator).toBeVisible();
    const secureCode = await secureCodeLocator.innerText();
    const pin = secureCode.trim();
    console.log(`Retrieved Secure Code: ${pin}`);
    expect(pin.length).toBe(6);

    // Enter verification PIN into Provider Page
    await providerPage.fill('input[placeholder*="Enter 6-digit PIN"]', pin);
    await providerPage.click('button:has-text("Verify & Start Work")');

    // Confirm job is in progress
    await expect(providerPage.locator('text=Job In Progress')).toBeVisible();
    console.log('Booking verification code matches, job active!');

    // --- STEP 10: Provider Job Completion ---
    console.log('Completing work operation...');
    await providerPage.click('button:has-text("End Job & Complete")');
    await providerPage.waitForURL(new RegExp(`/provider/job/${bookingId}/complete`));

    await providerPage.fill('input[type="number"]', '3'); // Log 3 hours worked
    await providerPage.fill('textarea[placeholder*="notes"]', 'Simulated lift job completed successfully.');
    await providerPage.click('button:has-text("Submit & Generate Invoice")');

    // Redirected back to Provider Dashboard
    await providerPage.waitForURL(/\/provider\/dashboard/);
    console.log('Work completion submitted by Provider!');

    // --- STEP 11: Customer Invoice & Review ---
    console.log('Customer confirming invoice & posting review...');
    await customerPage.goto(`/customer/completion/${bookingId}`);
    
    // Click Confirm & Generate Invoice
    await customerPage.click('button:has-text("Confirm & Generate Invoice")');
    await customerPage.waitForURL(new RegExp(`/customer/invoice/${bookingId}`));

    // Click Rate Provider
    await customerPage.click('button:has-text("Rate Provider")');
    await customerPage.waitForURL(new RegExp(`/customer/review/${bookingId}`));

    // Select overall rating (5 stars)
    // Click the 5th star button in overall section
    const stars = customerPage.locator('.flex.justify-center.gap-2.mt-4 button');
    await stars.nth(4).click(); // Click overall 5-star

    // Toggle recommendation
    await customerPage.click('button:has-text("Yes")');

    // Fill review text
    await customerPage.fill('textarea[placeholder*="received"]', 'Superb job by the operator, highly efficient lifting girder.');
    await customerPage.click('button:has-text("Submit Review")');

    // Verify Success Screen
    await expect(customerPage.locator('text=Thank You!')).toBeVisible();
    await customerPage.click('button:has-text("Back to Dashboard")');
    await customerPage.waitForURL(/\/customer\/dashboard/);
    
    const duration = Date.now() - startTime;
    console.log(`E2E User simulation flow completely successful in ${duration}ms!`);
  });

  test('Admin Dashboard View Security Check', async ({ browser }) => {
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();

    // Verify redirect security
    console.log('Verifying Admin dashboard security access rules...');
    await adminPage.goto('/admin/dashboard');
    // Unauthenticated access should redirect back to home page
    await expect(adminPage).toHaveURL('/');

    // Sign in as admin
    await adminPage.goto('/admin/login');
    await adminPage.fill('input[placeholder*="admin@constructo.in"]', 'admin@test.com');
    await adminPage.fill('input[placeholder*="••••••••"]', 'Password@123');
    await adminPage.click('button[type="submit"]:has-text("Sign In to Panel")');

    // Confirm navigation to Admin Dashboard
    await adminPage.waitForURL(/\/admin\/dashboard/);
    console.log('Admin dashboard successfully loaded and authenticated.');
    
    // Confirm dashboard items are visible
    await expect(adminPage.locator('text=Overview')).toBeVisible();
  });
});
