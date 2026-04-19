/**
 * useFontScale
 * Global font scale multiplier stored in MMKV.
 * Small = 0.9, Medium = 1.0, Large = 1.3
 */
import { useState, useCallback } from 'react';
import { storage, StorageKeys } from '../storage';

export type FontScaleOption = 'small' | 'medium' | 'large';

const SCALE_MAP: Record<FontScaleOption, number> = {
  small: 0.9,
  medium: 1.0,
  large: 1.3,
};

function getStoredScale(): FontScaleOption {
  const stored = storage.getString(StorageKeys.FONT_SCALE as string);
  if (stored === 'small' || stored === 'medium' || stored === 'large') {
    return stored;
  }
  return 'medium';
}

export function useFontScale() {
  const [fontScale, setFontScaleState] = useState<FontScaleOption>(getStoredScale);

  const setFontScale = useCallback((option: FontScaleOption) => {
    setFontScaleState(option);
    storage.set(StorageKeys.FONT_SCALE as string, option);
  }, []);

  return {
    fontScale,
    multiplier: SCALE_MAP[fontScale],
    setFontScale,
  };
}
