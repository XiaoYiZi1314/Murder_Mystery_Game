export type ScriptId = "wugang-laixin" | "changyexing" | "jinling";
export type DmId = "linshen" | "adu" | "shisan";
export type CostumeId = "wugang-old" | "letter-room" | "chang-an";

export type RelatedItem = {
  href: string;
  name: string;
  meta: string;
  odId?: string;
};

export type ScriptRecord = {
  id: ScriptId;
  name: string;
  coverWords?: readonly [string, string];
  coverImage?: string;
  coverAlt?: string;
  category: string;
  people: string;
  price: number;
  rating: number;
  stars: string;
  summary: string;
  description: string;
  tags: readonly string[];
  duration: string;
  reviewCount?: number;
  storyCards: readonly {
    meta: string;
    title: string;
    description: string;
  }[];
  storyEyebrow: string;
  storyHeading: string;
  experienceLabel: string;
  relatedDms: readonly RelatedItem[];
  relatedCostumes: readonly RelatedItem[];
  cardOdId: string;
};

export const scripts = [
  {
    id: "wugang-laixin",
    name: "雾港来信",
    coverImage: "/43947e6d13429e6e24ef2f82a3ac0265.jpg",
    coverAlt: "雾港来信剧本封面",
    category: "情感 · 城市",
    people: "5 人",
    price: 268,
    rating: 4.9,
    stars: "★★★★★",
    summary: "一封迟到二十年的信，把六个人带回雾里的码头。",
    description:
      "一封迟到二十年的信，把六个人带回雾里的码头。故事不急着给答案，先让每个人重新面对自己曾经留下的那句话。",
    tags: ["情感", "城市", "新手友好"],
    duration: "约 4.5 小时",
    reviewCount: 28,
    storyEyebrow: "非剧透角色",
    storyHeading: "每个角色，都有一处没说完。",
    storyCards: [
      {
        meta: "01 / 船上来客",
        title: "沈知秋",
        description:
          "在港口长大，对每一条潮汐都熟悉，却不愿再提起那年离开的夜晚。",
      },
      {
        meta: "02 / 旧信收件人",
        title: "顾南枝",
        description:
          "习惯把一切安排妥当，唯独这封信来得太晚，晚到无法假装没看见。",
      },
      {
        meta: "03 / 码头管理员",
        title: "林渡",
        description:
          "看起来最像旁观者的人，往往知道最多。你会相信他的第一句话吗？",
      },
      {
        meta: "04 / 远行归人",
        title: "周弥",
        description: "从远方回来，只带一只旧箱子和一个不准备兑现的承诺。",
      },
    ],
    experienceLabel: "本场体验",
    relatedDms: [
      {
        href: "/dms/linshen",
        name: "林深",
        meta: "情感还原 · 擅长留白",
        odId: "related-dm-linshen",
      },
      {
        href: "/dms/shisan",
        name: "十三",
        meta: "沉浸流程 · 角色状态",
        odId: "related-dm-shisan",
      },
    ],
    relatedCostumes: [
      {
        href: "/costumes/wugang-old",
        name: "雾港旧衣",
        meta: "灰蓝 · 旧港 · 适合六人本",
        odId: "related-costume-wugang",
      },
      {
        href: "/costumes/letter-room",
        name: "寄信人的房间",
        meta: "暗色 · 复古 · 适合情感本",
        odId: "related-costume-letter",
      },
    ],
    cardOdId: "script-card-wugang",
  },
  {
    id: "changyexing",
    name: "长夜行",
    coverWords: ["长夜", "行"],
    category: "硬核 · 古风",
    people: "6–8 人",
    price: 298,
    rating: 4.7,
    stars: "★★★★☆",
    summary: "长安城门落锁前，所有人都要交出一段不能说的过去。",
    description: "长安城门落锁前，所有人都要交出一段不能说的过去。",
    tags: ["硬核", "古风"],
    duration: "店内排期",
    storyEyebrow: "关联体验",
    storyHeading: "从选择、妆造到入场，故事已经开始。",
    storyCards: [
      {
        meta: "01 / 关联 DM",
        title: "阿渡",
        description:
          "节奏清楚、反馈及时，适合喜欢做选择，也喜欢被故事推着走的人。",
      },
      {
        meta: "02 / 推荐妆造",
        title: "长安行旅",
        description: "深色层叠与利落线条，给需要做决定的人一身更清楚的轮廓。",
      },
    ],
    experienceLabel: "剧本档案",
    relatedDms: [
      {
        href: "/dms/adu",
        name: "阿渡",
        meta: "机制推进 · 节奏清楚",
      },
      {
        href: "/dms/shisan",
        name: "十三",
        meta: "古风沉浸 · 场景秩序",
      },
    ],
    relatedCostumes: [
      {
        href: "/costumes/chang-an",
        name: "长安行旅",
        meta: "深色层叠 · 利落线条 · 适合 6–8 人",
      },
    ],
    cardOdId: "script-card-night",
  },
  {
    id: "jinling",
    name: "金陵旧梦",
    coverWords: ["金陵", "旧梦"],
    category: "情感 · 民国",
    people: "4–6 人",
    price: 238,
    rating: 4.8,
    stars: "★★★★☆",
    summary: "一场旧宴散席之后，留下的不是遗憾，而是六个未完的选择。",
    description: "一场旧宴散席之后，留下的不是遗憾，而是六个未完的选择。",
    tags: ["情感", "民国"],
    duration: "店内排期",
    storyEyebrow: "关联体验",
    storyHeading: "让人物关系与旧日选择自然发生。",
    storyCards: [
      {
        meta: "01 / 关联 DM",
        title: "十三",
        description: "从妆造到入场词都提前准备，让古风故事从推门之前就开始。",
      },
      {
        meta: "02 / 推荐妆造",
        title: "寄信人的房间",
        description: "复古针织与旧纸色调，适合把故事留在眼神里的角色。",
      },
    ],
    experienceLabel: "剧本档案",
    relatedDms: [
      {
        href: "/dms/shisan",
        name: "十三",
        meta: "古风沉浸 · 人物关系",
      },
      {
        href: "/dms/linshen",
        name: "林深",
        meta: "情感还原 · 擅长留白",
      },
    ],
    relatedCostumes: [
      {
        href: "/costumes/letter-room",
        name: "寄信人的房间",
        meta: "复古针织 · 旧纸色调 · 适合情感本",
      },
      {
        href: "/costumes/wugang-old",
        name: "雾港旧衣",
        meta: "灰蓝 · 克制层次 · 适合 5–6 人",
      },
    ],
    cardOdId: "script-card-jinling",
  },
] as const satisfies readonly ScriptRecord[];

export type DmRecord = {
  id: DmId;
  name: string;
  mark: string;
  specialty: string;
  description: string;
  listDescription: string;
  tags: readonly string[];
  series: string;
  scripts: readonly [RelatedItem, RelatedItem];
  styleTitle: string;
  style: string;
  styleTags: readonly string[];
  light?: boolean;
  cardOdId: string;
};

export const dms = [
  {
    id: "linshen",
    name: "林深",
    mark: "林",
    specialty: "情感还原",
    listDescription: "擅长把线索交到情绪刚好的位置，让每一次沉默都有回应。",
    description:
      "擅长把线索交到情绪刚好的位置，让每一次沉默都有回应。带本时会先确认大家的接受度，再把节奏推到故事真正需要的地方。",
    tags: ["情感", "新手友好"],
    series: "可带 · 雾港系列",
    scripts: [
      { href: "/scripts/wugang-laixin", name: "雾港来信", meta: "情感 · 城市" },
      { href: "/scripts/jinling", name: "金陵旧梦", meta: "情感 · 民国" },
    ],
    styleTitle: "先让每个人找到自己的速度",
    style:
      "开场会把角色目标说清楚，过程中给足选择时间；不替你解释情绪，也不让线索把人推着走。",
    styleTags: ["节奏清楚", "情绪留白", "角色友好"],
    cardOdId: "dm-card-linshen",
  },
  {
    id: "adu",
    name: "阿渡",
    mark: "渡",
    specialty: "机制推进",
    listDescription:
      "节奏清楚、反馈及时，适合喜欢做选择，也喜欢被故事推着走的人。",
    description:
      "节奏清楚、反馈及时，适合喜欢做选择，也喜欢被故事推着走的人。复杂规则会拆成可执行的阶段，让每个人都知道下一步。",
    tags: ["机制", "阵营"],
    series: "可带 · 长夜系列",
    scripts: [
      { href: "/scripts/changyexing", name: "长夜行", meta: "硬核 · 古风" },
      { href: "/scripts/wugang-laixin", name: "雾港来信", meta: "情感 · 城市" },
    ],
    styleTitle: "把复杂机制说成清楚的选择",
    style: "先讲目标，再按阶段推进；关键节点会复述规则，但不会替玩家做决定。",
    styleTags: ["目标清楚", "阶段推进", "选择优先"],
    light: true,
    cardOdId: "dm-card-adu",
  },
  {
    id: "shisan",
    name: "十三",
    mark: "十",
    specialty: "古风沉浸",
    listDescription: "从妆造到入场词都提前准备，让古风故事从推门之前就开始。",
    description:
      "从妆造到入场词都提前准备，让古风故事从推门之前就开始。重视人物关系与场景秩序，也会给新手留出进入角色的时间。",
    tags: ["古风", "沉浸"],
    series: "可带 · 金陵系列",
    scripts: [
      { href: "/scripts/jinling", name: "金陵旧梦", meta: "情感 · 民国" },
      { href: "/scripts/changyexing", name: "长夜行", meta: "硬核 · 古风" },
    ],
    styleTitle: "从入场开始建立故事秩序",
    style:
      "先用场景和称谓帮助玩家入戏，再逐步放开行动空间，让关系变化自然发生。",
    styleTags: ["场景沉浸", "人物关系", "新手友好"],
    cardOdId: "dm-card-shisan",
  },
] as const satisfies readonly DmRecord[];

export type CostumeRecord = {
  id: CostumeId;
  name: string;
  series: string;
  description: string;
  listDescription: string;
  tags: readonly [string, string];
  fit: string;
  scripts: readonly [RelatedItem, RelatedItem];
  light?: boolean;
  cardOdId: string;
};

export const costumes = [
  {
    id: "wugang-old",
    name: "雾港旧衣",
    series: "雾港系列",
    listDescription: "灰蓝、旧港与一封迟到的信。适合需要一点克制感的角色。",
    description:
      "灰蓝、旧港与一封迟到的信。用克制的层次给角色留出呼吸，也让进入故事的第一步从衣服开始。",
    tags: ["情感", "灰蓝"],
    fit: "适合 5–6 人",
    scripts: [
      { href: "/scripts/wugang-laixin", name: "雾港来信", meta: "情感 · 城市" },
      { href: "/scripts/jinling", name: "金陵旧梦", meta: "情感 · 民国" },
    ],
    cardOdId: "costume-card-wugang",
  },
  {
    id: "letter-room",
    name: "寄信人的房间",
    series: "雾港系列",
    listDescription: "复古针织与旧纸色调，适合把故事留在眼神里的角色。",
    description:
      "复古针织与旧纸色调，适合把故事留在眼神里的角色。细节克制，方便在情感本里保持人物的生活感。",
    tags: ["情感", "复古"],
    fit: "适合 5–6 人",
    scripts: [
      { href: "/scripts/wugang-laixin", name: "雾港来信", meta: "情感 · 城市" },
      { href: "/scripts/jinling", name: "金陵旧梦", meta: "情感 · 民国" },
    ],
    light: true,
    cardOdId: "costume-card-letter",
  },
  {
    id: "chang-an",
    name: "长安行旅",
    series: "长夜系列",
    listDescription: "深色层叠与利落线条，给需要做决定的人一身更清楚的轮廓。",
    description:
      "深色层叠与利落线条，给需要做决定的人一身更清楚的轮廓。动作空间与角色识别都留有余地。",
    tags: ["古风", "阵营"],
    fit: "适合 6–8 人",
    scripts: [
      { href: "/scripts/changyexing", name: "长夜行", meta: "硬核 · 古风" },
      { href: "/scripts/jinling", name: "金陵旧梦", meta: "情感 · 民国" },
    ],
    cardOdId: "costume-card-changan",
  },
] as const satisfies readonly CostumeRecord[];

export function isScriptId(value: string): value is ScriptId {
  return scripts.some((script) => script.id === value);
}

export function isDmId(value: string): value is DmId {
  return dms.some((dm) => dm.id === value);
}

export function isCostumeId(value: string): value is CostumeId {
  return costumes.some((costume) => costume.id === value);
}

export function getScript(id: ScriptId): ScriptRecord {
  return scripts.find((script) => script.id === id)!;
}

export function getDm(id: DmId): DmRecord {
  return dms.find((dm) => dm.id === id)!;
}

export function getCostume(id: CostumeId): CostumeRecord {
  return costumes.find((costume) => costume.id === id)!;
}
