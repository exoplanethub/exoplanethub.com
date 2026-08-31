'use client';
import { useId, useMemo } from 'react';
import { Range, isRangeActive, parseBound } from '@/lib/planetFilters';
import { logScale, toSignificantDigits } from './logScale';
import styles from './RangeFilter.module.css';

// A dragged thumb parks at its neighbour rather than crossing it. Typed bounds are taken
// literally instead, so the number inputs still accept a crossed pair and match nothing.
function withUncrossedBound(range: Range, edge: 'min' | 'max', next: number): Range {
  return edge === 'min'
    ? { ...range, min: range.max === null ? next : Math.min(next, range.max) }
    : { ...range, max: range.min === null ? next : Math.max(next, range.min) };
}

interface RangeFilterProps {
  label: string;
  unit: string;
  missingNote: string;
  extent: Range;
  value: Range;
  onChange: (next: Range) => void;
}

export default function RangeFilter({
  label,
  unit,
  missingNote,
  extent,
  value,
  onChange,
}: RangeFilterProps) {
  const ids = useId();
  const scale = useMemo(() => logScale(extent), [extent]);

  const noteId = `${ids}-note`;
  const describedBy = isRangeActive(value) ? noteId : undefined;

  // parseBound also guards the URL, where a non-numeric bound invalidates the whole range; a
  // type="number" input can only hand back '' or a number, so undefined here just means unset.
  const setBound = (edge: 'min' | 'max', raw: string) =>
    onChange({ ...value, [edge]: parseBound(raw) ?? null });

  const extentText = {
    min: scale ? String(toSignificantDigits(scale.min)) : '',
    max: scale ? String(toSignificantDigits(scale.max)) : '',
  };

  // Crossed bounds match nothing, and thumbs drawn from them read as the range they swap into.
  const crossed = value.min !== null && value.max !== null && value.min > value.max;

  const thumbs =
    scale && !crossed
      ? {
          steps: scale.steps,
          toValue: scale.toValue,
          lower: scale.toPosition(value.min ?? scale.min),
          upper: scale.toPosition(value.max ?? scale.max),
        }
      : null;

  // Both thumbs stack at the top of the track, and only the lower one has anywhere to go, so it
  // has to out-paint the upper to be draggable at all.
  const raiseLowerThumb = thumbs !== null && thumbs.lower === thumbs.steps;

  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>
        {label} <span className={styles.unit}>({unit})</span>
      </legend>

      <div className={styles.bounds}>
        <label className={styles.boundLabel} htmlFor={`${ids}-min`}>
          Min
        </label>
        <input
          id={`${ids}-min`}
          type="number"
          className={styles.number}
          value={value.min ?? ''}
          placeholder={extentText.min}
          aria-describedby={describedBy}
          onChange={(event) => setBound('min', event.target.value)}
        />
        <label className={styles.boundLabel} htmlFor={`${ids}-max`}>
          Max
        </label>
        <input
          id={`${ids}-max`}
          type="number"
          className={styles.number}
          value={value.max ?? ''}
          placeholder={extentText.max}
          aria-describedby={describedBy}
          onChange={(event) => setBound('max', event.target.value)}
        />
      </div>

      {scale && (
        <div className={styles.track}>
          {thumbs && (
            <>
              <input
                type="range"
                className={styles.thumb}
                style={raiseLowerThumb ? { zIndex: 1 } : undefined}
                aria-label={`${label} lower bound`}
                aria-valuetext={`${value.min ?? extentText.min} ${unit}`}
                aria-describedby={describedBy}
                min={0}
                max={thumbs.steps}
                value={thumbs.lower}
                onChange={(event) =>
                  onChange(
                    withUncrossedBound(value, 'min', thumbs.toValue(Number(event.target.value)))
                  )
                }
              />
              <input
                type="range"
                className={styles.thumb}
                aria-label={`${label} upper bound`}
                aria-valuetext={`${value.max ?? extentText.max} ${unit}`}
                aria-describedby={describedBy}
                min={0}
                max={thumbs.steps}
                value={thumbs.upper}
                onChange={(event) =>
                  onChange(
                    withUncrossedBound(value, 'max', thumbs.toValue(Number(event.target.value)))
                  )
                }
              />
            </>
          )}
        </div>
      )}

      {describedBy && (
        <p className={styles.note} id={noteId}>
          {missingNote}
        </p>
      )}
    </fieldset>
  );
}
