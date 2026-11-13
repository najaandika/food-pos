import { Chip } from '../../../../../../components/base/badges/chip';
import type { PosOrderStatus } from '@/lib/pos-types';
import { useLocale } from '../../i18n-context';
import { orderStatusLabel } from './order-ui';
import { orderStatusChipColor } from './order-status-colors';

/** The installed official BoardUI Free Chip, with POS-specific status mapping. */
export function StatusChip({
    status,
    fallbackLabel,
    variant = 'bold',
    className,
}: {
    status?: PosOrderStatus;
    fallbackLabel?: string;
    variant?: 'bold' | 'caption';
    className?: string;
}) {
    const { t } = useLocale();
    return (
        <Chip
            variant={variant}
            color={orderStatusChipColor(status)}
            data-status={status ?? 'unknown'}
            className={['orders-boardui-status', className]
                .filter(Boolean)
                .join(' ')}
        >
            {status ? orderStatusLabel(status, t) : (fallbackLabel ?? '—')}
        </Chip>
    );
}
