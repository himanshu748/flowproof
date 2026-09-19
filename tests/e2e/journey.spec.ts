import { test, expect } from "@playwright/test";
test("sample evidence journey, receipt, keyboard and mobile layout", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore a sample investigation" })
    .click();
  await page
    .getByRole("button", { name: /OVERNIGHT OBSERVATION Hostel A/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Confirm the cleaning schedule" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Record context", exact: true })
    .click();
  await page.getByLabel("Cleaning / scheduled use").selectOption("present");
  await page
    .getByRole("button", { name: "Save context & update check" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Record a naturally quiet observation" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "01 Reveal a quiet observation" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Request a maintenance inspection" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "02 Reveal a reported repair" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Collect follow-up evidence" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "03 Reveal follow-up readings" })
    .click();
  await expect(page.getByText("1.70", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "output/playwright/comparison-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Review the observed change" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "output/playwright/comparison-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Create receipt" }).click();
  await expect(
    page.getByRole("heading", { name: "A record you can inspect." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Download JSON" })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download HTML" }).click();
  expect((await download).suggestedFilename()).toMatch(/flowproof.*html/);
  await page.getByRole("button", { name: "About", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
test("missing follow-up stays inconclusive; separate session stays unchanged", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore a sample investigation" })
    .click();
  await page.getByRole("button", { name: /REPAIR FOLLOW-UP Annex B/ }).click();
  await expect(
    page.getByRole("heading", { name: "Not enough evidence" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Complete the missing reading" }),
  ).toBeVisible();
  await page.screenshot({
    path: "output/playwright/missing-evidence.png",
    fullPage: true,
  });
  const other = await browser.newContext();
  const p = await other.newPage();
  await p.goto("/");
  await expect(
    p.getByRole("button", { name: "Explore a sample investigation" }),
  ).toBeVisible();
  await other.close();
});
