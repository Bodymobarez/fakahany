import { CampaignAdmin } from '@/components/CampaignAdmin';

export default function Page() {
  return (
    <CampaignAdmin
      channel="IN_APP"
      title="Notifications"
      description="In-app notification campaigns for signed-in customers."
    />
  );
}
