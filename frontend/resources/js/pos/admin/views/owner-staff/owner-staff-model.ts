import type { AdminStaff } from '../../runtime-data';
import type { StaffDraft } from './OwnerStaffForm';

export type StaffRole = 'owner' | 'kasir' | 'waiters';

export type StaffRoleFilter = 'all' | StaffRole;

export type StaffStatusFilter = 'all' | 'active' | 'inactive';

export type StaffFormPayload = {
    name: string;
    email: string;
    role: StaffRole;
    password?: string;
    isActive: boolean;
};

export const blankStaff: StaffDraft = {
    name: '',
    email: '',
    role: 'waiters',
    password: '',
    isActive: true,
};

export function draftFromStaff(person: AdminStaff): StaffDraft {
    return {
        name: person.name,
        email: person.email,
        role: person.role,
        password: '',
        isActive: person.isActive,
    };
}

export function payloadFromDraft(draft: StaffDraft): StaffFormPayload {
    return {
        name: draft.name.trim(),
        email: draft.email.trim().toLowerCase(),
        role: draft.role,
        password: draft.password.trim() || undefined,
        isActive: draft.isActive,
    };
}

export const PAGE_SIZE = 8;

export function filterStaffMembers(
    staff: AdminStaff[],
    roleFilter: StaffRoleFilter,
    statusFilter: StaffStatusFilter,
    query: string,
): AdminStaff[] {
    const term = query.trim().toLocaleLowerCase();
    return staff.filter((person) => {
        const matchRole = roleFilter === 'all' || person.role === roleFilter;
        const matchStatus =
            statusFilter === 'all' ||
            person.isActive === (statusFilter === 'active');
        const matchText =
            term.length === 0 ||
            [person.name, person.email, person.roleLabel, person.area]
                .join(' ')
                .toLocaleLowerCase()
                .includes(term);
        return matchRole && matchStatus && matchText;
    });
}
export function paginateStaffMembers(
    filteredStaff: AdminStaff[],
    requestedPage: number,
): { totalPages: number; currentPage: number; visibleStaff: AdminStaff[] } {
    const totalPages = Math.max(1, Math.ceil(filteredStaff.length / PAGE_SIZE));
    const currentPage = Math.min(requestedPage, totalPages);
    const visibleStaff = filteredStaff.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
    );
    return { totalPages, currentPage, visibleStaff };
}
