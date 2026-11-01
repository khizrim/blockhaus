import { Platform, View } from 'react-native';
import type { ComponentRef, RefObject } from 'react';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

import { shareOrCopy } from './daily';

/** Shares a drawn view as a picture: the poster, not a line of text. A
    browser has no way to snapshot a view, so there the text goes instead. */
export async function shareImage(ref: RefObject<ComponentRef<typeof View> | null>, text: string): Promise<'shared' | 'copied' | 'failed'> {
  if (Platform.OS === 'web' || !ref.current) return shareOrCopy(text);
  try {
    const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
    if (!(await Sharing.isAvailableAsync())) return shareOrCopy(text);
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Blockhaus' });
    return 'shared';
  } catch {
    return shareOrCopy(text);
  }
}
