// @vitest-environment jsdom
import type { ComponentProps } from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { rpc } from "../../lib/rpc";
import { ChatModelPicker } from "./chat-model-picker";

vi.mock("../../lib/rpc", () => ({
  rpc: {
    models: {
      credentials: vi.fn(async () => [
        { provider: "openai-compatible", label: "Local", modelId: "local-helper" },
      ]),
      list: vi.fn(async () => []),
    },
    me: vi.fn(async () => ({ defaultProvider: "openai-compatible", defaultModel: "local-helper" })),
    bots: { update: vi.fn(async () => ({})) },
  },
}));
vi.mock("@lingui/react/macro", () => {
  const t = (parts: TemplateStringsArray, ...values: unknown[]) =>
    parts.reduce((text, part, index) => `${text}${index > 0 ? values[index - 1] : ""}${part}`, "");
  return { useLingui: () => ({ t }) };
});
vi.mock("@rakazo/ui-web", () => ({
  NativeSelect: (props: ComponentProps<"select">) => <select {...props} />,
  NativeSelectOption: (props: ComponentProps<"option">) => <option {...props} />,
}));

let root: Root;
let container: HTMLDivElement;
const onChanged = vi.fn(async () => undefined);
beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});
async function render(modelId: string | null = null) {
  await act(async () =>
    root.render(
      <ChatModelPicker
        bot={{ id: "bot-1", modelProvider: modelId ? "openai-compatible" : null, modelId }}
        onChanged={onChanged}
      />,
    ),
  );
  return container.querySelector("select")!;
}
async function select(select: HTMLSelectElement, value: string) {
  await act(async () => {
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}
it("saves an exact connected model from chat and clears stale thinking", async () => {
  const picker = await render();
  expect(picker.disabled).toBe(false);
  expect(picker.options[1]!.text).toBe("Local · local-helper");
  await select(picker, "openai-compatible::local-helper");
  expect(rpc.bots.update).toHaveBeenCalledWith({
    botId: "bot-1",
    modelProvider: "openai-compatible",
    modelId: "local-helper",
    thinkingLevel: null,
  });
  expect(onChanged).toHaveBeenCalledOnce();
});
it("can return to the space default", async () => {
  const picker = await render("local-helper");
  await select(picker, "");
  expect(rpc.bots.update).toHaveBeenCalledWith({
    botId: "bot-1",
    modelProvider: null,
    modelId: null,
    thinkingLevel: null,
  });
});
it("keeps the saved choice and shows a failed write", async () => {
  vi.mocked(rpc.bots.update).mockRejectedValueOnce(new Error("Model unavailable"));
  const picker = await render();
  await select(picker, "openai-compatible::local-helper");
  expect(container.querySelector('[role="alert"]')?.textContent).toBe("Model unavailable");
  expect(picker.value).toBe("");
  expect(picker.disabled).toBe(false);
  expect(onChanged).not.toHaveBeenCalled();
});
