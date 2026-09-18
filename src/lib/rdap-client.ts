/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * RDAP (Registration Data Access Protocol) Client
 * RDAP是WHOIS的现代化替代方案，提供JSON格式的结构化数据
 */

export interface RDAPResponse {
  objectClassName: string;
  handle?: string;
  ldhName?: string;
  unicodeName?: string;
  status?: string[];
  entities?: RDAPEntity[];
  nameservers?: RDAPNameserver[];
  events?: RDAPEvent[];
  links?: RDAPLink[];
  notices?: RDAPNotice[];
  remarks?: RDAPRemark[];
  port43?: string;
  secureDNS?: {
    delegationSigned?: boolean;
    zoneSigned?: boolean;
    maxSigLife?: number;
    dsData?: any[];
    keyData?: any[];
  };
}

export interface RDAPEntity {
  objectClassName: string;
  handle?: string;
  vcardArray?: any[];
  roles?: string[];
  publicIds?: any[];
  entities?: RDAPEntity[];
  remarks?: RDAPRemark[];
  links?: RDAPLink[];
  events?: RDAPEvent[];
  status?: string[];
  port43?: string;
}

export interface RDAPNameserver {
  objectClassName: string;
  ldhName?: string;
  unicodeName?: string;
  ipAddresses?: {
    v4?: string[];
    v6?: string[];
  };
  status?: string[];
  entities?: RDAPEntity[];
  events?: RDAPEvent[];
  links?: RDAPLink[];
}

export interface RDAPEvent {
  eventAction: string;
  eventDate: string;
  eventActor?: string;
  links?: RDAPLink[];
}

export interface RDAPLink {
  value?: string;
  rel: string;
  href: string;
  hreflang?: string[];
  title?: string;
  media?: string;
  type?: string;
}

export interface RDAPNotice {
  title?: string;
  description?: string[];
  links?: RDAPLink[];
}

export interface RDAPRemark {
  title?: string;
  description?: string[];
  links?: RDAPLink[];
}

/**
 * RDAP服务器配置
 */
const RDAP_SERVERS = {
  // 通用顶级域名
  'com': 'https://rdap.verisign.com/com/v1',
  'net': 'https://rdap.verisign.com/net/v1',
  'org': 'https://rdap.publicinterestregistry.org/rdap',
  'info': 'https://rdap.afilias.net/rdap/afilias',
  'biz': 'https://rdap.afilias.net/rdap/afilias',
  
  // 国别顶级域名
  // .cn / .jp currently publish WHOIS rather than domain RDAP in IANA.
  'uk': 'https://rdap.nominet.uk/uk',
  'de': 'https://rdap.denic.de',
  'fr': 'https://rdap.nic.fr',
  
  // 新顶级域名
  'xyz': 'https://rdap.centralnic.com/xyz',
  'top': 'https://rdap.nic.top',
  'online': 'https://rdap.centralnic.com/online',
  'site': 'https://rdap.centralnic.com/site',
  // 新增 .asia 的 RDAP 端点（由 Identity Digital 提供）
  'asia': 'https://rdap.identitydigital.services/rdap'
};

// Prefer IANA; verified static endpoints also cover registries not in bootstrap.
const BOOTSTRAP_URL = 'https://data.iana.org/rdap/dns.json';
let dynamicRdapMap: Record<string, string[]> | null = null;
let lastBootstrapFetch = 0;
let bootstrapRequest: Promise<void> | null = null;
let lastBootstrapAttempt = 0;
const BOOTSTRAP_TTL = 24 * 60 * 60 * 1000; // 24小时缓存

/**
 * 文件：src/lib/rdap-client.ts
 * 用途：RDAP 客户端，负责根据 IANA 引导与静态映射进行 RDAP 查询，并在可能时优先返回注册商端数据；同时提供短期缓存与支持检测。
 * 作者：Ryan
 * 创建日期：2025-09-25
 * 修改记录：
 * - 2025-09-25：添加中文 JSDoc 文件头与函数注释，补充关键变量说明。
 */
/**
 * IANA RDAP Bootstrap 加载与缓存
 * - 通过 https://data.iana.org/rdap/dns.json 动态获取 TLD -> RDAP 服务器映射
 * - 使用 BOOTSTRAP_TTL 进行内存缓存，避免频繁网络请求
 * @returns Promise<void>
 */
async function ensureBootstrapLoaded(): Promise<void> {
  const now = Date.now();
  if (dynamicRdapMap && (now - lastBootstrapFetch) < BOOTSTRAP_TTL) return;
  if (bootstrapRequest) return bootstrapRequest;
  if (now - lastBootstrapAttempt < 60000) return;
  lastBootstrapAttempt = now;
  bootstrapRequest = loadBootstrap();
  try { await bootstrapRequest; } finally { bootstrapRequest = null; }
}

async function fetchJson(url: string, accept = 'application/rdap+json') {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      headers: { Accept: accept, 'User-Agent': 'WHOIS-Tool/1.0' },
      signal: controller.signal,
    });
    const data = await response.json();
    return { response, data };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function loadBootstrap(): Promise<void> {
  try {
    const { response: res, data } = await fetchJson(BOOTSTRAP_URL, 'application/json');
    if (!res.ok) {
      throw new Error(`Failed to fetch IANA RDAP bootstrap: ${res.status} ${res.statusText}`);
    }
    if (!Array.isArray(data.services)) throw new Error('Invalid IANA RDAP bootstrap');
    const map: Record<string, string[]> = {};
    if (Array.isArray(data.services)) {
      for (const entry of data.services) {
        const tlds: string[] = entry[0] || [];
        const servers: string[] = entry[1] || [];
        const bases = servers
          .filter(Boolean)
          .map(s => String(s).replace(/\/+$/, ''));
        if (bases.length > 0) {
          tlds.forEach(tld => {
            const normalized = String(tld).replace('.', '').toLowerCase();
            map[normalized] = bases;
          });
        }
      }
    }
    dynamicRdapMap = map;
    lastBootstrapFetch = Date.now();
  } catch (e) {
    console.warn('IANA RDAP bootstrap fetch failed:', e);
  }
}

/**
 * 获取域名的TLD
 */
function getTLD(domain: string): string {
  const parts = domain.toLowerCase().split('.');
  return parts[parts.length - 1];
}

// 将域名标准化为ASCII（支持IDN）
function toASCII(domain: string): string {
  try {
    const url = new URL(`http://${domain}`);
    return url.hostname.toLowerCase();
  } catch {
    return domain.toLowerCase();
  }
}

// 短期缓存以优化重复查询性能（不持久化）
const RDAP_CACHE_TTL_MS = 5 * 60 * 1000; // 5分钟
const rdapCache = new Map<string, { data: RDAPResponse; rdapSource?: 'registrar' | 'registry'; timestamp: number }>();

// 获取所有可用的RDAP服务器（来自IANA引导）
async function getRDAPServersAsync(domain: string): Promise<string[]> {
  await ensureBootstrapLoaded();
  const tld = getTLD(domain);
  const dynamic = dynamicRdapMap ? dynamicRdapMap[tld] : undefined;
  const staticBase = RDAP_SERVERS[tld as keyof typeof RDAP_SERVERS] || null;
  const servers = dynamic?.length ? dynamic : (staticBase ? [staticBase] : []);
  return servers;
}

/**
 * 获取RDAP服务器URL
 */
function isDomainResponse(data: RDAPResponse, domain: string): boolean {
  return data?.objectClassName === 'domain'
    && toASCII(data.ldhName || data.unicodeName || '') === domain;
}

/**
 * 执行RDAP域名查询，优先尝试注册服务机构RDAP
 */
export async function queryDomainRDAP(domain: string, options?: { queryParams?: Record<string, string>; preferSource?: 'registrar' | 'registry' }): Promise<(RDAPResponse & { rdapSource?: 'registrar' | 'registry'; registryRaw?: RDAPResponse; registrarRaw?: RDAPResponse }) | null> {
  const asciiDomain = toASCII(domain);
  const paramsStr = options?.queryParams ? `?${new URLSearchParams(options.queryParams).toString()}` : '';
  const cacheKey = `${asciiDomain}:${options?.preferSource || 'registrar'}:${paramsStr}`;

  // 缓存命中
  const cached = rdapCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < RDAP_CACHE_TTL_MS) {
    return { ...(cached.data as RDAPResponse), rdapSource: cached.rdapSource, registryRaw: (cached as any).data.registryRaw, registrarRaw: (cached as any).data.registrarRaw } as any;
  }

  const servers = await getRDAPServersAsync(asciiDomain);
  if (!servers || servers.length === 0) {
    throw new Error(`No RDAP server found for domain: ${asciiDomain}`);
  }

  // 依次尝试多个服务器，直到成功
  let registryData: RDAPResponse | null = null;
  let notFound = false;
  for (const serverBase of servers) {
    const registryUrl = `${serverBase}/domain/${asciiDomain}${paramsStr}`;
    try {
      const { response: registryResponse, data } = await fetchJson(registryUrl);

      if (!registryResponse.ok) {
        if (registryResponse.status === 404 && data?.errorCode === 404) notFound = true;
        // 尝试下一个服务器
        continue;
      }
      if (!isDomainResponse(data, asciiDomain)) continue;
      registryData = data;
      break;
    } catch {
      // 超时或网络错误，继续尝试下一个服务器
      continue;
    }
  }

  if (!registryData) {
    if (notFound) throw new Error('RDAP_NOT_FOUND');
    throw new Error(`RDAP query failed on all servers for ${asciiDomain}`);
  }

  // 如果指定偏好source且可用，优先返回
  const preferred = options?.preferSource;
  let finalData: RDAPResponse & { rdapSource?: 'registrar' | 'registry'; registryRaw?: RDAPResponse; registrarRaw?: RDAPResponse } = { ...registryData, rdapSource: 'registry', registryRaw: registryData };

  // 优先从注册局响应的顶层 links 和 registrar 实体 links 中提取注册商 RDAP 完整 URL
  const extractedUrl = extractRegistrarRdapUrl(registryData);
  const registrarRdapServer = extractedUrl ? null : extractRegistrarRdapServer(registryData);

  if ((extractedUrl || registrarRdapServer) && preferred !== 'registry') {
    try {
      let registrarUrl: string;
      if (extractedUrl) {
        // 清理可能存在的反引号与空白
        const clean = extractedUrl.replace(/`/g, '').trim();
        if (/\/domain\//.test(clean)) {
          // 链接已包含 /domain/<name>，合并查询参数
          registrarUrl = paramsStr
            ? (clean.includes('?') ? `${clean}&${paramsStr.slice(1)}` : `${clean}${paramsStr}`)
            : clean;
        } else {
          registrarUrl = `${clean.replace(/\/$/, '')}/domain/${asciiDomain}${paramsStr}`;
        }
      } else {
        registrarUrl = `${(registrarRdapServer as string).replace(/\/$/, '')}/domain/${asciiDomain}${paramsStr}`;
      }

      const { response: registrarResponse, data: registrarData } = await fetchJson(registrarUrl);
      if (registrarResponse.ok && isDomainResponse(registrarData, asciiDomain)) {
        finalData = { ...registrarData, rdapSource: 'registrar', registryRaw: registryData, registrarRaw: registrarData };
      }
    } catch {
      // 忽略注册商查询错误，保留注册局数据
      finalData = { ...finalData, registrarRaw: finalData.registrarRaw };
    }
  }

  // 写入缓存（包含原始两端数据）
  if (rdapCache.size >= 500) rdapCache.delete(rdapCache.keys().next().value!);
  rdapCache.set(cacheKey, { data: finalData as any, rdapSource: finalData.rdapSource, timestamp: Date.now() });

  return finalData;
}

/**
 * 从RDAP响应中提取注册服务机构RDAP服务器
 */
function extractRegistrarRdapServer(rdapData: RDAPResponse): string | null {
  // 查找注册服务机构实体
  const registrarEntity = rdapData.entities?.find(entity => 
    entity.roles?.includes('registrar')
  )
  
  if (registrarEntity?.links) {
    // 查找RDAP链接
    const rdapLink = registrarEntity.links.find(link => 
      link.rel === 'related' && 
      link.type === 'application/rdap+json'
    )
    
    if (rdapLink?.href) {
      // 提取基础URL（移除路径部分）
      try {
        const url = new URL(rdapLink.href)
        return `${url.protocol}//${url.host}`
      } catch {
        return null
      }
    }
  }
  
  return null
}

// 新增：从注册局响应的顶层 links 或 registrar 实体 links 中提取“注册商 RDAP 完整 URL”
function extractRegistrarRdapUrl(rdapData: RDAPResponse): string | null {
  // 1) 顶层 links 优先（例如 title 为 URL of Sponsoring Registrar's RDAP Record 的 related 链接）
  const fromTop = rdapData.links?.find(link => {
    const isRelated = link.rel === 'related';
    const isRdap = (link.type || '').toLowerCase() === 'application/rdap+json';
    const title = (link.title || '').toLowerCase();
    const titleHints = title.includes('sponsoring registrar');
    return isRelated && isRdap && (titleHints || true); // 即便无标题也尝试
  });
  if (fromTop?.href) {
    return fromTop.href;
  }

  // 2) 回退到 registrar 实体的 links
  const registrarEntity = rdapData.entities?.find(e => e.roles?.includes('registrar'));
  const fromEntity = registrarEntity?.links?.find(link => link.rel === 'related' && (link.type || '').toLowerCase() === 'application/rdap+json');
  if (fromEntity?.href) {
    return fromEntity.href;
  }

  return null;
}

/**
 * 执行RDAP实体查询
 */
export async function queryEntityRDAP(handle: string): Promise<RDAPResponse | null> {
  // 这里需要根据实际需求实现实体查询
  // 暂时返回null，表示不支持
  return null;
}

/**
 * 检查域名是否支持RDAP查询
 */
export function isRDAPSupported(domain: string): boolean {
  const tld = getTLD(domain);
  const hasDynamic = !!(dynamicRdapMap && dynamicRdapMap[tld] && dynamicRdapMap[tld].length > 0);
  const hasStatic = !!(RDAP_SERVERS[tld as keyof typeof RDAP_SERVERS]);
  return hasDynamic || hasStatic;
}

export function getSupportedTLDs(): string[] {
  const dynamicTlds = dynamicRdapMap ? Object.keys(dynamicRdapMap) : [];
  return Array.from(new Set([...dynamicTlds, ...Object.keys(RDAP_SERVERS)]));
}
