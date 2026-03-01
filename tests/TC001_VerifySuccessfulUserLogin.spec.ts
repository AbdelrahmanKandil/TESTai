import { test as baseTest, expect, Page, Locator } from '@playwright/test';

/**
 * BasePage Class
 * Provides common functionalities and properties for all page objects.
 * All page objects should extend this class to inherit shared behaviors.
 */
class BasePage {
    constructor(protected page: Page) {} // 'protected' allows derived classes to access 'page'

    /**
     * Navigates the browser to the specified URL.
     * @param url The URL to navigate to.
     */
    async navigateTo(url: string): Promise<void> {
        await this.page.goto(url);
    }

    // Common methods like `waitForLoadState`, `takeScreenshot`, etc., could be added here.
}

/**
 * LoginPage Class
 * Represents the login page and encapsulates its locators and actions.
 */
class LoginPage extends BasePage {
    private readonly usernameInput: Locator;
    private readonly passwordInput: Locator;
    private readonly loginButton: Locator;

    constructor(page: Page) {
        super(page);
        this.usernameInput = page.getByLabel('Username');
        this.passwordInput = page.getByLabel('Password');
        this.loginButton = page.getByRole('button', { name: 'Login' });
    }

    /**
     * Navigates to the login page.
     */
    async navigate(): Promise<void> {
        await this.navigateTo('https://practice.expandtesting.com/login');
    }

    /**
     * Performs a login operation with the given credentials.
     * @param username The username to enter.
     * @param password The password to enter.
     */
    async login(username: string, password: string): Promise<void> {
        await this.usernameInput.fill(username);
        await this.passwordInput.fill(password);
        await this.loginButton.click();
    }
}

/**
 * SecureAreaPage Class
 * Represents the secure area or dashboard page after a successful login.
 * Encapsulates locators and actions specific to this page.
 */
class SecureAreaPage extends BasePage {
    readonly successMessage: Locator;
    readonly logoutButton: Locator; // Useful for asserting page is a secure area

    constructor(page: Page) {
        super(page);
        this.successMessage = page.locator('#flash'); // Assuming the success message has id 'flash'
        this.logoutButton = page.getByRole('link', { name: 'Logout' });
    }

    /**
     * Retrieves the text content of the success message displayed on the page.
     * @returns A promise that resolves to the success message string, or null if not found.
     */
    async getSuccessMessage(): Promise<string | null> {
        // Wait for the message to be visible before attempting to get its text
        await this.successMessage.waitFor({ state: 'visible' });
        return (await this.successMessage.textContent())?.trim() || null;
    }
}

/**
 * Custom Playwright test fixture for initializing page objects.
 * This allows page objects to be injected directly into test functions,
 * ensuring proper setup and type safety.
 */
type MyFixtures = {
    loginPage: LoginPage;
    secureAreaPage: SecureAreaPage;
};

const test = baseTest.extend<MyFixtures>({
    loginPage: async ({ page }, use) => {
        await use(new LoginPage(page));
    },
    secureAreaPage: async ({ page }, use) => {
        await use(new SecureAreaPage(page));
    },
});

/**
 * Test Suite: Login Functionality
 * Contains test cases related to user login.
 */
test.describe('Login Functionality', () => {

    /**
     * Test Case: TC001 - Verify successful user login with valid credentials
     * This test navigates to the login page, enters valid credentials,
     * and asserts that the user is successfully logged in and redirected
     * to the secure area with a correct success message.
     */
    test('TC001: Verify successful user login with valid credentials', async ({ loginPage, secureAreaPage, page }) => {

        // Step 1: Navigate to the login page
        await test.step('Navigate to the login page', async () => {
            await loginPage.navigate();
            // Assert that we are on the correct login page
            await expect(page).toHaveURL('https://practice.expandtesting.com/login');
            await expect(page.getByRole('heading', { name: 'Login Page' })).toBeVisible();
        });

        // Step 2 & 3: Enter credentials and click Login button
        await test.step('Enter valid credentials and click Login', async () => {
            const username = 'practice';
            const password = 'SuperSecretPassword!';
            await loginPage.login(username, password);
        });

        // Step 4: Verify successful login and redirect to secure area
        await test.step('Verify successful login and redirect to secure area', async () => {
            // Assert that the URL has changed to the secure area
            await expect(page).toHaveURL('https://practice.expandtesting.com/secure');
            // Assert that the "Secure Area" heading is visible
            await expect(page.getByRole('heading', { name: 'Secure Area' })).toBeVisible();

            // Assert that the success message is displayed and contains the expected text
            const actualSuccessMessage = await secureAreaPage.getSuccessMessage();
            expect(actualSuccessMessage).toContain('You logged into a secure area!');

            // Assert that the Logout button is visible, confirming the logged-in state
            await expect(secureAreaPage.logoutButton).toBeVisible();
        });

        // Optional: Take a screenshot upon successful completion for documentation
        await page.screenshot({ path: `test-results/${test.info().title.replace(/[^a-z0-9]/gi, '_')}_success.png` });
    });
});