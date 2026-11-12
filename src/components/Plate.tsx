import { ALL_VISIBLE, type IntervalView, type Visibility } from '@/engine/engine';

export interface PlateProps {
  view: IntervalView;
  visibility?: Visibility;
}

export function Plate({ view, visibility = ALL_VISIBLE }: PlateProps) {
  const cells = [
    { label: '건물', value: visibility.plateBuilding ? `${view.degree}도` : '?' },
    { label: '층', value: visibility.plateFloor ? view.floorLabel : '?' },
    { label: '음정', value: visibility.plateName ? view.name : '?', name: true },
    { label: '간격', value: visibility.plateSemitones ? `${view.semitones}반음` : '?' },
  ];
  return (
    <section className="plate" aria-label="지금 위치">
      {cells.map((cell) => (
        <div className={`cell${cell.name ? ' name' : ''}`} key={cell.label}>
          <span className="k">{cell.label}</span>
          <span className="v">{cell.value}</span>
        </div>
      ))}
    </section>
  );
}

export default Plate;
