'use client';
import { useId } from 'react';
import styles from './CheckboxGroup.module.css';

interface CheckboxGroupProps<T extends string> {
  legend: string;
  options: readonly { value: T; label: string }[];
  selected: readonly T[];
  onToggle: (value: T, selected: boolean) => void;
  note?: string;
}

export default function CheckboxGroup<T extends string>({
  legend,
  options,
  selected,
  onToggle,
  note,
}: CheckboxGroupProps<T>) {
  const noteId = `${useId()}-note`;

  return (
    <fieldset className={styles.group} aria-describedby={note ? noteId : undefined}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.options}>
        {options.map(({ value, label }) => (
          <label key={value} className={styles.option}>
            <input
              type="checkbox"
              checked={selected.includes(value)}
              onChange={(event) => onToggle(value, event.target.checked)}
            />
            {label}
          </label>
        ))}
      </div>
      {note && (
        <p className={styles.note} id={noteId}>
          {note}
        </p>
      )}
    </fieldset>
  );
}
