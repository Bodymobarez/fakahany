import { IntegrationsSettings } from '@/components/IntegrationsSettings';

export default function Page() {
  return (
    <IntegrationsSettings
      title="Email Settings"
      description="Outbound email provider configuration."
      fields={['emailProvider', 'emailFrom', 'emailWebhookUrl']}
    />
  );
}
