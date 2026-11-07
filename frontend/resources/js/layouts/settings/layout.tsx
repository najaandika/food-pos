import { Link, router, usePage } from "@inertiajs/react";
import { useState, type PropsWithChildren } from "react";
import { RiArrowLeftLine, RiMenu2Line, RiShieldUserLine, RiUser3Line } from "@remixicon/react";
import { IconButton } from "../../../../components/base/buttons/icon-button";
import { AdminSidebar } from "@/pos/admin/shell/official-sidebar";
import { LocaleProvider } from "@/pos/admin/i18n-context";
import { canAccessView, getRoleHome, type AuthUser } from "@/pos/admin/auth";
import { viewHref } from "@/pos/admin/navigation";
import type { UserRole } from "@/lib/pos-types";
import { edit as profileEdit } from "@/routes/profile";
import { edit as securityEdit } from "@/routes/security";
import "@/pos/styles/pos.css";

type AuthProps = { auth?: { user?: Partial<AuthUser> } };

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { props, url } = usePage<AuthProps>();
    const auth = props.auth?.user;
    const role: UserRole =
        auth?.role === "owner" || auth?.role === "kasir" || auth?.role === "waiters"
            ? auth.role
            : "waiters";
    const user: AuthUser = {
        id: typeof auth?.id === "number" ? auth.id : 0,
        name: auth?.name || "Food POS",
        email: auth?.email || "",
        role,
    };
    const [collapsed, setCollapsed] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const isSecurity = url.split("?")[0].startsWith("/settings/security");

    const navigateToPos = (view: Parameters<typeof canAccessView>[1]) => {
        if (!canAccessView(role, view)) return;
        setDrawerOpen(false);
        router.visit(viewHref(view));
    };

    return (
        <LocaleProvider>
            <div
                className={
                    "page-shell pos-shell-layout bg-background-full flex min-h-dvh" +
                    (collapsed ? " sidebar-collapsed" : "") +
                    (drawerOpen ? " mobile-sidebar-open" : "")
                }
            >
                <AdminSidebar
                    activeView={isSecurity ? "security" : "profile"}
                    collapsed={collapsed}
                    drawerOpen={drawerOpen}
                    user={user}
                    onToggleCollapsed={() => setCollapsed((value) => !value)}
                    onChangeView={navigateToPos}
                    onCloseMobileDrawer={() => setDrawerOpen(false)}
                    onLogout={() => router.post("/logout")}
                />

                <main className="main-panel pos-boardui-account-panel min-w-0 flex-1 px-4 pt-4 pb-12 sm:px-7 lg:px-10">
                    <header className="pos-shell-topbar border-separator-border mb-8 flex items-center justify-between gap-3 border-b pb-4">
                        <div className="flex min-w-0 items-center gap-3">
                            <IconButton
                                icon={RiMenu2Line}
                                size="medium"
                                className="pos-shell-mobile-menu-trigger"
                                aria-label="Buka menu navigasi"
                                aria-controls="pos-mobile-drawer"
                                aria-expanded={drawerOpen}
                                onClick={() => setDrawerOpen(true)}
                            />
                            <span className="text-body-medium text-text-tertiary">Food POS</span>
                            <span className="text-text-tertiary" aria-hidden="true">
                                /
                            </span>
                            <span className="text-body-medium text-text-primary truncate">
                                {isSecurity ? "Keamanan Akun" : "Profil Akun"}
                            </span>
                        </div>
                        <Link
                            href={viewHref(getRoleHome(role))}
                            className="text-body-medium text-text-secondary hover:text-text-primary focus-visible:ring-border-focus-ring inline-flex shrink-0 items-center gap-2 rounded-lg px-2 py-1.5 outline-none focus-visible:ring-2"
                        >
                            <RiArrowLeftLine className="size-4" aria-hidden="true" />
                            <span className="hidden sm:inline">Kembali ke POS</span>
                            <span className="sm:hidden">Kembali</span>
                        </Link>
                    </header>

                    <div
                        className={"mx-auto w-full " + (isSecurity ? "max-w-4xl" : "max-w-[760px]")}
                    >
                        {isSecurity && (
                            <div className="mb-7">
                                <span className="text-caption-1-semibold text-text-tertiary tracking-wide uppercase">
                                    Pengaturan akun
                                </span>
                                <h1 className="text-title-2-medium text-text-primary mt-2">
                                    {isSecurity ? "Keamanan Akun" : "Profil Akun"}
                                </h1>
                                <p className="text-body-regular text-text-secondary mt-2">
                                    {isSecurity
                                        ? "Kelola kata sandi dan perlindungan akun yang kamu gunakan untuk masuk ke Food POS."
                                        : "Kelola identitas pengguna yang dipakai untuk masuk ke Food POS. Pengaturan operasional restoran tersedia terpisah untuk Owner."}
                                </p>
                            </div>
                        )}

                        {isSecurity && (
                            <nav
                                className="border-separator-border mb-6 flex flex-wrap gap-2 border-b pb-3"
                                aria-label="Navigasi akun"
                            >
                                <Link
                                    href={profileEdit()}
                                    aria-current={!isSecurity ? "page" : undefined}
                                    className={
                                        "text-body-medium focus-visible:ring-border-focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-2 outline-none focus-visible:ring-2 " +
                                        (!isSecurity
                                            ? "bg-background-secondary-hover text-text-primary"
                                            : "text-text-secondary hover:bg-background-secondary-hover")
                                    }
                                >
                                    <RiUser3Line className="size-5" aria-hidden="true" />
                                    Profil
                                </Link>
                                <Link
                                    href={securityEdit()}
                                    aria-current={isSecurity ? "page" : undefined}
                                    className={
                                        "text-body-medium focus-visible:ring-border-focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-2 outline-none focus-visible:ring-2 " +
                                        (isSecurity
                                            ? "bg-background-secondary-hover text-text-primary"
                                            : "text-text-secondary hover:bg-background-secondary-hover")
                                    }
                                >
                                    <RiShieldUserLine className="size-5" aria-hidden="true" />
                                    Keamanan
                                </Link>
                            </nav>
                        )}

                        {children}
                    </div>
                </main>
            </div>
        </LocaleProvider>
    );
}
