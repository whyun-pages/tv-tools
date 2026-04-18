export type Recordable = Record<string, unknown>;

/** TVBox 主配置接口 */
export interface TVBoxConfig {
  /** 配置名称/作者信息 */
  name?: string;
  author?: string;
  /** 爬虫 JAR 路径（支持 md5） */
  spider?: string;
  /** 壁纸 URL */
  wallpaper?: string;
  /** Logo */
  logo?: string;
  /** 直播源数组 */
  lives?: Live[];
  /** 视频源/站点数组（最核心部分） */
  sites?: Site[];
  /** 解析接口数组 */
  parses?: Parse[];
  /** 嗅探/规则数组 */
  rules?: Rule[];
  /** DOH 服务器 */
  doh?: Doh[];
  /** 广告域名黑名单 */
  ads?: string[];
  /** 其他扩展字段 */
}

export interface LiveChannel {
  name: string;
  urls: string[]; // 支持 "url" 或 "url$名称"
  epg?: string;
}

export interface LiveClassic {
  group: string;
  channels: LiveChannel[];
}

export interface LiveFengMi {
  type: number; // 0 = m3u,txt 等; 1 直播地址在channels里
  url: string; // m3u/txt 地址
  playerType?: number; // 1 或 2
}

export type LiveImpl = LiveClassic | LiveFengMi;

/** 直播源 (lives) */
export type Live = LiveImpl & {
  name?: string;
  epg?: string; // EPG 模板
  logo?: string;
  ua?: string;
  /** 多线路时使用 */
  ext?: Recordable;
};

/** 站点/资源源 (sites) —— 最常用 */
export interface Site {
  key: string; // 唯一标识
  name: string; // 显示名称
  type: number; // 0=内置, 1=CMS, 3=自定义爬虫（最常见）
  api: string; // csp_xxx 或 drpy js 地址 或 CMS 接口
  searchable?: number; // 0/1 是否支持搜索
  quickSearch?: number; // 0/1 快速搜索
  filterable?: number; // 0/1 筛选
  changeable?: number; // 0/1 可切换线路
  timeout?: number;
  playerType?: number | string;
  jar?: string; // 自定义 jar
  ext?: string | Recordable; // 扩展配置（重要！很多源用这个传参数）
  style?: {
    type?: 'list' | 'rect' | 'cover';
    ratio?: number;
  };
  categories?: string[]; // 自定义分类
  indexs?: number;
}

/** 解析接口 (parses) */
export interface Parse {
  name: string;
  url: string; // 解析服务器地址
  type?: number; // 0=默认, 1=JSON 等
  ext?: Recordable;
}

/** 规则 (rules) —— 嗅探、点击等 */
export interface Rule {
  name: string; // sniffer / click 等
  hosts: string[]; // 生效域名
  regex?: string[]; // 嗅探正则
  script?: string[]; // 点击脚本
}

/** DOH 配置 */
export interface Doh {
  name: string;
  url: string;
  ips?: string[];
}
