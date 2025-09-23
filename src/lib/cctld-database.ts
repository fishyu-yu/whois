/**
 * 国别顶级域名（ccTLD）数据库
 * 包含域名后缀与国家/地区的映射关系，以及相关的注册局信息
 */

export interface CCTLDInfo {
  code: string;           // 国家/地区代码
  country: string;        // 国家/地区名称（中文）
  countryEn: string;      // 国家/地区名称（英文）
  registry: string;       // 注册局名称
  registryUrl?: string;   // 注册局官网
  whoisServer?: string;   // WHOIS服务器
  idn: boolean;          // 是否支持国际化域名
  active: boolean;       // 是否活跃
  notes?: string;        // 备注信息
}

/**
 * 国别域名数据库
 * 数据来源：IANA ccTLD Database
 */
export const CCTLD_DATABASE: Record<string, CCTLDInfo> = {
  // 亚洲地区
  'cn': {
    code: 'CN',
    country: '中国',
    countryEn: 'China',
    registry: 'CNNIC (China Internet Network Information Center)',
    registryUrl: 'https://www.cnnic.cn/',
    whoisServer: 'whois.cnnic.cn',
    idn: true,
    active: true
  },
  'hk': {
    code: 'HK',
    country: '香港',
    countryEn: 'Hong Kong',
    registry: 'HKIRC (Hong Kong Internet Registration Corporation)',
    registryUrl: 'https://www.hkirc.hk/',
    whoisServer: 'whois.hkirc.hk',
    idn: true,
    active: true
  },
  'tw': {
    code: 'TW',
    country: '台湾',
    countryEn: 'Taiwan',
    registry: 'TWNIC (Taiwan Network Information Center)',
    registryUrl: 'https://www.twnic.net/',
    whoisServer: 'whois.twnic.net',
    idn: true,
    active: true
  },
  'jp': {
    code: 'JP',
    country: '日本',
    countryEn: 'Japan',
    registry: 'JPRS (Japan Registry Services)',
    registryUrl: 'https://jprs.jp/',
    whoisServer: 'whois.jprs.jp',
    idn: true,
    active: true
  },
  'kr': {
    code: 'KR',
    country: '韩国',
    countryEn: 'South Korea',
    registry: 'KISA (Korea Internet & Security Agency)',
    registryUrl: 'https://www.kisa.or.kr/',
    whoisServer: 'whois.kr',
    idn: true,
    active: true
  },
  'sg': {
    code: 'SG',
    country: '新加坡',
    countryEn: 'Singapore',
    registry: 'SGNIC (Singapore Network Information Centre)',
    registryUrl: 'https://www.sgnic.sg/',
    whoisServer: 'whois.sgnic.sg',
    idn: false,
    active: true
  },
  'my': {
    code: 'MY',
    country: '马来西亚',
    countryEn: 'Malaysia',
    registry: 'MYNIC (Malaysia Network Information Centre)',
    registryUrl: 'https://www.mynic.my/',
    whoisServer: 'whois.mynic.my',
    idn: true,
    active: true
  },
  'th': {
    code: 'TH',
    country: '泰国',
    countryEn: 'Thailand',
    registry: 'THNIC (Thai Network Information Center)',
    registryUrl: 'https://www.thnic.co.th/',
    whoisServer: 'whois.thnic.co.th',
    idn: true,
    active: true
  },
  'in': {
    code: 'IN',
    country: '印度',
    countryEn: 'India',
    registry: 'NIXI (National Internet Exchange of India)',
    registryUrl: 'https://www.registry.in/',
    whoisServer: 'whois.registry.in',
    idn: true,
    active: true
  },

  // 欧洲地区
  'uk': {
    code: 'GB',
    country: '英国',
    countryEn: 'United Kingdom',
    registry: 'Nominet UK',
    registryUrl: 'https://www.nominet.uk/',
    whoisServer: 'whois.nominet.uk',
    idn: false,
    active: true
  },
  'de': {
    code: 'DE',
    country: '德国',
    countryEn: 'Germany',
    registry: 'DENIC eG',
    registryUrl: 'https://www.denic.de/',
    whoisServer: 'whois.denic.de',
    idn: true,
    active: true
  },
  'fr': {
    code: 'FR',
    country: '法国',
    countryEn: 'France',
    registry: 'AFNIC (Association Française pour le Nommage Internet en Coopération)',
    registryUrl: 'https://www.afnic.fr/',
    whoisServer: 'whois.afnic.fr',
    idn: true,
    active: true
  },
  'it': {
    code: 'IT',
    country: '意大利',
    countryEn: 'Italy',
    registry: 'IIT-CNR (Istituto di Informatica e Telematica)',
    registryUrl: 'https://www.nic.it/',
    whoisServer: 'whois.nic.it',
    idn: true,
    active: true
  },
  'es': {
    code: 'ES',
    country: '西班牙',
    countryEn: 'Spain',
    registry: 'Red.es',
    registryUrl: 'https://www.dominios.es/',
    whoisServer: 'whois.nic.es',
    idn: true,
    active: true
  },
  'nl': {
    code: 'NL',
    country: '荷兰',
    countryEn: 'Netherlands',
    registry: 'SIDN (Stichting Internet Domeinregistratie Nederland)',
    registryUrl: 'https://www.sidn.nl/',
    whoisServer: 'whois.domain-registry.nl',
    idn: true,
    active: true
  },
  'ru': {
    code: 'RU',
    country: '俄罗斯',
    countryEn: 'Russia',
    registry: 'RU-CENTER (Regional Network Information Center)',
    registryUrl: 'https://www.nic.ru/',
    whoisServer: 'whois.tcinet.ru',
    idn: true,
    active: true
  },

  // 北美地区
  'us': {
    code: 'US',
    country: '美国',
    countryEn: 'United States',
    registry: 'Registry Services, LLC',
    registryUrl: 'https://www.about.us/',
    whoisServer: 'whois.nic.us',
    idn: false,
    active: true
  },
  'ca': {
    code: 'CA',
    country: '加拿大',
    countryEn: 'Canada',
    registry: 'CIRA (Canadian Internet Registration Authority)',
    registryUrl: 'https://www.cira.ca/',
    whoisServer: 'whois.cira.ca',
    idn: true,
    active: true
  },
  'mx': {
    code: 'MX',
    country: '墨西哥',
    countryEn: 'Mexico',
    registry: 'NIC Mexico',
    registryUrl: 'https://www.registry.mx/',
    whoisServer: 'whois.mx',
    idn: true,
    active: true
  },

  // 大洋洲地区
  'au': {
    code: 'AU',
    country: '澳大利亚',
    countryEn: 'Australia',
    registry: 'auDA (Australian Domain Administration)',
    registryUrl: 'https://www.auda.org.au/',
    whoisServer: 'whois.auda.org.au',
    idn: false,
    active: true
  },
  'nz': {
    code: 'NZ',
    country: '新西兰',
    countryEn: 'New Zealand',
    registry: 'InternetNZ',
    registryUrl: 'https://internetnz.nz/',
    whoisServer: 'whois.srs.net.nz',
    idn: false,
    active: true
  },

  // 南美地区
  'br': {
    code: 'BR',
    country: '巴西',
    countryEn: 'Brazil',
    registry: 'Registro.br',
    registryUrl: 'https://registro.br/',
    whoisServer: 'whois.registro.br',
    idn: true,
    active: true
  },
  'ar': {
    code: 'AR',
    country: '阿根廷',
    countryEn: 'Argentina',
    registry: 'NIC Argentina',
    registryUrl: 'https://www.nic.ar/',
    whoisServer: 'whois.nic.ar',
    idn: true,
    active: true
  },

  // 非洲地区
  'za': {
    code: 'ZA',
    country: '南非',
    countryEn: 'South Africa',
    registry: 'ZADNA (ZA Domain Name Authority)',
    registryUrl: 'https://www.zadna.org.za/',
    whoisServer: 'whois.registry.net.za',
    idn: false,
    active: true
  },

  // 中东地区
  'ae': {
    code: 'AE',
    country: '阿联酋',
    countryEn: 'United Arab Emirates',
    registry: 'UAE Domain Administration (.ae)',
    registryUrl: 'https://www.aeda.ae/',
    whoisServer: 'whois.aeda.net.ae',
    idn: true,
    active: true
  },
  'sa': {
    code: 'SA',
    country: '沙特阿拉伯',
    countryEn: 'Saudi Arabia',
    registry: 'SaudiNIC',
    registryUrl: 'https://nic.sa/',
    whoisServer: 'whois.nic.net.sa',
    idn: true,
    active: true
  }
};

/**
 * 根据域名后缀获取国别域名信息
 */
export function getCCTLDInfo(tld: string): CCTLDInfo | null {
  const normalizedTLD = tld.toLowerCase().replace('.', '');
  return CCTLD_DATABASE[normalizedTLD] || null;
}

/**
 * 检查是否为国别域名
 */
export function isCCTLD(tld: string): boolean {
  const normalizedTLD = tld.toLowerCase().replace('.', '');
  return normalizedTLD in CCTLD_DATABASE;
}

/**
 * 获取所有支持的国别域名列表
 */
export function getAllCCTLDs(): string[] {
  return Object.keys(CCTLD_DATABASE);
}

/**
 * 根据国家/地区名称搜索国别域名
 */
export function searchCCTLDByCountry(countryName: string): CCTLDInfo[] {
  const searchTerm = countryName.toLowerCase();
  return Object.values(CCTLD_DATABASE).filter(info => 
    info.country.toLowerCase().includes(searchTerm) ||
    info.countryEn.toLowerCase().includes(searchTerm)
  );
}

/**
 * 获取支持IDN的国别域名列表
 */
export function getIDNSupportedCCTLDs(): string[] {
  return Object.entries(CCTLD_DATABASE)
    .filter(([_, info]) => info.idn)
    .map(([tld, _]) => tld);
}

/**
 * 根据地区获取国别域名
 */
export function getCCTLDsByRegion(): Record<string, string[]> {
  return {
    '亚洲': ['cn', 'hk', 'tw', 'jp', 'kr', 'sg', 'my', 'th', 'in'],
    '欧洲': ['uk', 'de', 'fr', 'it', 'es', 'nl', 'ru'],
    '北美': ['us', 'ca', 'mx'],
    '大洋洲': ['au', 'nz'],
    '南美': ['br', 'ar'],
    '非洲': ['za'],
    '中东': ['ae', 'sa']
  };
}