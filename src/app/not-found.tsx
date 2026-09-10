import Link from "next/link";
import { Screen, SiteHeader, SiteFooter } from "@/components/layout";

export default function NotFound() {
  return (
    <Screen name="scripts">
      <SiteHeader />
      <main className="section">
        <div className="container">
          <p className="eyebrow">404</p>
          <h1>这一页还没有故事。</h1>
          <p className="lead">页面可能已移动，回到首页继续寻找今晚的故事。</p>
          <p>
            <Link className="btn btn-primary" href="/">
              返回首页
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </Screen>
  );
}
