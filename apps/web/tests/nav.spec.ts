import { test, expect } from "@playwright/test";

test("has exactly one navbar", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.locator('[data-testid="top-nav"]')).toHaveCount(1);
});

test("navbar links work without 404", async ({ page }) => {
  await page.goto("/dashboard");
  
  // Test each main navigation link
  const navLinks = [
    { text: "Dashboard", path: "/dashboard" },
    { text: "JobBot", path: "/jobbot" },
    { text: "Library", path: "/library" },
    { text: "Applications", path: "/applications" }
  ];

  for (const link of navLinks) {
    await page.click(`text=${link.text}`);
    await expect(page).toHaveURL(new RegExp(link.path));
    await expect(page.locator('text="404"')).toHaveCount(0);
  }
});
