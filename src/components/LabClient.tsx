'use client';
import { useState } from 'react';
import { buildingFloors, describe, floorOf, keyboardRange, type Degree, type QualityKey } from '@/engine/engine';
import { Staff } from './Staff';
import { Keyboard } from './Keyboard';
import { NoteName } from './NoteName';
import { Building } from './Building';
import { Plate } from './Plate';
import { MoveButtons } from './MoveButtons';
const examples: [Degree, 'C' | 'D' | 'B' | 'F', QualityKey][] = [[3,'C','m'],[3,'C','M'],[3,'C','d'],[3,'D','M'],[3,'B','A'],[5,'F','d'],[5,'B','A']];
export function LabClient() {
  const [third, setThird] = useState(2);
  const [fifth, setFifth] = useState(2);
  return <main id="main" className="page-shell"><p className="eyebrow">표기 검수실</p><h1>악보와 건반을 비교해요</h1><div className="lab-grid">{examples.map(([degree,letter,quality],i) => {
    const view = describe(degree,{letter,acc:0,octave:4},floorOf(degree,quality));
    return <section className="panel" key={i}><h2>{view.name} · <NoteName note={view.base}/>–<NoteName note={view.upper}/></h2><Staff base={view.base} upper={view.upper}/><Keyboard base={view.base} upper={view.upper} range={keyboardRange([degree])} showSteps/></section>;
  })}</div><div className="lab-grid">{([3,5] as Degree[]).map(degree => {
    const floor = degree === 3 ? third : fifth;
    const base = {letter:'C' as const,acc:0,octave:4};
    const open = buildingFloors(degree);
    return <section className="panel" key={degree}><Plate view={describe(degree,base,floor)}/><Building degree={degree} base={base} floor={floor} open={open}/><MoveButtons degree={degree} floor={floor} open={open} onMove={dir => (degree === 3 ? setThird : setFifth)(floor + dir)}/></section>;
  })}</div></main>;
}
export default LabClient;
