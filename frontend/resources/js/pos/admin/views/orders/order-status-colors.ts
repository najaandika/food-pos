import type { ChipColor } from '../../../../../../components/base/badges/chip';
import type { PosOrderStatus } from '@/lib/pos-types';

/** One semantic palette for the same order status across operational roles.
 * Table occupancy and customer-call statuses use a different domain palette. */
export const ORDER_STATUS_CHIP_COLORS = {
    pending: 'yellow',
    accepted: 'blue',
    preparing: 'orange',
    ready: 'lime',
    served: 'cyan',
    waiting_payment: 'yellow',
    paid: 'lime',
    cancelled: 'rose',
} satisfies Record<PosOrderStatus, ChipColor>;

export function orderStatusChipColor(status?: PosOrderStatus): ChipColor {
    return status ? (ORDER_STATUS_CHIP_COLORS[status] ?? 'neutral') : 'neutral';
}
