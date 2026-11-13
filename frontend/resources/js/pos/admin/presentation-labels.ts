/**
 * UI-only aliases for pre-existing local training records.
 *
 * Keep the original backend identifiers, email addresses, QR codes,
 * invoice/receipt references and route payloads unchanged. These labels
 * are for navigation cards and previews only, never database mutations.
 */
export function displayOrderReference(
    value: string | null | undefined,
): string {
    return (value ?? '').replace(/^DEMO-/i, 'LAT-');
}

export function displayTableReference(
    value: string | null | undefined,
): string {
    return (value ?? '').replace(/^DEMO-T/i, 'LAT-T');
}

export function displayStaffName(name: string, email?: string | null): string {
    if (!email?.toLowerCase().endsWith('.demo@example.test')) return name;
    const withoutMarker = name.replace(/\s+Demo\b/gi, '').trim();
    return (withoutMarker || name) + ' (Latihan)';
}
