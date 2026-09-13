/* eslint-disable @next/next/no-img-element -- local reencoded media retains original aspect ratios */
import Link from "next/link";
import { Screen } from "@/components/layout";
import { Button, Input, Select } from "@/components/ui";
import {
  ScriptsHeader,
  CostumesHeader,
  DmsHeader,
  CatalogFooter,
} from "./catalog-chrome";
import { ContentCard } from "./catalog-cards";
import type { ContentCardData } from "./adapters";
import type {
  ScriptDetailDto,
  CostumeDetailDto,
  DmDetailDto,
} from "@/lib/api/contracts";
import type { ParsedListQuery } from "@/server/catalog/validation";
import "./catalog-enhancements.css";
export type CatalogKind = "scripts" | "costumes" | "dms";
const titles = {
  scripts: "先挑一个今晚想成为的人。",
  costumes: "把角色，穿进故事里。",
  dms: "找到和你同频的带本人。",
};
const Header = ({ kind }: { kind: CatalogKind }) =>
  kind === "scripts" ? (
    <ScriptsHeader />
  ) : kind === "costumes" ? (
    <CostumesHeader />
  ) : (
    <DmsHeader />
  );
export function LiveCatalog({
  kind,
  items,
  total,
  query,
}: {
  kind: CatalogKind;
  items: ContentCardData[];
  total: number;
  query: ParsedListQuery;
}) {
  const pages = Math.max(1, Math.ceil(total / query.pageSize));
  function href(page: number) {
    const p = new URLSearchParams({
      q: query.q,
      sort: query.sort,
      page: String(page),
    });
    if (query.tag) p.set("tag", query.tag);
    if (query.featured) p.set("featured", "true");
    return `/${kind}?${p}`;
  }
  return (
    <Screen name={kind}>
      <Header kind={kind} />
      <main id="content">
        <section className="page-head">
          <div className="container">
            <p className="eyebrow">C 端 / 内容</p>
            <h1>{titles[kind]}</h1>
            <p className="lead">
              {kind === "scripts"
                ? "列表公开浏览，详情登录后可见。按标签、时长和价格挑选故事。"
                : "店内发布的真实资料；未提供的内容保留空态。"}
            </p>
          </div>
        </section>
        <section className="section">
          <div className="container">
            <div className="toolbar catalog-toolbar">
              {kind === "scripts" && (
                <nav className="segmented catalog-tabs" aria-label="剧本分类">
                  <Link
                    className={query.featured ? "active" : undefined}
                    href="/scripts?featured=true"
                  >
                    精选推荐
                  </Link>
                  <Link
                    className={!query.featured ? "active" : undefined}
                    href="/scripts"
                  >
                    全部剧本
                  </Link>
                  <Link href="/scripts?sort=latest">最近上架</Link>
                </nav>
              )}
              <form className="catalog-query" action={`/${kind}`} method="get">
                <Input
                  name="q"
                  defaultValue={query.q}
                  placeholder="搜索名称"
                  aria-label="搜索名称"
                />
                {kind === "scripts" && (
                  <>
                    <Input
                      name="tag"
                      defaultValue={query.tag}
                      placeholder="标签"
                      aria-label="标签筛选"
                    />
                    <Select
                      name="sort"
                      defaultValue={query.sort}
                      aria-label="排序"
                    >
                      <option value="latest">最近上架</option>
                      <option value="price_asc">价格从低到高</option>
                      <option value="price_desc">价格从高到低</option>
                      <option value="rating">评分优先</option>
                    </Select>
                    {query.featured && (
                      <input type="hidden" name="featured" value="true" />
                    )}
                  </>
                )}
                <Button variant="primary" type="submit">
                  筛选
                </Button>
              </form>
            </div>

            <p className="meta">
              共 {total} 项 · 第 {query.page} / {pages} 页
            </p>
            <div className="grid-3">
              {items.map((item) => (
                <ContentCard item={item} key={item.id} />
              ))}
            </div>
            {!items.length && (
              <div className="surface-card" role="status">
                <h3>暂时没有匹配的内容</h3>
                <p>试试调整筛选，或稍后再来看看。</p>
              </div>
            )}
            <nav className="catalog-pagination" aria-label="分页">
              {query.page > 1 && (
                <Button href={href(query.page - 1)}>上一页</Button>
              )}
              {query.page < pages && (
                <Button href={href(query.page + 1)}>下一页</Button>
              )}
            </nav>
          </div>
        </section>
      </main>
      <CatalogFooter meta="内容由门店维护" />
    </Screen>
  );
}
function Related({
  title,
  items,
}: {
  title: string;
  items: { href: string; title: string }[];
}) {
  return (
    <section className="surface-card">
      <h3>{title}</h3>
      {items.length ? (
        items.map((i) => (
          <Link className="related-item" href={i.href} key={i.href}>
            {i.title}
            <span aria-hidden> →</span>
          </Link>
        ))
      ) : (
        <p className="meta">暂无关联资料</p>
      )}
    </section>
  );
}
export function LiveScriptDetail({ script: s }: { script: ScriptDetailDto }) {
  return (
    <Screen name="script-detail">
      <ScriptsHeader />
      <main id="content">
        <section className="detail-hero">
          <div className="container detail-grid">
            <div className="detail-cover">
              <img
                className="catalog-live-image"
                src={s.cover}
                alt={`${s.title}封面`}
              />
            </div>
            <div className="detail-copy">
              <p className="eyebrow">剧本详情</p>
              <h1>{s.title}</h1>
              <p className="lead">{s.synopsis}</p>
              <div className="tag-row">
                {s.tags.map((t) => (
                  <span className="tag" key={t}>
                    {t}
                  </span>
                ))}
              </div>
              <p>
                {s.duration_minutes} 分钟 · {s.player_min}–{s.player_max} 人 · ¥
                {s.price} / 人
              </p>
              <Button href="/scripts">返回剧本列表</Button>
              <div className="c3-actions">
                <Button href={`/sessions?script_id=${s.id}`}>
                  查看该剧本场次
                </Button>
                <Button href={`/booking/new?script_id=${s.id}`}>
                  发起自主预约
                </Button>
              </div>
            </div>
          </div>
        </section>
        <section className="section">
          <div className="container grid-2-1">
            <div>
              <p className="eyebrow">非剧透角色</p>
              <h2>每个角色，都有一处没说完。</h2>
              <div className="grid-2">
                {s.characters.map((c) => (
                  <article className="surface-card" key={c.id}>
                    {c.image && (
                      <img
                        className="catalog-character-image"
                        src={c.image}
                        alt={c.name}
                      />
                    )}
                    <h3>{c.name}</h3>
                    <p>{c.bio ?? "角色介绍待补充"}</p>
                  </article>
                ))}
              </div>
              {!s.characters.length && <p>暂无角色介绍</p>}
            </div>
            <aside className="dark-panel">
              <h3>本场体验</h3>
              <p>
                {s.review_count && s.avg_rating
                  ? `${s.avg_rating} / 5 · ${s.review_count} 条评价`
                  : "暂无评价"}
              </p>
              <p>
                {s.player_min}–{s.player_max} 人
              </p>
              <p>{s.duration_minutes} 分钟</p>
            </aside>
          </div>
        </section>
        <section className="section">
          <div className="container grid-2">
            <Related
              title="可带 DM"
              items={s.dms.map((d) => ({
                href: `/dms/${d.slug ?? d.id}`,
                title: d.name,
              }))}
            />
            <Related
              title="关联妆造"
              items={s.costumes.map((c) => ({
                href: `/costumes/${c.slug ?? c.id}`,
                title: c.name,
              }))}
            />
          </div>
        </section>
        <section className="section">
          <div className="container">
            <h2>顾客评价</h2>
            <p className="meta">
              {s.review_count
                ? "评价明细将在评价模块接入后展示。"
                : "暂无评价。评价功能将在 C6 接入，不提供演示发评。"}
            </p>
          </div>
        </section>
      </main>
      <CatalogFooter meta="登录后可见 · 非剧透介绍" />
    </Screen>
  );
}
export function LiveCostumeDetail({
  costume: c,
}: {
  costume: CostumeDetailDto;
}) {
  return (
    <Screen name="costume-detail">
      <CostumesHeader detail />
      <main id="content">
        <section className="detail-hero">
          <div className="container detail-grid">
            <div className="detail-art">
              <img className="catalog-live-image" src={c.cover} alt={c.name} />
            </div>
            <div className="detail-copy">
              <p className="eyebrow">妆造档案</p>
              <h1>{c.name}</h1>
              <p className="lead">{c.description ?? "详细说明待补充"}</p>
              <Button href="/costumes">返回妆造列表</Button>
            </div>
          </div>
        </section>
        <section className="section">
          <div className="container grid-3">
            {c.images.map((url, i) => (
              <img
                className="catalog-live-image"
                key={`${url}-${i}`}
                src={url}
                alt={`${c.name}细节 ${i + 1}`}
              />
            ))}
          </div>
        </section>
        <section className="section">
          <div className="container">
            <Related
              title="关联剧本"
              items={c.scripts.map((s) => ({
                href: `/scripts/${s.slug}`,
                title: s.title,
              }))}
            />
          </div>
        </section>
      </main>
      <CatalogFooter meta="妆造内容展示 · 无线上租赁" />
    </Screen>
  );
}
export function LiveDmDetail({ dm: d }: { dm: DmDetailDto }) {
  return (
    <Screen name="dm-detail">
      <DmsHeader />
      <main id="content">
        <section className="detail-hero">
          <div className="container detail-grid">
            <div className="profile-mark">
              {d.photo || d.avatar ? (
                <img
                  className="catalog-live-image"
                  src={d.photo ?? d.avatar!}
                  alt={d.name}
                />
              ) : (
                <>
                  <strong>{d.name.slice(0, 1)}</strong>
                  <span>照片待上传</span>
                </>
              )}
            </div>
            <div className="detail-copy">
              <p className="eyebrow">DM 主页</p>
              <h1>{d.name}</h1>
              <p className="lead">{d.bio ?? "个人介绍待补充"}</p>
              <div className="tag-row">
                {d.specialty_tags.map((t) => (
                  <span className="tag" key={t}>
                    {t}
                  </span>
                ))}
              </div>
              <Button href="/dms">返回 DM 列表</Button>
            </div>
          </div>
        </section>
        <section className="section">
          <div className="container grid-2">
            <Related
              title="会带的剧本"
              items={d.scripts.map((s) => ({
                href: `/scripts/${s.slug}`,
                title: s.title,
              }))}
            />
            <section className="surface-card">
              <h3>实际带本历史</h3>
              <p>暂无已履约记录。会带剧本关联不代表已带过。</p>
              <h3>评价</h3>
              <p>{d.rating ? `${d.rating} / 5` : "暂无评价"}</p>
            </section>
          </div>
        </section>
      </main>
      <CatalogFooter meta="只展示公开资料" />
    </Screen>
  );
}
