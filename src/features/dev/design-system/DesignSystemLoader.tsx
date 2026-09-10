'use client';

import dynamic from 'next/dynamic';

const DesignSystemPreview = dynamic(
  () => import('./DesignSystemPreview').then((module) => module.DesignSystemPreview),
  {
    ssr: false,
    loading: () => (
      <div className="dp-loading" role="status">
        正在载入设计系统预览…
      </div>
    ),
  },
);

export function DesignSystemLoader() {
  return <DesignSystemPreview />;
}
