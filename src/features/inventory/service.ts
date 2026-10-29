// Acciones sobre el inventario: une el catálogo, el motor de vencimientos y la base local.

import type { Db } from '@/db/db';
import {
  getItem,
  insertItem,
  splitItem,
  undoEvent,
  updateItem,
  type DiscardReason,
  type InventoryItem,
  type ItemPatch,
} from '@/db/inventory-repo';
import { findProduct, getShelfLifeFactor, setShelfLifeFactor } from '@/db/products-repo';
import type { Location, Product } from '@/features/catalog/catalog';
import {
  estimateExpiry,
  expiryAfterFreezing,
  expiryAfterMoving,
  expiryAfterOpening,
  expiryAfterThawing,
  factorAfterLastedLonger,
  factorAfterSpoiledEarly,
  locationAfterOpening,
  printedExpiry,
  userExpiry,
  type Expiry,
} from '@/features/expiry/expiry';
import { todayLocal, type IsoDate } from '@/lib/dates';
import type { Unit } from '@/lib/quantity';

export type AddInput = {
  product: Product;
  quantity: number;
  unit?: Unit;
  location?: Location;
  purchasedAt?: IsoDate;
  priceClp?: number | null;
  ripe?: boolean;
  displayName?: string;
  notes?: string | null;
  receiptId?: string | null;
  /** Fecha real del envase, si se conoce. */
  printedDate?: IsoDate;
};

export async function addToInventory(db: Db, input: AddInput): Promise<InventoryItem> {
  const location = input.location ?? input.product.storage;
  const purchasedAt = input.purchasedAt ?? todayLocal();
  const factor = await getShelfLifeFactor(db, input.product.id);
  const expiry = input.printedDate
    ? printedExpiry(input.printedDate)
    : estimateExpiry({ product: input.product, location, purchasedAt, ripe: input.ripe, factor });
  return insertItem(db, {
    productId: input.product.id,
    displayName: input.displayName ?? input.product.name,
    quantity: input.quantity,
    unit: input.unit ?? input.product.unit,
    location,
    priceClp: input.priceClp ?? null,
    purchasedAt,
    expiresAt: expiry.expiresAt,
    latestAt: expiry.latestAt,
    expirySource: expiry.source,
    dateType: input.product.dateType,
    openedAt: null,
    frozenAt: location === 'freezer' ? purchasedAt : null,
    thawedAt: null,
    receiptId: input.receiptId ?? null,
    notes: input.notes ?? null,
  });
}

export type ItemAction =
  | { type: 'consume'; quantity?: number }
  | { type: 'discard'; quantity?: number; reason?: DiscardReason }
  | { type: 'open' }
  | { type: 'freeze' }
  | { type: 'thaw' }
  | { type: 'move'; location: Location }
  | { type: 'setExpiry'; date: IsoDate; source: 'printed' | 'user' }
  | {
      type: 'edit';
      fields: Partial<
        Pick<
          InventoryItem,
          'displayName' | 'quantity' | 'unit' | 'priceClp' | 'purchasedAt' | 'notes'
        >
      >;
    }
  | { type: 'split'; quantity: number };

/** Lo necesario para deshacer una acción, incluido el ajuste personal si lo hubo. */
export type UndoHandle = {
  eventId: string;
  factor?: { productId: string; previous: number };
};

function currentExpiry(item: InventoryItem): Expiry {
  return { expiresAt: item.expiresAt, source: item.expirySource, latestAt: item.latestAt };
}

function expiryPatch(expiry: Expiry): ItemPatch {
  return { expiresAt: expiry.expiresAt, latestAt: expiry.latestAt, expirySource: expiry.source };
}

async function requireProduct(db: Db, item: InventoryItem): Promise<Product> {
  const product = await findProduct(db, item.productId);
  if (!product) {
    throw new Error(`Producto desconocido: ${item.productId}`);
  }
  return product;
}

/** Cuánto queda después de usar `used`; null si se usó todo. */
function remaining(item: InventoryItem, used: number | undefined): number | null {
  if (used === undefined || used >= item.quantity) {
    return null;
  }
  return Math.round((item.quantity - used) * 1000) / 1000;
}

export async function performAction(
  db: Db,
  itemId: string,
  action: ItemAction,
  today: IsoDate = todayLocal(),
  now = new Date(),
): Promise<UndoHandle> {
  const item = await getItem(db, itemId);
  if (!item) {
    throw new Error(`No existe el producto ${itemId}`);
  }
  const product = await requireProduct(db, item);
  const closedAt = now.toISOString();

  switch (action.type) {
    case 'consume': {
      const left = remaining(item, action.quantity);
      const used = left === null ? item.quantity : item.quantity - left;
      const patch: ItemPatch =
        left === null ? { status: 'consumed', closedAt } : { quantity: left };
      const eventId = await updateItem(
        db,
        itemId,
        patch,
        { type: 'consumed', quantityDelta: -used },
        now,
      );
      // Se lo comió en buen estado después de la fecha estimada: aprendizaje cauteloso.
      if (left === null && item.expirySource === 'estimated' && today > item.expiresAt) {
        return {
          eventId,
          factor: await adjustFactor(db, product, (f) => factorAfterLastedLonger(product, f)),
        };
      }
      return { eventId };
    }
    case 'discard': {
      const left = remaining(item, action.quantity);
      const used = left === null ? item.quantity : item.quantity - left;
      const patch: ItemPatch =
        left === null
          ? { status: 'discarded', closedAt, discardReason: action.reason ?? null }
          : { quantity: left };
      const eventId = await updateItem(
        db,
        itemId,
        patch,
        { type: 'discarded', quantityDelta: -used },
        now,
      );
      // Se echó a perder antes de la fecha estimada: se acorta para la próxima vez.
      if (
        action.reason === 'spoiled' &&
        item.expirySource === 'estimated' &&
        today < item.expiresAt
      ) {
        return { eventId, factor: await adjustFactor(db, product, factorAfterSpoiledEarly) };
      }
      return { eventId };
    }
    case 'open': {
      const location = locationAfterOpening(product, item.location);
      const expiry = expiryAfterOpening(product, currentExpiry(item), item.location, today);
      return {
        eventId: await updateItem(
          db,
          itemId,
          { openedAt: today, location, ...expiryPatch(expiry) },
          { type: 'opened' },
          now,
        ),
      };
    }
    case 'freeze': {
      const expiry = expiryAfterFreezing(product, today);
      return {
        eventId: await updateItem(
          db,
          itemId,
          { location: 'freezer', frozenAt: today, thawedAt: null, ...expiryPatch(expiry) },
          { type: 'frozen' },
          now,
        ),
      };
    }
    case 'thaw': {
      const expiry = expiryAfterThawing(product, today);
      return {
        eventId: await updateItem(
          db,
          itemId,
          { location: 'fridge', thawedAt: today, ...expiryPatch(expiry) },
          { type: 'thawed' },
          now,
        ),
      };
    }
    case 'move': {
      if (action.location === item.location) {
        throw new Error('El producto ya está en ese lugar');
      }
      if (action.location === 'freezer') {
        return performAction(db, itemId, { type: 'freeze' }, today, now);
      }
      if (item.location === 'freezer') {
        return performAction(db, itemId, { type: 'thaw' }, today, now);
      }
      const expiry = expiryAfterMoving(
        product,
        currentExpiry(item),
        action.location,
        item.purchasedAt,
        today,
      );
      return {
        eventId: await updateItem(
          db,
          itemId,
          { location: action.location, ...expiryPatch(expiry) },
          { type: 'moved' },
          now,
        ),
      };
    }
    case 'setExpiry': {
      const expiry =
        action.source === 'printed' ? printedExpiry(action.date) : userExpiry(action.date);
      return {
        eventId: await updateItem(db, itemId, expiryPatch(expiry), { type: 'edited' }, now),
      };
    }
    case 'edit': {
      const patch: ItemPatch = { ...action.fields };
      // Si cambió la fecha de compra y la fecha era estimada, se vuelve a estimar.
      if (
        action.fields.purchasedAt &&
        action.fields.purchasedAt !== item.purchasedAt &&
        item.expirySource === 'estimated' &&
        !item.openedAt &&
        !item.frozenAt
      ) {
        const factor = await getShelfLifeFactor(db, product.id);
        Object.assign(
          patch,
          expiryPatch(
            estimateExpiry({
              product,
              location: item.location,
              purchasedAt: action.fields.purchasedAt,
              factor,
            }),
          ),
        );
      }
      return { eventId: await updateItem(db, itemId, patch, { type: 'edited' }, now) };
    }
    case 'split': {
      const { eventId } = await splitItem(db, itemId, action.quantity, {}, now);
      return { eventId };
    }
  }
}

async function adjustFactor(
  db: Db,
  product: Product,
  next: (current: number) => number,
): Promise<UndoHandle['factor']> {
  const previous = await getShelfLifeFactor(db, product.id);
  const updated = next(previous);
  if (updated === previous) {
    return undefined;
  }
  await setShelfLifeFactor(db, product.id, updated);
  return { productId: product.id, previous };
}

export async function undoAction(db: Db, handle: UndoHandle): Promise<void> {
  await undoEvent(db, handle.eventId);
  if (handle.factor) {
    await setShelfLifeFactor(db, handle.factor.productId, handle.factor.previous);
  }
}
