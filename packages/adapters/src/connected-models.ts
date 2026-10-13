import type { SecretStore } from "@rakazo/adapter-kit";
import { SecretStoreUnavailableError } from "@rakazo/adapter-kit";
import { connectedModelChoices } from "@rakazo/core";
import type { PrismaClient } from "@rakazo/db";
import { modelCredentialAuthKindsForSpace } from "./model-selection.js";
import { listAvailablePiCatalog } from "./pi-catalog-availability.js";
import type { CodexLiveCatalog } from "./pi-codex-catalog.js";
import { applyCodexLiveCatalog, codexLiveCatalogsForSpace } from "./pi-codex-catalog.js";
import { parseModelSecret } from "./pi-oauth.js";
import { OPENAI_COMPATIBLE_PROVIDER_ID } from "./pi-openai-compatible-provider.js";

/** Only public model metadata leaves this boundary; credentials remain server-side. */
export async function listConnectedModels(
  prisma: PrismaClient,
  secretStore: Pick<SecretStore, "load">,
  scope: { userId: string; spaceId: string },
  query = "",
  codexCatalog?: CodexLiveCatalog,
) {
  const auth = await modelCredentialAuthKindsForSpace(prisma, secretStore, scope);
  const available = listAvailablePiCatalog(auth.byProvider, auth.byModel);
  const live = codexCatalog
    ? await codexLiveCatalogsForSpace(prisma, secretStore, scope, auth, codexCatalog)
    : new Map();
  const catalog = applyCodexLiveCatalog(available, auth, live).filter((entry) => {
    const kind = auth.byModel[entry.provider]?.[entry.id] ?? auth.byProvider[entry.provider];
    return kind && kind !== "disconnected";
  });
  const refs = [...new Set(catalog.map((entry) => entry.provider))].map((provider) => ({
    provider,
    label: provider,
  }));
  const choices = connectedModelChoices(refs, catalog);
  // Generic endpoints can expose model IDs absent from the static provider catalog.
  const custom = await prisma.spaceModelPreference.findMany({
    where: {
      userId: scope.userId,
      spaceId: scope.spaceId,
      modelId: { not: null },
      credential: { userId: scope.userId, provider: OPENAI_COMPATIBLE_PROVIDER_ID },
    },
    select: { modelId: true, credential: { select: { provider: true, secretId: true } } },
  });
  for (const preference of custom) {
    const secret = await prisma.secret.findFirst({
      where: { id: preference.credential.secretId, userId: scope.userId, spaceId: null },
      select: { id: true, ciphertext: true },
    });
    if (!secret) continue;
    try {
      const parsed = parseModelSecret(await secretStore.load(secret.ciphertext, secret.id));
      if (parsed.kind !== "openai_compatible") continue;
    } catch (error) {
      if (error instanceof SecretStoreUnavailableError) throw error;
      continue;
    }
    choices.push(
      ...connectedModelChoices(
        [
          {
            provider: preference.credential.provider,
            label: preference.credential.provider,
            modelId: preference.modelId,
          },
        ],
        catalog,
      ),
    );
  }
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const seen = new Set<string>();
  return choices
    .filter((choice) => {
      if (seen.has(choice.key)) return false;
      seen.add(choice.key);
      const text = `${choice.label} ${choice.modelId} ${choice.provider}`.toLowerCase();
      return terms.every((term) => text.includes(term));
    })
    .map((choice) => ({
      name: choice.label,
      model_provider: choice.provider,
      model_id: choice.modelId,
    }));
}
