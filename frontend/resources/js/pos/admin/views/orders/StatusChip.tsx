import {
    Chip,
    type ChipColor,
} from '../../../../../../components/base/badges/chip';
import type { PosOrderStatus } from '@/lib/pos-types';
import { useLocale } from '../../i18n-context';
import { orderStatusLabel } from './order-ui';

const colorByStatus: Record<PosOrderStatus, ChipColor> = {
    pending: 'yellow',
    accepted: 'blue',
    preparing: 'orange',
    ready: 'lime',
    served: 'cyan',
    waiting_payment: 'yellow',
    paid: 'lime',
    cancelled: 'rose',
};

/** The installed official BoardUI Free Chip, with POS-specific status mapping. */
export function StatusChip({
    status,
    fallbackLabel,
}: {
    status?: PosOrderStatus;
    fallbackLabel?: string;
}) {
    const { t } = useLocale();
    return (
        <Chip
            variant="bold"
            color={status ? colorByStatus[status] : 'neutral'}
            data-status={status ?? 'unknown'}
            className="orders-boardui-status"
        >
            {status ? orderStatusLabel(status, t) : (fallbackLabel ?? '—')}
        </Chip>
    );
}
