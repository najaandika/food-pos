import { Form, Head, Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    RiDeleteBin6Line,
    RiEdit2Line,
    RiInformationLine,
    RiMailLine,
    RiShieldUserLine,
    RiLockPasswordLine,
    RiGlobalLine,
} from '@remixicon/react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import profileCover from '@/pages/auth/assets/hero-kitchen.jpg';
import { Avatar } from '../../../../components/base/avatar/avatar';
import { Button } from '../../../../components/base/buttons/button';
import { Input } from '../../../../components/base/input/input';
import {
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
    ModalTrigger,
} from '../../../../components/base/modal/modal';
import type { Auth } from '@/types';
import { send } from '@/routes/verification';
import { edit as securityEdit } from '@/routes/security';
import { useLocale } from '@/pos/admin/i18n-context';
import { cx } from '../../../../utils/cx';

type PageProps = { auth: Auth };

/** Uses the SettingsLayout LocaleProvider so POS/profile share pos-locale state. */
export function AccountLanguagePreferences() {
    const { locale, setLocale } = useLocale();

    return (
        <section
            aria-labelledby="account-preferences-title"
            className="border-border-button-default bg-background-primary-default mt-5 rounded-3xl border p-5 sm:p-6"
        >
            <div className="flex items-start gap-3">
                <div className="bg-background-secondary-default text-foreground-icon-secondary flex size-10 shrink-0 items-center justify-center rounded-xl">
                    <RiGlobalLine className="size-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                    <h2
                        id="account-preferences-title"
                        className="text-title-2-semibold text-text-primary"
                    >
                        Preferensi Akun
                    </h2>
                    <p className="text-body-regular text-text-secondary mt-1">
                        Pilihan pribadi untuk tampilan Food POS di perangkat
                        ini.
                    </p>
                    <div className="mt-5">
                        <h3
                            id="account-language-title"
                            className="text-body-semibold text-text-primary"
                        >
                            Bahasa Antarmuka
                        </h3>
                        <p className="text-body-regular text-text-secondary mt-1">
                            Bahasa navigasi dan menu aplikasi. Konten profil
                            lainnya belum sepenuhnya diterjemahkan.
                        </p>
                        <div
                            role="group"
                            aria-labelledby="account-language-title"
                            className="border-border-button-default bg-background-secondary-default mt-3 inline-flex max-w-full flex-wrap gap-1 rounded-xl border p-1"
                        >
                            {(
                                [
                                    { code: 'id', label: 'Indonesia' },
                                    { code: 'en', label: 'English' },
                                ] as const
                            ).map(({ code, label }) => (
                                <button
                                    key={code}
                                    type="button"
                                    aria-pressed={locale === code}
                                    className={cx(
                                        'text-body-medium focus-visible:ring-border-focus-ring inline-flex min-h-10 items-center justify-center rounded-lg px-4 outline-none transition-colors focus-visible:ring-2',
                                        locale === code
                                            ? 'border-border-button-default bg-background-primary-default text-text-primary border shadow-xs'
                                            : 'text-text-secondary hover:bg-background-secondary-hover border border-transparent',
                                    )}
                                    onClick={() => setLocale(code)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        <p
                            role="status"
                            className="text-body-2-regular text-text-secondary mt-3"
                        >
                            {locale === 'id'
                                ? 'Bahasa Indonesia dipilih untuk navigasi Food POS.'
                                : 'English is selected for Food POS navigation.'}
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage<PageProps>().props;
    const [editing, setEditing] = useState(false);
    const [saved, setSaved] = useState(false);
    const name = auth.user.name || 'Pengguna Food POS';
    const initials = name
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    const role =
        auth.user.role === 'owner'
            ? 'Owner'
            : auth.user.role === 'kasir'
              ? 'Kasir'
              : auth.user.role === 'waiters'
                ? 'Waiters'
                : 'Pengguna';
    const joinedDate = auth.user.created_at
        ? new Date(auth.user.created_at)
        : null;
    const joined =
        joinedDate && !Number.isNaN(joinedDate.getTime())
            ? new Intl.DateTimeFormat('id-ID', {
                  month: 'long',
                  year: 'numeric',
              }).format(joinedDate)
            : 'Belum tersedia';
    const emailStatus = !mustVerifyEmail
        ? 'Tidak diwajibkan'
        : auth.user.email_verified_at
          ? 'Terverifikasi'
          : 'Belum terverifikasi';

    return (
        <>
            <Head title="Profil Akun" />
            <section
                aria-label="Ringkasan profil"
                className="border-border-button-default bg-background-primary-default overflow-hidden rounded-3xl border"
            >
                <div className="bg-background-secondary-default relative h-44 overflow-hidden sm:h-48">
                    <img
                        src={profileCover}
                        alt=""
                        aria-hidden="true"
                        className="size-full object-cover object-[center_55%]"
                    />
                    <div
                        className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/20 via-transparent to-black/10"
                        aria-hidden="true"
                    />
                </div>
                <div className="relative px-5 pb-6 sm:px-6">
                    <div className="-mt-9 flex flex-wrap items-end justify-between gap-3">
                        <Avatar
                            size="lg"
                            color="blue"
                            src={auth.user.avatar || undefined}
                            initials={initials || 'FP'}
                            className="ring-background-primary-default size-[74px]! text-[28px]! shadow-sm ring-[5px]"
                        />
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                            <Link
                                href={securityEdit()}
                                className="border-border-button-default bg-background-primary-default text-body-medium text-text-primary hover:bg-background-primary-hover focus-visible:ring-border-focus-ring inline-flex h-8 items-center gap-1 rounded-lg border px-2 shadow-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                            >
                                <RiShieldUserLine
                                    className="size-[18px]"
                                    aria-hidden="true"
                                />
                                <span className="px-0.5">Keamanan</span>
                            </Link>
                            <Button
                                variant="secondary"
                                size="small"
                                leadingIcon={RiEdit2Line}
                                aria-expanded={editing}
                                aria-controls="profile-edit-panel"
                                onClick={() => {
                                    setSaved(false);
                                    setEditing((value) => !value);
                                }}
                            >
                                {editing ? 'Tutup edit' : 'Edit profil'}
                            </Button>
                        </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <h1 className="text-title-2-semibold text-text-primary min-w-0 break-words">
                            {name}
                        </h1>
                        <span className="bg-background-secondary-default text-caption-1-medium text-text-secondary rounded-sm px-2 py-0.5">
                            {role}
                        </span>
                    </div>
                    <p className="text-body-regular text-text-secondary mt-1 flex min-w-0 items-start gap-2">
                        <RiMailLine
                            className="mt-0.5 size-4 shrink-0"
                            aria-hidden="true"
                        />
                        <span className="min-w-0 break-all">
                            {auth.user.email}
                        </span>
                    </p>
                    <p className="text-body-regular text-text-tertiary mt-3">
                        Profil pengguna untuk mengakses Food POS.
                    </p>
                    <dl className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <div className="bg-background-secondary-default rounded-xl px-3 py-3">
                            <dt className="text-caption-1-regular text-text-secondary">
                                Peran akun
                            </dt>
                            <dd className="text-body-semibold text-text-primary mt-1">
                                {role}
                            </dd>
                        </div>
                        <div className="bg-background-secondary-default rounded-xl px-3 py-3">
                            <dt className="text-caption-1-regular text-text-secondary">
                                Status email
                            </dt>
                            <dd className="text-body-semibold text-text-primary mt-1">
                                {emailStatus}
                            </dd>
                        </div>
                        <div className="bg-background-secondary-default rounded-xl px-3 py-3">
                            <dt className="text-caption-1-regular text-text-secondary">
                                Bergabung
                            </dt>
                            <dd className="text-body-semibold text-text-primary mt-1">
                                {joined}
                            </dd>
                        </div>
                    </dl>
                </div>
            </section>

            {saved && (
                <p
                    role="status"
                    className="border-border-button-default bg-background-secondary-default text-body-medium text-text-primary mt-4 rounded-xl border px-4 py-3"
                >
                    Perubahan profil berhasil disimpan.
                </p>
            )}

            {mustVerifyEmail && auth.user.email_verified_at === null && (
                <section className="border-separator-border bg-background-secondary-default mt-4 flex items-start gap-3 rounded-2xl border p-4">
                    <RiInformationLine
                        className="text-foreground-icon-secondary mt-0.5 size-5 shrink-0"
                        aria-hidden="true"
                    />
                    <div className="text-body-regular text-text-secondary">
                        <p>Email belum terverifikasi.</p>
                        <Link
                            href={send()}
                            as="button"
                            className="text-text-primary mt-1 underline underline-offset-4"
                        >
                            Kirim ulang email verifikasi
                        </Link>
                        {status === 'verification-link-sent' && (
                            <p className="mt-2" role="status">
                                Tautan verifikasi telah dikirim.
                            </p>
                        )}
                    </div>
                </section>
            )}

            {editing && (
                <section
                    id="profile-edit-panel"
                    aria-label="Form edit profil"
                    className="bg-background-secondary-default mt-5 rounded-3xl p-5 sm:p-6"
                >
                    <div className="mb-5">
                        <h2 className="text-title-2-semibold text-text-primary">
                            Edit profil
                        </h2>
                        <p className="text-body-regular text-text-secondary mt-1">
                            Perbarui nama dan alamat email untuk akun loginmu.
                        </p>
                    </div>
                    <Form
                        {...ProfileController.update.form()}
                        options={{ preserveScroll: true }}
                        onSuccess={() => {
                            setEditing(false);
                            setSaved(true);
                        }}
                        className="flex max-w-xl flex-col gap-4"
                    >
                        {({ processing, errors }) => (
                            <>
                                <Input
                                    name="name"
                                    label="Nama lengkap"
                                    placeholder="Nama lengkap"
                                    defaultValue={auth.user.name}
                                    autoComplete="name"
                                    isRequired
                                    isInvalid={Boolean(errors.name)}
                                    errorMessage={errors.name}
                                />
                                <Input
                                    name="email"
                                    type="email"
                                    label="Alamat email"
                                    placeholder="email@restoran.com"
                                    defaultValue={auth.user.email}
                                    autoComplete="username"
                                    isRequired
                                    isInvalid={Boolean(errors.email)}
                                    errorMessage={errors.email}
                                />

                                <div className="border-separator-border flex flex-wrap justify-end gap-2 border-t pt-5">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        disabled={processing}
                                        onClick={() => setEditing(false)}
                                    >
                                        Batal
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        data-test="update-profile-button"
                                    >
                                        {processing
                                            ? 'Menyimpan…'
                                            : 'Simpan profil'}
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                </section>
            )}

            <AccountLanguagePreferences />

            <section className="bg-background-secondary-default mt-5 rounded-3xl p-5 sm:p-6">
                <div className="flex items-start gap-3">
                    <div className="bg-background-primary-default text-foreground-icon-secondary flex size-10 shrink-0 items-center justify-center rounded-xl">
                        <RiLockPasswordLine
                            className="size-5"
                            aria-hidden="true"
                        />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-title-2-semibold text-text-primary">
                            Keamanan akun
                        </h2>
                        <p className="text-body-regular text-text-secondary mt-1">
                            Kelola kata sandi dan autentikasi dua faktor pada
                            halaman terpisah.
                        </p>
                        <Link
                            href={securityEdit()}
                            className="border-border-button-default bg-background-primary-default text-body-medium text-text-primary hover:bg-background-primary-hover focus-visible:ring-border-focus-ring rounded-2lg mt-4 inline-flex h-9 items-center gap-2 border px-3 shadow-xs transition-colors outline-none focus-visible:ring-2"
                        >
                            <RiShieldUserLine
                                className="size-5"
                                aria-hidden="true"
                            />
                            Buka keamanan akun
                        </Link>
                    </div>
                </div>
            </section>

            <section className="border-border-button-default bg-background-primary-default mt-6 rounded-3xl border p-5 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-lg">
                        <h3 className="text-headline-medium text-text-primary">
                            Hapus akun
                        </h3>
                        <p className="text-body-regular text-text-secondary mt-2">
                            Penghapusan bersifat permanen. Pastikan kamu sudah
                            memahami konsekuensinya sebelum melanjutkan.
                        </p>
                    </div>
                    <ModalTrigger>
                        <Button
                            variant="danger"
                            leadingIcon={RiDeleteBin6Line}
                            data-test="delete-user-button"
                        >
                            Hapus akun
                        </Button>
                        <Modal
                            role="alertdialog"
                            size="md"
                            isDismissable={false}
                        >
                            {({ close }) => (
                                <>
                                    <ModalHeader
                                        icon={RiDeleteBin6Line}
                                        tone="danger"
                                        title="Hapus akun secara permanen?"
                                        description="Masukkan kata sandi untuk mengonfirmasi tindakan ini. Semua data akun yang terkait akan dihapus dan tindakan ini tidak dapat dibatalkan."
                                    />
                                    <Form
                                        {...ProfileController.destroy.form()}
                                        options={{ preserveScroll: true }}
                                        resetOnSuccess
                                    >
                                        {({
                                            processing,
                                            errors,
                                            resetAndClearErrors,
                                        }) => (
                                            <>
                                                <ModalBody>
                                                    <Input
                                                        name="password"
                                                        type="password"
                                                        label="Kata sandi akun"
                                                        placeholder="Kata sandi saat ini"
                                                        autoComplete="current-password"
                                                        isRequired
                                                        isInvalid={Boolean(
                                                            errors.password,
                                                        )}
                                                        errorMessage={
                                                            errors.password
                                                        }
                                                    />
                                                </ModalBody>
                                                <ModalFooter>
                                                    <Button
                                                        variant="secondary"
                                                        onClick={() => {
                                                            resetAndClearErrors();
                                                            close();
                                                        }}
                                                    >
                                                        Batal
                                                    </Button>
                                                    <Button
                                                        type="submit"
                                                        variant="danger"
                                                        disabled={processing}
                                                        data-test="confirm-delete-user-button"
                                                    >
                                                        {processing
                                                            ? 'Menghapus…'
                                                            : 'Hapus akun'}
                                                    </Button>
                                                </ModalFooter>
                                            </>
                                        )}
                                    </Form>
                                </>
                            )}
                        </Modal>
                    </ModalTrigger>
                </div>
            </section>
        </>
    );
}
