import type { IsoDate } from '@/lib/dates';

import { newId, nowTimestamp, type Db } from './db';

export type Receipt = {
  id: string;
  chain: string | null;
  issuerRut: string | null;
  folio: string | null;
  purchasedAt: IsoDate;
  totalClp: number | null;
  fingerprint: string | null;
  imageHash: string | null;
  scannedAt: string;
};

type Row = {
  id: string;
  chain: string | null;
  issuer_rut: string | null;
  folio: string | null;
  purchased_at: string;
  total_clp: number | null;
  fingerprint: string | null;
  image_hash: string | null;
  scanned_at: string;
};

const SELECT =
  'SELECT id, chain, issuer_rut, folio, purchased_at, total_clp, fingerprint, image_hash, scanned_at FROM receipts';

function toReceipt(r: Row): Receipt {
  return {
    id: r.id,
    chain: r.chain,
    issuerRut: r.issuer_rut,
    folio: r.folio,
    purchasedAt: r.purchased_at,
    totalClp: r.total_clp,
    fingerprint: r.fingerprint,
    imageHash: r.image_hash,
    scannedAt: r.scanned_at,
  };
}

export async function findReceipt(
  db: Db,
  by: { fingerprint?: string | null; imageHash?: string | null },
): Promise<Receipt | null> {
  if (by.fingerprint) {
    const row = await db.getFirstAsync<Row>(`${SELECT} WHERE fingerprint = ?`, [by.fingerprint]);
    if (row) {
      return toReceipt(row);
    }
  }
  if (by.imageHash) {
    const row = await db.getFirstAsync<Row>(`${SELECT} WHERE image_hash = ?`, [by.imageHash]);
    if (row) {
      return toReceipt(row);
    }
  }
  return null;
}

export async function insertReceipt(
  db: Db,
  input: Omit<Receipt, 'id' | 'scannedAt'>,
): Promise<Receipt> {
  const receipt: Receipt = { ...input, id: newId(), scannedAt: nowTimestamp() };
  await db.runAsync(
    `INSERT INTO receipts (id, chain, issuer_rut, folio, purchased_at, total_clp, fingerprint, image_hash, scanned_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      receipt.id,
      receipt.chain,
      receipt.issuerRut,
      receipt.folio,
      receipt.purchasedAt,
      receipt.totalClp,
      receipt.fingerprint,
      receipt.imageHash,
      receipt.scannedAt,
    ],
  );
  return receipt;
}

export async function listReceipts(db: Db): Promise<Receipt[]> {
  const rows = await db.getAllAsync<Row>(`${SELECT} ORDER BY purchased_at DESC, scanned_at DESC`);
  return rows.map(toReceipt);
}

/** Borra una boleta recién guardada (para deshacer). Los productos se borran aparte. */
export async function deleteReceipt(db: Db, id: string): Promise<void> {
  await db.runAsync('DELETE FROM receipts WHERE id = ?', [id]);
}
