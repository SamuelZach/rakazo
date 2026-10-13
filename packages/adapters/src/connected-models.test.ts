import type { PrismaClient } from "@rakazo/db";
import { describe, expect, it, vi } from "vitest";
import { listConnectedModels } from "./connected-models.js";
import type { CodexLiveCatalog } from "./pi-codex-catalog.js";

const scope = { userId: "user-1", spaceId: "space-1" };
const oauth = JSON.stringify({
  type: "oauth",
  access: "fake-access",
  refresh: "fake-refresh",
  expires: 4_000_000_000_000,
  accountId: "fake-account",
});
function fixture(connected = true, custom = false) {
  const credential = {
    id: "cred-1",
    provider: "openai-codex",
    secretId: "secret-1",
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
  const preference = {
    id: "pref-1",
    modelId: "gpt-6-luna",
    isDefault: true,
    updatedAt: new Date(0),
    credential,
  };
  const customPreference = {
    modelId: "local-helper",
    credential: { provider: "openai-compatible", secretId: "custom-secret" },
  };
  const findMany = vi.fn(async (args: { where: { credential?: unknown } }) =>
    args.where.credential ? (custom ? [customPreference] : []) : connected ? [preference] : [],
  );
  const prisma = {
    userModelCredential: { findMany: vi.fn(async () => (connected ? [credential] : [])) },
    spaceModelPreference: { findMany },
    secret: {
      findMany: vi.fn(async () => [{ id: "secret-1", ciphertext: "cipher-1" }]),
      findFirst: vi.fn(async () => ({ id: "custom-secret", ciphertext: "custom-cipher" })),
    },
  } as unknown as PrismaClient;
  const load = vi.fn(async (cipher: string) =>
    cipher === "custom-cipher"
      ? '{"kind":"openai_compatible","baseUrl":"https://models.example.test/v1","apiKey":"fake-custom-key"}'
      : oauth,
  );
  return { prisma, load, findMany };
}

describe("connected model discovery", () => {
  it("lists exact IDs and searches a display name with reordered words", async () => {
    const { prisma, load } = fixture();
    const all = await listConnectedModels(prisma, { load }, scope);
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((model) => model.model_provider === "openai-codex")).toBe(true);
    expect(all.some((model) => model.model_id === "gpt-5.3-codex-spark")).toBe(false);
    const matches = await listConnectedModels(prisma, { load }, scope, "GPT luna 6");
    expect(matches).toContainEqual(
      expect.objectContaining({ model_provider: "openai-codex", model_id: "gpt-6-luna" }),
    );
    expect(JSON.stringify(all)).not.toContain("fake-access");
    expect(JSON.stringify(all)).not.toContain("fake-account");
    expect(await listConnectedModels(prisma, { load }, scope, "does-not-exist")).toEqual([]);
  });

  it("returns no disconnected providers", async () => {
    const { prisma, load } = fixture(false);
    expect(await listConnectedModels(prisma, { load }, scope)).toEqual([]);
    expect(load).not.toHaveBeenCalled();
  });

  it("honors the live account's available model list", async () => {
    const { prisma, load } = fixture();
    const catalog = {
      read: vi.fn(async () => [
        { slug: "gpt-6-luna", reasoningEfforts: [], supportsImages: true, supportsFastTier: false },
      ]),
    } as unknown as CodexLiveCatalog;
    const models = await listConnectedModels(prisma, { load }, scope, "", catalog);
    expect(models.map((model) => model.model_id)).toEqual(["gpt-6-luna"]);
  });

  it("includes custom models only from this user's space, without connection details", async () => {
    const { prisma, load, findMany } = fixture(false, true);
    const models = await listConnectedModels(
      prisma,
      { load },
      { ...scope, extra: "must-not-reach-query" } as typeof scope,
      "local helper",
    );
    expect(models).toEqual([
      {
        name: "openai-compatible · local-helper",
        model_provider: "openai-compatible",
        model_id: "local-helper",
      },
    ]);
    expect(findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          ...scope,
          modelId: { not: null },
          credential: { userId: scope.userId, provider: "openai-compatible" },
        },
      }),
    );
    expect(JSON.stringify(models)).not.toContain("example.test");
    expect(JSON.stringify(models)).not.toContain("fake-custom-key");
  });

  it("omits a custom connection whose stored secret cannot be read", async () => {
    const { prisma } = fixture(false, true);
    const load = vi.fn(async () => {
      throw new Error("missing secret");
    });
    expect(await listConnectedModels(prisma, { load }, scope)).toEqual([]);
  });
});
