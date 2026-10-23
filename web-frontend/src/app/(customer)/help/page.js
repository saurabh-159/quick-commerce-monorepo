'use client';

import AiSupportChat from '@/components/AiSupportChat';

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-2xl py-2 sm:py-4">
      <AiSupportChat mode="assistant" title="Shopping help" />
    </div>
  );
}
