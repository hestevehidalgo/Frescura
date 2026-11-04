// Guardar y abrir el archivo de respaldo con el menú de compartir y el selector de archivos del
// sistema. Solo en iOS y Android (en la versión web no hay archivos locales).

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { backupFileName, exportBackup } from '@/db/backup';
import type { Db } from '@/db/db';
import { todayLocal } from '@/lib/dates';

export const BACKUP_SUPPORTED = Platform.OS !== 'web';

/** Crea el archivo y abre el menú para guardarlo en Archivos, mandarlo por correo, etc. */
export async function shareBackup(db: Db): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) {
    return false;
  }
  const backup = await exportBackup(db);
  const file = new File(Paths.cache, backupFileName(todayLocal()));
  file.create({ overwrite: true });
  await file.write(JSON.stringify(backup));
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: backupFileName(todayLocal()),
  });
  return true;
}

/** Abre el selector de archivos. Devuelve el texto del archivo o null si la persona cancela. */
export async function pickBackupText(): Promise<string | null> {
  // Se acepta cualquier archivo: Android a veces marca el .json como "archivo genérico" y lo
  // dejaría en gris. El contenido se revisa después con parseBackup.
  const picked = await File.pickFileAsync({ mimeTypes: '*/*' });
  if (picked.canceled) {
    return null;
  }
  return picked.result.text();
}
