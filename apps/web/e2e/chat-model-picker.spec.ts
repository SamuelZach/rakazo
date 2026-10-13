import { expect, test } from "@playwright/test";
import { captureScreenshot, completeOnboarding, rpc, signup } from "./helpers";

test("change a bot's model directly in chat and retain it after reload", async ({
  page,
}, testInfo) => {
  await signup(page, `chat-model-${Date.now()}@rakazo.test`, "password12", "Chat Models");
  await completeOnboarding(page);
  const picker = page.locator("main").getByRole("combobox", { name: "Model", exact: true });
  await expect(picker).toBeEnabled();
  const options = await picker
    .locator("option")
    .evaluateAll((rows) =>
      rows.map((row) => ({ value: (row as HTMLOptionElement).value, label: row.textContent })),
    );
  const selected = options.find((option) => option.value);
  expect(selected).toBeTruthy();
  await picker.selectOption(selected!.value);
  await expect(picker).toBeEnabled();
  await expect(picker).toHaveValue(selected!.value);
  const [provider, modelId] = selected!.value.split("::");
  const botId = new URL(page.url()).pathname.split("/").at(-1);
  const bots = await rpc<
    Array<{ id: string; modelProvider: string | null; modelId: string | null }>
  >(page, "bots/list", {});
  expect(bots.find((bot) => bot.id === botId)).toMatchObject({ modelProvider: provider, modelId });
  await captureScreenshot(page, testInfo, "chat-model-picker");
  await page.reload();
  await expect(picker).toHaveValue(selected!.value);
  await picker.selectOption("");
  await expect(picker).toBeEnabled();
  await expect(picker).toHaveValue("");
});
