import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

// Ancho al que se reduce la foto antes de mandarla: suficiente para leer una boleta y barato en
// tokens. Se ajusta con el set de evaluación.
const TARGET_WIDTH = 1100;
const JPEG_QUALITY = 0.6;

export type CapturedImage = { base64: string; uri: string };
export type CaptureResult = CapturedImage | 'cancelled' | 'denied';

/** Ancho al que se lleva la foto: nunca se agranda (agrandar solo gasta más tokens). */
export function targetWidth(width: number | undefined, max = TARGET_WIDTH): number | null {
  return width !== undefined && width > max ? max : null;
}

/** Para ver la madurez de una fruta basta una foto chica: menos tokens, menos costo. */
const PRODUCT_PHOTO_WIDTH = 512;

async function shrink(
  uri: string,
  width: number | undefined,
  max = TARGET_WIDTH,
): Promise<CapturedImage> {
  const target = targetWidth(width, max);
  const context = ImageManipulator.manipulate(uri);
  if (target !== null) {
    context.resize({ width: target });
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({
    base64: true,
    compress: JPEG_QUALITY,
    format: SaveFormat.JPEG,
  });
  return { base64: saved.base64 ?? '', uri: saved.uri };
}

export async function captureReceipt(source: 'camera' | 'library'): Promise<CaptureResult> {
  // La galería usa el selector del sistema, que no necesita permiso (y en Android el permiso de
  // leer todas las fotos está bloqueado a propósito). Solo la cámara pide permiso.
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      return 'denied';
    }
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) {
    return 'cancelled';
  }
  return shrink(asset.uri, asset.width);
}

/** Foto de una fruta o verdura con la cámara, achicada a 512 px. */
export async function captureProductPhoto(): Promise<CaptureResult> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    return 'denied';
  }
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) {
    return 'cancelled';
  }
  return shrink(asset.uri, asset.width, PRODUCT_PHOTO_WIDTH);
}
