type StepperProps = {
  value: number;
  label: string;
  onDecrement: () => void;
  onIncrement: () => void;
  className?: string;
};

export function Stepper({ value, label, onDecrement, onIncrement, className }: StepperProps) {
  const classes = className ? `ui-stepper ${className}` : 'ui-stepper';

  return (
    <div className={classes} aria-label={`${label} quantity`}>
      <button className="ui-stepper__button" type="button" aria-label={`Remove ${label}`} onClick={onDecrement}>-</button>
      <b className="ui-stepper__value">{value}</b>
      <button className="ui-stepper__button" type="button" aria-label={`Add ${label}`} onClick={onIncrement}>+</button>
    </div>
  );
}
