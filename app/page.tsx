import { GCPPointsContent } from '@/features/gcp-points/GCPPointsContent';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GCP Points | NeoCheck',
  description: 'Select Ground Control Points from the map.',
};

export default function GCPPointsPage() {
  return (
    <div className="container mx-auto py-8">
      <GCPPointsContent />
    </div>
  );
}