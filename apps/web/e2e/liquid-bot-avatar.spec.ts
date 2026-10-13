import { expect, test } from "@playwright/test";
import { captureScreenshot, completeOnboarding, createNamedBot, rpc, signup } from "./helpers";

test("colored liquid bot avatars render in the sidebar and respect reduced motion", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await signup(page, `liquid-avatar-${Date.now()}@rakazo.test`, "password12", "Avatar QA");
  await completeOnboarding(page);
  await createNamedBot(page, "Liquid Sample");
  const avatars = page.locator("aside").first().locator(".rakazo-liquid-avatar");
  await expect(avatars.first()).toBeVisible();
  await expect.poll(() => avatars.count()).toBeGreaterThanOrEqual(2);
  const filters = await avatars
    .locator("filter")
    .evaluateAll((nodes) => nodes.map((node) => node.id));
  expect(new Set(filters).size).toBe(filters.length);
  await expect(avatars.first().locator("svg")).toHaveAttribute("viewBox", "150 150 700 700");
  await captureScreenshot(page, testInfo, "colored-liquid-bot-avatars");
});

test("each bot saves its own liquid shape and eyes", async ({ page }, testInfo) => {
  await signup(page, `liquid-custom-${Date.now()}@rakazo.test`, "password12", "Avatar QA");
  await completeOnboarding(page);
  const first = await createNamedBot(page, "First Sample");
  const second = await createNamedBot(page, "Second Sample");
  const original = await rpc<{ color: string }>(page, "bots/get", { botId: second });
  await page.goto(`/app/${first}`);
  await page.locator("main").getByRole("button", { name: "First Sample", exact: true }).click();
  await page.getByTestId("avatar-studio-trigger").click();
  const studio = page.getByTestId("avatar-studio");
  await studio.getByTestId("avatar-shape-heart").click();
  await studio.getByRole("combobox", { name: "Eyes" }).click();
  await page.getByRole("option", { name: "Ring", exact: true }).click();
  await expect
    .poll(async () => (await rpc<{ color: string }>(page, "bots/get", { botId: first })).color)
    .toContain("::liquid1_heart_ring_");
  await captureScreenshot(page, testInfo, "per-bot-liquid-avatar-editor");
  await page.reload();
  await page.locator("main").getByRole("button", { name: "First Sample", exact: true }).click();
  await page.getByTestId("avatar-studio-trigger").click();
  await expect(page.getByTestId("avatar-shape-heart")).toHaveAttribute("aria-pressed", "true");
  expect((await rpc<{ color: string }>(page, "bots/get", { botId: second })).color).toBe(
    original.color,
  );
});
