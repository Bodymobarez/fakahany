import { CampaignAdmin } from '@/components/CampaignAdmin';

export default function Page() {
  return (
    <CampaignAdmin
      channel="EMAIL"
      title="Email Campaigns"
      description="Compose and log email blasts (provider hook later)."
    />
  );
}
