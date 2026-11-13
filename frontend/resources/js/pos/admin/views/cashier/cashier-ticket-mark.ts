/** A compact visual cue for the fixed-size Cashier avatar.
 * The full immutable order number remains in the adjacent accessible text/title. */
export function cashierTicketMark(orderNumber?: string): string {
    if (!orderNumber) return '—';

    const suffix = orderNumber.split('-').at(-1);
    if (suffix && /^\d{1,4}$/.test(suffix)) return `#${suffix}`;
    if (orderNumber.length <= 6) return orderNumber;

    return `…${orderNumber.slice(-3)}`;
}
