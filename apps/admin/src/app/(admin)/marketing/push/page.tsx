import { CampaignAdmin } from '@/components/CampaignAdmin';

export default function Page() {
  return (
    <CampaignAdmin
      channel="PUSH"
      title="Push Notifications"
      description="Sends Expo push to registered devices and mirrors to the in-app inbox."
    />
  );
}
