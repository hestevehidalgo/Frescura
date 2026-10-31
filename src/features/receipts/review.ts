// Convierte la respuesta de la IA en filas para la pantalla de revisión, y guarda lo confirmado.
// Sin IA: todo lo de aquí corre en el celular.

import type { Db } from '@/db/db';
import { removeItems } from '@/db/inventory-repo';
import { createCustomProduct } from '@/db/products-repo';
import { deleteReceipt, insertReceipt } from '@/db/receipts-repo';
import { matchCatalog, type Location, type Product } from '@/features/catalog/catalog';
import { addToInventory } from '@/features/inventory/service';
import { isIsoDate, minDate, type IsoDate } from '@/lib/dates';
import type { Unit } from '@/lib/quantity';
import { capitalize } from '@/lib/text';

import type { ParsedReceipt } from '../../../supabase/functions/parse-receipt/logic';

/** Bajo esta confianza la fila se resalta para que el usuario la revise. */
export const LOW_CONFIDENCE = 0.6;

export type ReviewRow = {
  key: string;
  /** Texto impreso en la boleta, para que el usuario reconozca la línea. */
  printed: string;
  name: string;
  /** Producto del catálogo, o null si se crea uno propio con la categoría sugerida. */
  catalogProduct: Product | null;
  categoryId: string;
  quantity: number;
  unit: Unit;
  location: Location;
  priceClp: number;
  /** Se guarda en el inventario (los no alimentos parten excluidos). */
  include: boolean;
  isFood: boolean;
  lowConfidence: boolean;
};

export type ReceiptReview = {
  chain: string | null;
  issuerRut: string | null;
  folio: string | null;
  purchasedAt: IsoDate;
  totalClp: number | null;
  discountsClp: number;
  rows: ReviewRow[];
  /** Diferencia entre la suma de las líneas (menos descuentos) y el total impreso. */
  mismatchClp: number | null;
  fingerprint: string | null;
  imageHash: string | null;
};

/** "76.134.941-4" → "761349414" */
export function normalizeRut(rut: string): string {
  return rut.replace(/[^0-9kK]/g, '').toUpperCase();
}

/** Diferencia aceptable al cuadrar el total: redondeos y líneas mal leídas por pocos pesos. */
function tolerance(total: number): number {
  return Math.max(10, Math.round(total * 0.01));
}

export function buildReview(
  receipt: ParsedReceipt,
  today: IsoDate,
  imageHash: string | null,
): ReceiptReview {
  const rows: ReviewRow[] = receipt.l.map((line, index) => {
    const catalogProduct = line.f ? matchCatalog(line.n) : null;
    return {
      key: `line-${index}`,
      printed: line.x,
      // Se muestra el nombre de la boleta ("Pechuga de pollo"); el catálogo solo da la vida útil.
      name: capitalize(line.n),
      catalogProduct,
      categoryId: catalogProduct?.categoryId ?? line.c,
      quantity: line.q,
      unit: line.u,
      location: line.s,
      priceClp: line.p,
      include: line.f,
      isFood: line.f,
      lowConfidence: line.k < LOW_CONFIDENCE,
    };
  });

  const sum = receipt.l.reduce((acc, line) => acc + line.p, 0) - receipt.ds;
  const mismatch =
    receipt.t !== null && Math.abs(sum - receipt.t) > tolerance(receipt.t) ? sum - receipt.t : null;

  // La fecha de compra es la de la boleta, nunca futura.
  const purchasedAt = receipt.d && isIsoDate(receipt.d) ? minDate(receipt.d, today) : today;

  return {
    chain: receipt.m,
    issuerRut: receipt.r,
    folio: receipt.fo,
    purchasedAt,
    totalClp: receipt.t,
    discountsClp: receipt.ds,
    rows,
    mismatchClp: mismatch,
    fingerprint: receipt.r && receipt.fo ? `${normalizeRut(receipt.r)}|${receipt.fo}` : null,
    imageHash,
  };
}

/** Guarda la boleta y los productos incluidos. Devuelve lo necesario para deshacer. */
export async function saveReview(
  db: Db,
  review: ReceiptReview,
): Promise<{ receiptId: string; itemIds: string[] }> {
  const receipt = await insertReceipt(db, {
    chain: review.chain,
    issuerRut: review.issuerRut,
    folio: review.folio,
    purchasedAt: review.purchasedAt,
    totalClp: review.totalClp,
    fingerprint: review.fingerprint,
    imageHash: review.imageHash,
  });
  const itemIds: string[] = [];
  try {
    for (const row of review.rows.filter((r) => r.include)) {
      const product =
        row.catalogProduct ??
        (await createCustomProduct(db, {
          name: row.name,
          categoryId: row.categoryId,
          unit: row.unit,
        }));
      const item = await addToInventory(db, {
        product,
        displayName: row.name,
        quantity: row.quantity,
        unit: row.unit,
        location: row.location,
        purchasedAt: review.purchasedAt,
        priceClp: row.priceClp,
        receiptId: receipt.id,
      });
      itemIds.push(item.id);
    }
  } catch (error) {
    await undoSavedReview(db, { receiptId: receipt.id, itemIds });
    throw error;
  }
  return { receiptId: receipt.id, itemIds };
}

export async function undoSavedReview(
  db: Db,
  saved: { receiptId: string; itemIds: string[] },
): Promise<void> {
  await removeItems(db, saved.itemIds);
  await deleteReceipt(db, saved.receiptId);
}
