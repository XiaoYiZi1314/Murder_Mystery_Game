import Image from "next/image";
import Link from "next/link";

import type { CostumeRecord, DmRecord, ScriptRecord } from "./data";

export function ScriptCard({ script }: { script: ScriptRecord }) {
  return (
    <Link
      className="card script-card"
      href={`/scripts/${script.id}`}
      data-filter-item
      data-rating={script.rating}
      data-price={script.price}
      data-od-id={script.cardOdId}
    >
      <div className="cover">
        {script.coverImage ? (
          <Image
            src={script.coverImage}
            alt={script.coverAlt ?? `${script.name}剧本封面`}
            width={685}
            height={685}
          />
        ) : (
          <div className="cover-word">
            {script.coverWords?.[0]}
            <br />
            {script.coverWords?.[1]}
          </div>
        )}
      </div>
      <div className="script-card-body">
        <div className="row-between">
          <span className="tag">{script.category}</span>
          <span className="meta">{script.people}</span>
        </div>
        <h3 style={{ marginTop: 14 }}>{script.name}</h3>
        <p style={{ color: "var(--muted)", fontSize: 14, margin: "8px 0 0" }}>
          {script.summary}
        </p>
        <div className="script-card-foot">
          <span className="rating">
            <span className="stars">{script.stars}</span>
            <b>{script.rating}</b>
          </span>
          <span className="num">¥{script.price} / 人</span>
        </div>
      </div>
    </Link>
  );
}

export function DmCard({ dm }: { dm: DmRecord }) {
  return (
    <Link
      className="card"
      href={`/dms/${dm.id}`}
      data-dm-item
      data-dm-tags={dm.tags.join(" ")}
      data-od-id={dm.cardOdId}
    >
      <div className={`dm-stage${dm.light ? " light" : ""}`}>
        <strong>{dm.mark}</strong>
        <span>头像素材待上传</span>
      </div>
      <div className="card-body">
        <div className="row-between">
          <h3>{dm.name}</h3>
          <span className="meta">{dm.specialty}</span>
        </div>
        <p>{dm.listDescription}</p>
        <div className="tag-row">
          {dm.tags.map((tag) => (
            <span className="tag" key={tag}>
              {tag}
            </span>
          ))}
        </div>
        <div className="card-foot">
          <span className="meta">{dm.scripts[0].name} · 关联 DM</span>
          <span className="btn btn-ghost btn-arrow">查看主页</span>
        </div>
      </div>
    </Link>
  );
}

export function CostumeCard({ costume }: { costume: CostumeRecord }) {
  return (
    <Link
      className="card"
      href={`/costumes/${costume.id}`}
      data-costume-item
      data-costume-tags={costume.tags.join(" ")}
      data-od-id={costume.cardOdId}
    >
      <div className={`costume-visual${costume.light ? " light" : ""}`}>
        <span>{costume.name}</span>
        <small>实拍照片待店内上传</small>
      </div>
      <div className="card-body">
        <div className="row-between">
          <h3>{costume.name}</h3>
          <span className="meta">{costume.tags[0]}</span>
        </div>
        <p>{costume.listDescription}</p>
        <div className="tag-row">
          <span className="tag">{costume.scripts[0].name}</span>
          <span className="tag">{costume.tags[1]}</span>
        </div>
        <div className="card-foot">
          <span className="meta">统一比例展示</span>
          <span className="btn btn-ghost btn-arrow">查看详情</span>
        </div>
      </div>
    </Link>
  );
}

/** Shared live-data card retains the existing card/cover/body/foot structure. */
export function ContentCard({item}:{item:import('./adapters').ContentCardData}){
 return <Link className="card script-card" href={item.href}><div className="cover">{item.image?<Image src={item.image} alt={item.title} width={685} height={685} unoptimized/>:<div className="cover-word">{item.title}<small>照片待上传</small></div>}</div><div className="script-card-body"><div className="row-between"><span className="tag">{item.tags.join(' · ')||'门店内容'}</span><span className="meta">{item.players}</span></div><h3>{item.title}</h3><p>{item.summary||'详细介绍待补充'}</p><div className="script-card-foot"><span className="rating">{item.rating?`${item.rating} / 5`:'暂无评价'}</span>{item.price&&<span className="num">¥{item.price} / 人</span>}</div></div></Link>;
}
