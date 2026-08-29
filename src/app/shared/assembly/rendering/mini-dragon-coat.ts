import { miniDragonStableHash } from './mini-dragon-random';

export interface MiniDragonCoatForms {
  pattern: string;
  ember: string;
  coat: string;
}

export interface MiniDragonCoatPaint {
  color: string;
  patchColor: string;
  emberColor: string;
  accentColor: string;
  patternStyle: string;
  surfaceStyle: string;
}

const EMBER_COLORS: Readonly<Record<string, string>> = {
  'ember:rose': '#ff6f91',
  'ember:blue': '#63c8ff',
  'ember:pale': '#ffe9c2',
};

const DISPLAY_ACCENTS = [
  '#00d9ff', '#2166ff', '#7047eb', '#bd3cff', '#ff3aa7', '#ff4057',
  '#ff681f', '#ffb000', '#f0e323', '#8edb28', '#00c875', '#00b7a8',
  '#ff78d1', '#7cf4ff', '#b9ff4a', '#ff8b63',
] as const;

const PATTERN_STYLES = [
  'saddle', 'blaze', 'bands', 'constellation', 'harlequin', 'freckles',
] as const;

/**
 * Shared coat recipe used by both the student genetics builder and Designer.
 * Forms supply inherited appearance; the stable id supplies non-inherited variation.
 */
export function resolveMiniDragonCoatPaint(
  forms: MiniDragonCoatForms,
  individualId: string,
): MiniDragonCoatPaint {
  const lightness = 22 + (miniDragonStableHash(`${individualId}:light`) % 35);
  const saturation = 20 + (miniDragonStableHash(`${individualId}:sat`) % 45);
  const ash = `hsl(24, ${Math.round(saturation * 0.55)}%, ${Math.max(14, lightness - 8)}%)`;
  const gold = `hsl(44, ${Math.min(100, saturation + 35)}%, ${Math.min(66, lightness + 10)}%)`;
  const color = forms.pattern === 'pattern:ash' ? ash : gold;

  return {
    color,
    patchColor: forms.pattern === 'pattern:ash-gold' ? ash : color,
    emberColor: EMBER_COLORS[forms.ember] ?? '#ffe9c2',
    accentColor: DISPLAY_ACCENTS[
      miniDragonStableHash(`${individualId}:display-accent`) % DISPLAY_ACCENTS.length
    ],
    patternStyle: PATTERN_STYLES[
      miniDragonStableHash(`${individualId}:marking-layout`) % PATTERN_STYLES.length
    ],
    surfaceStyle: forms.coat === 'coat:fluffy' ? 'bumpy' : 'sleek',
  };
}

/** Canonicalizes the shared HSL coat recipe for the model-pack hex contract. */
export function miniDragonHexColor(color: string): string {
  if (/^#[0-9a-f]{6}$/i.test(color)) return color.toLowerCase();
  const match = /^hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)$/.exec(color);
  if (!match) throw new Error(`Unsupported Mini Dragon color: ${color}`);

  const hue = ((Number(match[1]) % 360) + 360) % 360;
  const saturation = Number(match[2]) / 100;
  const lightness = Number(match[3]) / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const segment = hue / 60;
  const intermediate = chroma * (1 - Math.abs((segment % 2) - 1));
  const [red, green, blue] = segment < 1
    ? [chroma, intermediate, 0]
    : segment < 2
      ? [intermediate, chroma, 0]
      : segment < 3
        ? [0, chroma, intermediate]
        : segment < 4
          ? [0, intermediate, chroma]
          : segment < 5
            ? [intermediate, 0, chroma]
            : [chroma, 0, intermediate];
  const offset = lightness - chroma / 2;
  return `#${[red, green, blue]
    .map(channel => Math.round((channel + offset) * 255).toString(16).padStart(2, '0'))
    .join('')}`;
}
