import type { PosSettings, PosStaff } from '@/lib/pos-types';
import type { StaffFormPayload } from './views/owner-staff/owner-staff-model';
import { httpRequest } from '../shared/api/http-client';

export async function loadOwnerStaff(
    signal?: AbortSignal,
): Promise<PosStaff[]> {
    const result = await httpRequest<{ data: PosStaff[] }>('/pos/staff', {
        signal,
    });
    return result.data;
}

export function createOwnerStaff(payload: StaffFormPayload): Promise<PosStaff> {
    return httpRequest<PosStaff>('/pos/staff', {
        method: 'POST',
        payload,
        mutationKey: 'pos:owner-staff:create',
    });
}

export function updateOwnerStaff(
    id: number,
    payload: StaffFormPayload,
): Promise<PosStaff> {
    return httpRequest<PosStaff>(`/pos/staff/${id}`, {
        method: 'PATCH',
        payload,
        mutationKey: `pos:owner-staff:update:${id}`,
    });
}

export function disableOwnerStaff(id: number): Promise<PosStaff> {
    return httpRequest<PosStaff>(`/pos/staff/${id}/disable`, {
        method: 'PATCH',
        mutationKey: `pos:owner-staff:disable:${id}`,
    });
}

export function loadRestaurantSettings(
    signal?: AbortSignal,
): Promise<PosSettings> {
    return httpRequest<PosSettings>('/pos/restaurant-settings', { signal });
}

export function saveRestaurantSettings(
    payload: PosSettings,
): Promise<PosSettings> {
    return httpRequest<PosSettings>('/pos/restaurant-settings', {
        method: 'PUT',
        payload,
        mutationKey: 'pos:restaurant-settings:save',
    });
}
