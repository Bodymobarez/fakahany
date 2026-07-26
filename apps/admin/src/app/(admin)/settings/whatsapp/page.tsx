import { IntegrationsSettings } from '@/components/IntegrationsSettings';

export default function Page() {
  return (
    <IntegrationsSettings
      title="WhatsApp"
      description="WhatsApp Business ordering bot settings."
      fields={['whatsappEnabled', 'whatsappNumber']}
    />
  );
}
