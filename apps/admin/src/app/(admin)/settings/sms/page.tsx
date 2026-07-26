import { IntegrationsSettings } from '@/components/IntegrationsSettings';

export default function Page() {
  return (
    <IntegrationsSettings
      title="SMS Settings"
      description="SMS gateway configuration."
      fields={['smsProvider', 'smsSenderId', 'smsWebhookUrl']}
    />
  );
}
