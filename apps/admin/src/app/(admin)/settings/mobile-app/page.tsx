import { IntegrationsSettings } from '@/components/IntegrationsSettings';

export default function Page() {
  return (
    <IntegrationsSettings
      title="Mobile App"
      description="Force-update and mobile release gates."
      fields={['mobileMinVersion']}
    />
  );
}
