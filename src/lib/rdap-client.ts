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
  'cn': 'https://rdap.cnnic.cn',
  'uk': 'https://rdap.nominet.uk',
  'de': 'https://rdap.denic.de',
  'fr': 'https://rdap.nic.fr',
  'jp': 'https://rdap.nic.ad.jp',
  
  // 新顶级域名
  'xyz': 'https://rdap.centralnic.com/xyz',
  'top': 'https://rdap.nic.top',
  'online': 'https://rdap.centralnic.com/online',
  'site': 'https://rdap.centralnic.com/site'
};

/**
 * 获取域名的TLD
 */
function getTLD(domain: string): string {
  const parts = domain.toLowerCase().split('.');
  return parts[parts.length - 1];
}

/**
 * 获取RDAP服务器URL
 */
function getRDAPServer(domain: string): string | null {
  const tld = getTLD(domain);
  return RDAP_SERVERS[tld as keyof typeof RDAP_SERVERS] || null;
}

/**
 * 执行RDAP域名查询，优先尝试注册服务机构RDAP
 */
export async function queryDomainRDAP(domain: string): Promise<RDAPResponse & { rdapSource?: 'registrar' | 'registry' } | null> {
  const server = getRDAPServer(domain)
  if (!server) {
    throw new Error(`No RDAP server found for domain: ${domain}`)
  }

  // 首先尝试从注册局RDAP获取注册服务机构信息
  const registryUrl = `${server}/domain/${domain}`
  
  try {
    // 使用AbortController实现超时
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    
    const registryResponse = await fetch(registryUrl, {
      headers: {
        'Accept': 'application/rdap+json',
        'User-Agent': 'WHOIS-Tool/1.0'
      },
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (!registryResponse.ok) {
      console.error(`RDAP registry query failed for ${domain}: ${registryResponse.status} ${registryResponse.statusText}`)
      throw new Error(`RDAP query failed: ${registryResponse.status} ${registryResponse.statusText}`)
    }

    const registryData = await registryResponse.json()
    console.log(`RDAP registry query successful for ${domain}:`, registryData)
    
    // 尝试从注册局数据中提取注册服务机构RDAP服务器
    const registrarRdapServer = extractRegistrarRdapServer(registryData)
    
    if (registrarRdapServer) {
      try {
        // 尝试查询注册服务机构RDAP
        const registrarController = new AbortController()
        const registrarTimeoutId = setTimeout(() => registrarController.abort(), 10000)
        
        const registrarUrl = `${registrarRdapServer}/domain/${domain}`
        const registrarResponse = await fetch(registrarUrl, {
          headers: {
            'Accept': 'application/rdap+json',
            'User-Agent': 'WHOIS-Tool/1.0'
          },
          signal: registrarController.signal
        })
        
        clearTimeout(registrarTimeoutId)
        
        if (registrarResponse.ok) {
          const registrarData = await registrarResponse.json()
          console.log(`RDAP registrar query successful for ${domain}:`, registrarData)
          return { ...registrarData, rdapSource: 'registrar' }
        } else {
          console.warn(`RDAP registrar query failed for ${domain}, falling back to registry data`)
        }
      } catch (registrarError) {
        console.warn(`RDAP registrar query error for ${domain}, falling back to registry data:`, registrarError)
      }
    }
    
    // 如果注册服务机构RDAP不可用，返回注册局数据
    return { ...registryData, rdapSource: 'registry' }
  } catch (error) {
    console.error(`RDAP query error for ${domain}:`, error)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('RDAP query timeout')
    }
    throw error
  }
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
  return tld in RDAP_SERVERS;
}

/**
 * 获取支持的TLD列表
 */
export function getSupportedTLDs(): string[] {
  return Object.keys(RDAP_SERVERS);
}