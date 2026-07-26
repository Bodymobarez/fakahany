import { CampaignAdmin } from '@/components/CampaignAdmin';

export default function Page() {
  return (
    <CampaignAdmin
      channel="SMS"
      title="SMS"
      description="SMS campaign drafts and send logs."
    />
  );
}
