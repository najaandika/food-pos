import { useState } from 'react';
import { RiCheckboxCircleLine } from '@remixicon/react';
import { Chip } from '../../../../../../components/base/badges/chip';
import { Button } from '../../../../../../components/base/buttons/button';
import { cx } from '../../../../../../utils/cx';
import { useLocale } from '../../i18n-context';
import type { AttentionItem } from './waiter-model';

type AttentionRequestsProps = {
    attentions: AttentionItem[];
    isSaving: boolean;
    onAttention: (item: AttentionItem) => void;
};

export function AttentionRequests({
    attentions,
    isSaving,
    onAttention,
}: AttentionRequestsProps) {
    const { t, locale } = useLocale();
    const isId = locale === 'id';
    const [showAllRequests, setShowAllRequests] = useState(false);

    return (
        <section
            className="waiters-boardui-panel waiters-requests-section"
            aria-labelledby="waiters-requests-heading"
        >
            <div className="waiters-section-head text-body-2-regular">
                <div>
                    <p className="waiters-section-label text-caption-2-semibold">
                        {isId
                            ? 'PRIORITAS OPERASIONAL'
                            : 'OPERATIONAL PRIORITY'}
                    </p>
                    <h2
                        id="waiters-requests-heading"
                        className="text-title-3-semibold"
                    >
                        {t('waiters.customerRequests')}
                    </h2>
                    <p>
                        {isId
                            ? 'Tangani panggilan, hidangan siap, dan permintaan pembayaran lebih dulu.'
                            : 'Handle calls, ready meals, and payment requests first.'}
                    </p>
                </div>
                <Chip
                    variant="caption"
                    color={attentions.length ? 'rose' : 'lime'}
                >
                    {attentions.length}{' '}
                    {isId ? 'perlu perhatian' : 'needs attention'}
                </Chip>
            </div>
            {attentions.length ? (
                <div className="waiters-attention-list">
                    {attentions.map((item, index) => (
                        <article
                            className={cx(
                                'waiters-attention-row',
                                'tone-' + item.kind,
                                index >= 3 &&
                                    !showAllRequests &&
                                    'is-mobile-collapsed',
                            )}
                            key={item.key}
                        >
                            <span className="waiters-attention-table text-body-semibold">
                                {item.code}
                            </span>
                            <div className="waiters-attention-copy">
                                <Chip
                                    color={
                                        item.kind === 'call'
                                            ? 'rose'
                                            : item.kind === 'ready'
                                              ? 'lime'
                                              : 'yellow'
                                    }
                                    variant="caption"
                                >
                                    {item.kind === 'call'
                                        ? t('waiters.customerCalls')
                                        : item.kind === 'ready'
                                          ? t('dashboard.ready')
                                          : t('orders.billing')}
                                </Chip>
                                <strong className="text-body-semibold">
                                    {item.title}
                                </strong>
                                <span className="text-caption-1-regular">
                                    {item.time}
                                </span>
                            </div>
                            <Button
                                size="small"
                                variant={
                                    item.kind === 'bill'
                                        ? 'secondary'
                                        : 'primary'
                                }
                                disabled={isSaving}
                                onClick={() => onAttention(item)}
                            >
                                {item.kind === 'call'
                                    ? isId
                                        ? 'Tangani'
                                        : 'Handle'
                                    : item.kind === 'ready'
                                      ? t('waiters.serve')
                                      : t('common.details')}
                            </Button>
                        </article>
                    ))}
                    {attentions.length > 3 && (
                        <Button
                            variant="secondary"
                            size="small"
                            className="waiters-attention-more"
                            onClick={() =>
                                setShowAllRequests((current) => !current)
                            }
                            aria-expanded={showAllRequests}
                        >
                            {showAllRequests
                                ? isId
                                    ? 'Tampilkan lebih sedikit'
                                    : 'Show less'
                                : isId
                                  ? 'Lihat semua permintaan'
                                  : 'Show all requests'}
                        </Button>
                    )}
                </div>
            ) : (
                <div className="waiters-boardui-empty text-body-2-regular">
                    <RiCheckboxCircleLine aria-hidden="true" />
                    <p>{t('waiters.noRequests')}</p>
                </div>
            )}
        </section>
    );
}
