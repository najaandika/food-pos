import type { Passkey } from '@/types/auth';

export type Props = {
    canManagePasskeys?: boolean;
    passkeys?: Passkey[];
};

/**
 * Backend passkey routes are disabled in this deployment.
 * Keep the settings component contract without rendering unavailable actions.
 */
export default function ManagePasskeys(_props: Props) {
    return null;
}
