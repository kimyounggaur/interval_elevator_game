import type { CSSProperties } from 'react';
import {
  ALL_VISIBLE,
  buildingFloors,
  describe,
  familyOf,
  type Degree,
  type Note,
  type TutorialFocus,
  type Visibility,
} from '@/engine/engine';

export interface BuildingProps {
  degree: Degree;
  base: Note;
  floor: number;
  open: [number, number];
  visibility?: Visibility;
  focus?: TutorialFocus | boolean;
}

/** Floors use the engine's array indexes; the printed labels deliberately skip 0. */
export function Building({ degree, base, floor, open, visibility = ALL_VISIBLE, focus }: BuildingProps) {
  const [lowest, highest] = buildingFloors(degree);
  const floors = Array.from({ length: highest - lowest + 1 }, (_, index) => highest - index);
  const current = describe(degree, base, floor);
  const isPerfect = familyOf(degree) === 'perfect';
  const focused = focus === true || focus === 'building';
  const style = { '--r': highest - floor } as CSSProperties;

  return (
    <section
      className={`building${isPerfect ? ' fifth' : ''}${focused ? ' tutorial-focus' : ''}`}
      aria-label={visibility.buildingName ? `${degree}도 건물` : '건물'}
      data-degree={visibility.buildingName ? degree : undefined}
    >
      <header className="plaque">
        <strong>{visibility.buildingName ? `${degree}도 건물` : '? 건물'}</strong>
        <span>{visibility.buildingName ? (isPerfect ? '완전 계열' : '장·단 계열') : '?'}</span>
      </header>
      {visibility.buildingName && <div className="building-art" aria-hidden="true" />}
      <div className="shaftwrap">
        <ol className="floors" style={{ gridTemplateRows: `repeat(${floors.length}, var(--row))` }}>
          {floors.map((index) => {
            const view = describe(degree, base, index);
            const locked = index < open[0] || index > open[1];
            const selected = visibility.car && index === floor;
            const classes = [
              'floor',
              view.floorLabel.startsWith('B') ? 'under' : '',
              view.floorLabel === 'B1' ? 'ground' : '',
              locked ? 'locked' : '',
              selected ? 'current' : '',
            ].filter(Boolean).join(' ');
            return (
              <li className={classes} key={index} aria-current={selected ? 'location' : undefined}>
                <span className="num" aria-label={view.floorLongLabel}>{view.floorLabel}</span>
                <span className="nm">{locked ? '잠김' : visibility.floorNames ? view.name : '?'}</span>
                <span className="st" aria-label={locked ? '잠김' : visibility.floorSemitones ? `${view.semitones}반음` : '간격 미공개'}>
                  {locked ? '잠김' : visibility.floorSemitones ? view.semitones : '?'}
                </span>
              </li>
            );
          })}
        </ol>
        {visibility.car && (
          <div className="car" style={style} role="img" aria-label={`엘리베이터, ${current.floorLongLabel}`} />
        )}
      </div>
      <p className="cap">한 층 이동 = 반음 하나</p>
    </section>
  );
}

export default Building;
