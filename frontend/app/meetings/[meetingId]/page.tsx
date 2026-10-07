import { MeetingWorkspace } from "@/components/notepad/MeetingWorkspace";

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const { meetingId } = await params;
  return (
    <div className="h-full min-h-0">
      <MeetingWorkspace meetingId={meetingId} />
    </div>
  );
}
