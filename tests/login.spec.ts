import { test, expect, Page } from '@playwright/test';

// --- Base Page Object ---
abstract class BasePage {
    protected readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    /**
     * Navigates to a specified URL.
     * @param url The URL to navigate to.
     */
    async goto(url: string): Promise<void> {
        await this.page.goto(url);
    }

    /**
     * Takes a screenshot and saves it to the test-results directory.
     * @param name The name of the screenshot file (e.g., 'login-page').
     */
    async takeScreenshot(name: string): Promise<void> {
        await this.page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: true });
    }
}

// --- Page Object: LoginPage ---
class LoginPage extends BasePage {
    private readonly usernameField = this.page.getByLabel('Username');
    private readonly passwordField = this.page.getByLabel('Password');
    private readonly loginButton = this.page.getByRole('button', { name: 'Login' });

    constructor(page: Page) {
        super(page);
    }

    /**
     * Navigates to the login page.
     */
    async gotoLoginPage(): Promise<void> {
        await super.goto('https://practice.expandtesting.com/secure');
    }

    /**
     * Enters username into the username field.
     * @param username The username to enter.
     */
    async enterUsername(username: string): Promise<void> {
        await this.usernameField.fill(username);
    }

    /**
     * Enters password into the password field.
     * @param password The password to enter.
     */
    async enterPassword(password: string): Promise<void> {
        await this.passwordField.fill(password);
    }

    /**
     * Clicks the login button.
     */
    async clickLoginButton(): Promise<void> {
        await this.loginButton.click();
    }

    /**
     * Performs a full login operation.
     * @param username The username to use for login.
     * @param password The password to use for login.
     */
    async login(username: string, password_ : string): Promise<void> {
        await this.enterUsername(username);
        await this.enterPassword(password_);
        await this.clickLoginButton();
    }
}

// --- Page Object: SecureAreaPage ---
class SecureAreaPage extends BasePage {
    private readonly successMessage = this.page.locator('#flash.success');

    constructor(page: Page) {
        super(page);
    }

    /**
     * Verifies that the secure area success message is visible and contains expected text.
     */
    async verifyLoginSuccessMessage(): Promise<void> {
        await expect(this.successMessage).toBeVisible();
        await expect(this.successMessage).toContainText('You logged into a secure area!');
    }

    /**
     * Retrieves the current URL.
     * @returns The current URL as a string.
     */
    async getCurrentUrl(): Promise<string> {
        return this.page.url();
    }
}

// --- Custom Fixtures for Page Objects ---
type MyFixtures = {
    loginPage: LoginPage;
    secureAreaPage: SecureAreaPage;
};

const testWithPages = test.extend<MyFixtures>({
    loginPage: async ({ page }, use) => {
        await use(new LoginPage(page));
    },
    secureAreaPage: async ({ page }, use) => {
        await use(new SecureAreaPage(page));
    },
});

// --- Data-Driven Test Cases ---
const loginCredentials = [
    {
        id: 'TC001',
        username: 'practice',
        password: 'SuperSecretPassword!',
        expectedUrl: 'https://practice.expandtesting.com/secure',
        description: 'Verify user can login with valid credentials and URL is secure',
    },
    // Add more login test cases here if needed
];

// --- Test Suite for Login Functionality ---
testWithPages.describe('Login Functionality', () => {

    // Ensure we start at the login page for each test in this suite
    testWithPages.beforeEach(async ({ loginPage }) => {
        await loginPage.gotoLoginPage();
    });

    // Test case TC001
    testWithPages.each(loginCredentials)('$description - $id', async ({ page, loginPage, secureAreaPage }, { username, password, expectedUrl, id }) => {
        test.info().annotations.push({ type: 'Test Case ID', description: id });

        await test.step('1. Navigate to the login page', async () => {
            // Already handled in beforeEach, but good to explicitly state it in the step.
            // A screenshot here could be useful if the beforeEach sometimes fails visually.
            await expect(page).toHaveURL('https://practice.expandtesting.com/secure');
            await loginPage.takeScreenshot(`TC${id}-login-page-before-login`);
        });

        await test.step(`2. Enter '${username}' into the 'Username' field.`, async () => {
            await loginPage.enterUsername(username);
        });

        await test.step(`3. Enter 'SuperSecretPassword!' into the 'Password' field.`, async () => {
            await loginPage.enterPassword(password);
        });

        await test.step(`4. Click the 'Login' button.`, async () => {
            await loginPage.clickLoginButton();
        });

        await test.step('5. Verify login success and current URL', async () => {
            await secureAreaPage.verifyLoginSuccessMessage();
            await expect(page).toHaveURL(expectedUrl);
            await secureAreaPage.takeScreenshot(`TC${id}-secure-area-after-login`);
        });

        test.info().attachments.push({
            name: `Test Report for ${id}`,
            contentType: 'text/plain',
            body: `Test Case ${id} executed successfully. User logged in to ${await secureAreaPage.getCurrentUrl()}.`
        });
    });

    // Example of a negative test (not part of TC001 but demonstrates structure)
    // testWithPages('should show error with invalid credentials', async ({ loginPage, page }) => {
    //     await loginPage.login('invalid', 'password');
    //     const errorMessage = page.locator('.flash.error');
    //     await expect(errorMessage).toBeVisible();
    //     await expect(errorMessage).toContainText('Your username is invalid!');
    // });
});