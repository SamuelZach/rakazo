import type { LiquidAvatarOptions } from "@rakazo/contracts";
import {
  DEFAULT_LIQUID_AVATAR,
  LIQUID_AVATAR_EXTRAS,
  LIQUID_AVATAR_EYES,
  LIQUID_AVATAR_MOTIONS,
  LIQUID_AVATAR_SHAPES,
  parseLiquidAvatar,
  updateLiquidAvatar,
} from "@rakazo/contracts";
import { View } from "react-native";
import { useI18n } from "../lib/i18n";
import { MenuPicker } from "./menu-picker";

export function LiquidAvatarEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  const options = parseLiquidAvatar(value)?.options ?? DEFAULT_LIQUID_AVATAR;
  const update = (patch: Partial<LiquidAvatarOptions>) =>
    onChange(updateLiquidAvatar(value, patch));
  const choices = (values: readonly string[]) =>
    values.map((key) => ({
      key,
      label: /^[0-9.]+$/.test(key)
        ? `${key}×`
        : t(key === "drip-orbit" ? "Drip + orbit" : key.charAt(0).toUpperCase() + key.slice(1)),
    }));
  return (
    <View>
      <MenuPicker
        label={t("Shape")}
        value={options.shape}
        choices={choices(LIQUID_AVATAR_SHAPES)}
        onChange={(shape) => update({ shape: shape as LiquidAvatarOptions["shape"] })}
      />
      <MenuPicker
        label={t("Eyes")}
        value={options.eyes}
        choices={choices(LIQUID_AVATAR_EYES)}
        onChange={(eyes) => update({ eyes: eyes as LiquidAvatarOptions["eyes"] })}
      />
      <MenuPicker
        label={t("Motion")}
        value={options.motion}
        choices={choices(LIQUID_AVATAR_MOTIONS)}
        onChange={(motion) => update({ motion: motion as LiquidAvatarOptions["motion"] })}
      />
      <MenuPicker
        label={t("Effects")}
        value={options.extra}
        choices={choices(LIQUID_AVATAR_EXTRAS)}
        onChange={(extra) => update({ extra: extra as LiquidAvatarOptions["extra"] })}
      />
      <MenuPicker
        label={t("Speed")}
        value={String(options.speed)}
        choices={choices([
          ...new Set([String(options.speed), "0.5", "0.75", "1", "1.5", "2", "3", "4"]),
        ])}
        onChange={(speed) => update({ speed: Number(speed) })}
      />
    </View>
  );
}
