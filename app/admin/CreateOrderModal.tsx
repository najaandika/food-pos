'use client';

type CreateOrderModalProps = {
  guestTotal: number;
  onClose: () => void;
  onCreate: () => void;
  onChangeGuestTotal: (guestTotal: number) => void;
};

export function CreateOrderModal({ guestTotal, onClose, onCreate, onChangeGuestTotal }: CreateOrderModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" role="dialog" aria-modal="true" aria-labelledby="create-order-title" onClick={(event) => event.stopPropagation()}>
        <div className="modal-top">
          <h2 id="create-order-title">Create New Order</h2>
          <button className="close-btn" type="button" onClick={onClose} aria-label="Close">x</button>
        </div>
        <div className="segmented"><button className="segment active" type="button">Dine In</button><button className="segment" type="button">Takeaway</button></div>
        <label className="field-label" htmlFor="customer-name">Customer Name</label>
        <input className="text-field" id="customer-name" type="text" defaultValue="Ariel Hikmat" />
        <div className="field-label">Guest</div>
        <div className="counter-box">
          <button type="button" onClick={() => onChangeGuestTotal(Math.max(1, guestTotal - 1))}>-</button>
          <span>{guestTotal} Person</span>
          <button type="button" onClick={() => onChangeGuestTotal(guestTotal + 1)}>+</button>
        </div>
        <div className="field-label">Choose Table</div>
        <button className="table-box" type="button"><span>A4</span><span>&gt;</span></button>
        <button className="submit-btn" type="button" onClick={onCreate}>Create Order</button>
      </div>
    </div>
  );
}
