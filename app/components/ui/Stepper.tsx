import styles from './Stepper.module.css';

type StepperProps = {
  value: number;
  label: string;
  onDecrement: () => void;
  onIncrement: () => void;
  className?: string;
};

export function Stepper({ value, label, onDecrement, onIncrement, className }: StepperProps) {
  const classes = [styles.stepper, className].filter(Boolean).join(' ');

  return (
    <div className={classes} aria-label={`${label} quantity`}>
      <button className={styles.button} type="button" aria-label={`Remove ${label}`} onClick={onDecrement}>-</button>
      <b className={styles.value}>{value}</b>
      <button className={styles.button} type="button" aria-label={`Add ${label}`} onClick={onIncrement}>+</button>
    </div>
  );
}
