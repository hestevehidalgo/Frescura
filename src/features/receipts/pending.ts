// Boleta leída que espera revisión. Vive en memoria entre la pantalla Escanear y la de revisión.
import type { ReceiptReview } from './review';

let pending: ReceiptReview | null = null;

export function setPendingReview(review: ReceiptReview | null): void {
  pending = review;
}

export function getPendingReview(): ReceiptReview | null {
  return pending;
}
