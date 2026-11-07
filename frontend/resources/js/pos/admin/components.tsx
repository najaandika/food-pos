import { useState } from 'react';
import {
    RiArrowDownSLine as ChevronDown,
    RiLogoutBoxRLine as LogOut,
    RiCloseLine as X,
} from '@remixicon/react';
import { roleLabel, type AuthUser } from './auth';
import { useLocale } from './i18n-context';
import styles from './styles/Modal.module.css';

export function AdminTitle({
    title,
    subtitle,
    user,
    onLogout,
}: {
    title: string;
    subtitle: string;
    user?: AuthUser;
    onLogout?: () => void;
}) {
    const [showModal, setShowModal] = useState(false);

    return (
        <div className="admin-title-wrap">
            <div className="admin-title">
                <h1>{title}</h1>
                <p>{subtitle}</p>
            </div>
            {user && (
                <>
                    <button
                        type="button"
                        className="topbar-profile-badge"
                        onClick={() => setShowModal(true)}
                        aria-label="User profile and shift info"
                        title={`${user.name} (${roleLabel(user.role)})`}
                    >
                        <div className="profile-initial">
                            {user.name.charAt(0)}
                        </div>
                    </button>

                    {showModal && (
                        <UserProfileModal
                            user={user}
                            onClose={() => setShowModal(false)}
                            onLogout={onLogout}
                        />
                    )}
                </>
            )}
        </div>
    );
}

export function UserProfileModal({
    user,
    onClose,
    onLogout,
}: {
    user: AuthUser;
    onClose: () => void;
    onLogout?: () => void;
}) {
    const { t } = useLocale();

    return (
        <div className={styles['modal-overlay']} onClick={onClose}>
            <div
                className={`profile-quick-modal ${styles['modal-box']}`}
                role="dialog"
                aria-modal="true"
                onClick={(event) => event.stopPropagation()}
            >
                <div className={styles['modal-top']}>
                    <h2>{t('profile.title')}</h2>
                    <button
                        className={styles['close-btn']}
                        type="button"
                        onClick={onClose}
                        aria-label={t('common.close')}
                    >
                        <X />
                    </button>
                </div>

                <div className="profile-modal-user">
                    <div className="profile-modal-avatar">
                        <span>{user.name.charAt(0)}</span>
                    </div>
                    <div className="profile-modal-info">
                        <h3>{user.name}</h3>
                        <span className="profile-role-pill">
                            {roleLabel(user.role)}
                        </span>
                        <small>{user.email}</small>
                    </div>
                </div>

                <div className="profile-shift-box">
                    <div className="shift-row">
                        <span>{t('profile.shiftStatus')}</span>
                        <strong>{t('profile.eveningShiftActive')}</strong>
                    </div>
                    <div className="shift-row">
                        <span>{t('profile.outletLocation')}</span>
                        <strong>POS</strong>
                    </div>
                </div>

                <div className="profile-modal-actions">
                    {onLogout && (
                        <button
                            className="logout-action-btn"
                            type="button"
                            onClick={onLogout}
                        >
                            <LogOut />
                            <span>{t('profile.logoutLabel')}</span>
                        </button>
                    )}
                    <button
                        className="close-action-btn"
                        type="button"
                        onClick={onClose}
                    >
                        {t('common.close')}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function MockSelect({
    value,
    options,
    onChange,
}: {
    value: string;
    options: string[];
    onChange?: (value: string) => void;
}) {
    return (
        <details className="custom-select">
            <summary>
                <span>{value}</span>
                <ChevronDown aria-hidden="true" />
            </summary>
            <div className="custom-select-options">
                {options.map((option) => (
                    <button
                        className={option === value ? 'active' : ''}
                        type="button"
                        key={option}
                        onClick={(event) => {
                            onChange?.(option);
                            event.currentTarget
                                .closest('details')
                                ?.removeAttribute('open');
                        }}
                    >
                        {option}
                    </button>
                ))}
            </div>
        </details>
    );
}
