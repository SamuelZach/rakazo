import { connectedModelChoices, modelOptionKey, parseModelOptionKey } from "@rakazo/core";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import type { MobileBot, MobileMe, MobileModel, MobileModelCredential } from "../lib/api";
import { rpc } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { useMobileTokens } from "../lib/native";
import { errorText } from "../lib/user-error";
import { MenuPickerMenu } from "./menu-picker";

export function ChatModelPicker({
  bot,
  onChanged,
}: {
  bot: MobileBot;
  onChanged: (bot: MobileBot) => void;
}) {
  const { t } = useI18n();
  const tokens = useMobileTokens();
  const [metadata, setMetadata] = useState<{
    credentials: MobileModelCredential[];
    catalog: MobileModel[];
    me: MobileMe;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      rpc<MobileModelCredential[]>("models/credentials"),
      rpc<MobileModel[]>("models/list"),
      rpc<MobileMe>("me"),
    ])
      .then(([credentials, catalog, me]) => {
        if (!cancelled) setMetadata({ credentials, catalog, me });
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(errorText(reason, t("Could not load model settings")));
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
  const choices = [
    {
      key: "",
      label: defaultLabel ? `${t("Space default")} · ${defaultLabel}` : t("Space default"),
    },
    ...options,
  ];
  if (key && !choices.some((choice) => choice.key === key))
    choices.push({ key, label: bot.modelId ?? key });
  const label = choices.find((choice) => choice.key === key)?.label ?? choices[0]!.label;
  return (
    <View
      style={{ paddingTop: 4, paddingBottom: 6 }}
      pointerEvents={!metadata || saving ? "none" : "auto"}
    >
      <MenuPickerMenu
        label={t("Model")}
        choices={choices}
        value={key}
        onChange={(next) => {
          if (next === key || saving) return;
          const selected = parseModelOptionKey(next);
          setSaving(true);
          setError(null);
          void rpc<MobileBot>("bots/update", {
            botId: bot.id,
            modelProvider: selected?.provider ?? null,
            modelId: selected?.modelId ?? null,
            thinkingLevel: null,
          })
            .then(onChanged)
            .catch((reason: unknown) => {
              setError(errorText(reason, t("Could not save model")));
            })
            .finally(() => setSaving(false));
        }}
      >
        <Text
          accessibilityRole="button"
          accessibilityLabel={t("Model")}
          accessibilityValue={{ text: label }}
          style={{ color: tokens.mutedForeground, fontSize: 12 }}
          numberOfLines={1}
        >
          {label}
        </Text>
      </MenuPickerMenu>
      {error ? (
        <Text accessibilityRole="alert" style={{ color: tokens.destructive, fontSize: 12 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
