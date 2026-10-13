import { useLingui } from "@lingui/react/macro";
import type { Bot, Me, ModelCatalogEntry, ModelCredential } from "@rakazo/contracts";
import { connectedModelChoices, modelOptionKey, parseModelOptionKey } from "@rakazo/core";
import { NativeSelect, NativeSelectOption } from "@rakazo/ui-web";
import { useEffect, useState } from "react";
import { rpc } from "../../lib/rpc";
import { errorText } from "../../lib/user-error";

export function ChatModelPicker({
  bot,
  onChanged,
}: {
  bot: Pick<Bot, "id" | "modelProvider" | "modelId">;
  onChanged: () => Promise<unknown>;
}) {
  const { t } = useLingui();
  const [metadata, setMetadata] = useState<{
    credentials: ModelCredential[];
    catalog: ModelCatalogEntry[];
    me: Me;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void Promise.all([rpc.models.credentials(), rpc.models.list(), rpc.me()])
      .then(([credentials, catalog, me]) => {
        if (!cancelled) setMetadata({ credentials, catalog, me });
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(errorText(reason, t`Could not load model settings`));
      });
    return () => {
      cancelled = true;
    };
  }, [t]);
  const options = metadata ? connectedModelChoices(metadata.credentials, metadata.catalog) : [];
  const key =
    bot.modelProvider && bot.modelId ? modelOptionKey(bot.modelProvider, bot.modelId) : "";
  const defaultLabel =
    metadata?.catalog.find(
      (entry) =>
        entry.provider === metadata.me.defaultProvider && entry.id === metadata.me.defaultModel,
    )?.label ?? metadata?.me.defaultModel;
  return (
    <div className="flex items-center gap-2 px-6 pb-2">
      <NativeSelect
        aria-label={t`Model`}
        className="max-w-64 text-xs"
        value={key}
        disabled={!metadata || saving}
        onChange={(event) => {
          const selected = parseModelOptionKey(event.target.value);
          setSaving(true);
          setError(null);
          void rpc.bots
            .update({
              botId: bot.id,
              modelProvider: selected?.provider ?? null,
              modelId: selected?.modelId ?? null,
              thinkingLevel: null,
            })
            .then(onChanged)
            .catch((reason: unknown) => {
              setError(errorText(reason, t`Could not save model`));
            })
            .finally(() => setSaving(false));
        }}
      >
        <NativeSelectOption value="">
          {defaultLabel ? `${t`Space default`} · ${defaultLabel}` : t`Space default`}
        </NativeSelectOption>
        {key && !options.some((option) => option.key === key) ? (
          <NativeSelectOption value={key}>{bot.modelId}</NativeSelectOption>
        ) : null}
        {options.map((option) => (
          <NativeSelectOption key={option.key} value={option.key}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      {error ? (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}
