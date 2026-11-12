import { STAGES } from "@/engine/engine";
import { StageClient } from "@/components/StageClient";

export function generateStaticParams() { return STAGES.map(stage => ({id:String(stage.id)})); }
export default async function StagePage({params}:{params:Promise<{id:string}>}) {
  const {id} = await params;
  return <StageClient id={Number(id)}/>;
}
