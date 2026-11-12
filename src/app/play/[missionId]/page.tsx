import { MISSIONS } from '@/engine/engine';
import PlayClient from '@/components/PlayClient';
export function generateStaticParams() { return MISSIONS.map(m => ({ missionId: m.id })); }
export const dynamicParams = false;
export default async function PlayPage({ params }: { params: Promise<{ missionId: string }> }) { const { missionId } = await params; return <PlayClient missionId={missionId} />; }
