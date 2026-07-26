import { IntegrationsSettings } from '@/components/IntegrationsSettings';

export default function Page() {
  return (
    <IntegrationsSettings
      title="API"
      description="Public developer docs and API surface flags."
      fields={['apiPublicDocs']}
    />
  );
}
