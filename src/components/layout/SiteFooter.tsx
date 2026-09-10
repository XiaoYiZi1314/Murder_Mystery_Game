import type { ReactNode } from 'react';

export function SiteFooter({ children, meta, dataOdId }: { children?: ReactNode; meta?: ReactNode; dataOdId?: string }) {
  return <footer className="pagefoot" data-od-id={dataOdId}><div className="container row-between">{children ?? <><span>十三雾 · 把今晚留给一个故事</span>{meta && <span className="meta">{meta}</span>}</>}</div></footer>;
}
