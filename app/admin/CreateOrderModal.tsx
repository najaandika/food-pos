'use client';

import styles from './styles/Modal.module.css';

type CreateOrderModalProps = {
  guestTotal: number;
  onClose: () => void;
  onCreate: () => void;
  onChangeGuestTotal: (guestTotal: number) => void;
};

export function CreateOrderModal({ guestTotal, onClose, onCreate, onChangeGuestTotal }: CreateOrderModalProps) {
  return (
    <div className={styles['modal-overlay']} onClick={onClose}>
      <div className={styles['modal-box']} role="dialog" aria-modal="true" aria-labelledby="create-order-title" onClick={(event) => event.stopPropagation()}>
        <div className={styles['modal-top']}>
          <h2 id="create-order-title">Create New Order</h2>
          <button className={styles['close-btn']} type="button" onClick={onClose} aria-label="Close">x</button>
        </div>
        <div className={styles.segmented}><button className={`${styles.segment} ${styles.active}`} type="button">Dine In</button><button className={styles.segment} type="button">Takeaway</button></div>
        <label className={styles['field-label']} htmlFor="customer-name">Customer Name</label>
        <input className={styles['text-field']} id="customer-name" type="text" defaultValue="Ariel Hikmat" />
        <div className={styles['field-label']}>Guest</div>
        <div className={styles['counter-box']}>
          <button type="button" onClick={() => onChangeGuestTotal(Math.max(1, guestTotal - 1))}>-</button>
          <span>{guestTotal} Person</span>
          <button type="button" onClick={() => onChangeGuestTotal(guestTotal + 1)}>+</button>
        </div>
        <div className={styles['field-label']}>Choose Table</div>
        <button className={styles['table-box']} type="button"><span>A4</span><span>&gt;</span></button>
        <button className={styles['submit-btn']} type="button" onClick={onCreate}>Create Order</button>
      </div>
    </div>
  );
}
