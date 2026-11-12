import { buildingFloors, type Degree } from '@/engine/engine';
export function MoveButtons({ degree, floor, open, onMove, disabled = false, onArrive, arriveDisabled = false }: { degree: Degree; floor: number; open: [number, number]; onMove: (dir: 1 | -1) => void; disabled?: boolean; onArrive?: () => void; arriveDisabled?: boolean }) {
  const physical = buildingFloors(degree);
  const why = (dir: -1 | 1) => {
    if (dir === -1 && floor <= open[0]) return floor === physical[0] ? '건물의 맨 아래층이에요' : '아래층은 아직 잠겨 있어요';
    if (dir === 1 && floor >= open[1]) return floor === physical[1] ? '건물의 맨 위층이에요' : '위층은 아직 잠겨 있어요';
    return '';
  };
  return <div className={`moves${onArrive ? ' travel-moves' : ''}`}>
    <button type="button" className="move" disabled={disabled || floor <= open[0]} onClick={() => onMove(-1)}><span className="lbl">▼ {onArrive ? '아래로' : '한 층 아래로'}</span><span className="why">{why(-1)}</span></button>
    {onArrive && <button type="button" className="move arrive" disabled={disabled || arriveDisabled} onClick={onArrive}>도착</button>}
    <button type="button" className="move" disabled={disabled || floor >= open[1]} onClick={() => onMove(1)}><span className="lbl">▲ {onArrive ? '위로' : '한 층 위로'}</span><span className="why">{why(1)}</span></button>
  </div>;
}
export default MoveButtons;
