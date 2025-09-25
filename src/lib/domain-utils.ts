/**
 * 域名处理工具函数
 * 包含域名验证、格式化、IDN转换等功能
 */

import { getCCTLDInfo, isCCTLD } from './cctld-database';
import * as punycodeLib from 'punycode'

// 为 punycode 模块声明最小类型接口
type PunycodeModule = {
  toASCII: (input: string) => string
  toUnicode: (input: string) => string
}

// 统一使用 ESM 静态导入，避免 require 与运行时动态导入
const punycode: PunycodeModule | null = (punycodeLib as unknown as PunycodeModule)

/**
 * 域名验证结果接口
 */
export interface DomainValidationResult {
  isValid: boolean;
  type: 'domain' | 'subdomain' | 'invalid';
  tld: string;
  sld: string; // Second Level Domain
  isCCTLD: boolean;
  isIDN: boolean;
  punycode?: string;
  unicode?: string;
  country?: string;
  registry?: string;
  errors: string[];
}

/**
 * 验证域名格式
 */
export function validateDomain(domain: string): DomainValidationResult {
  const result: DomainValidationResult = {
    isValid: false,
    type: 'invalid',
    tld: '',
    sld: '',
    isCCTLD: false,
    isIDN: false,
    errors: []
  };

  // 基本检查
  if (!domain || typeof domain !== 'string') {
    result.errors.push('域名不能为空');
    return result;
  }

  const trimmedDomain = domain.trim().toLowerCase();
  
  if (trimmedDomain.length === 0) {
    result.errors.push('域名不能为空');
    return result;
  }

  if (trimmedDomain.length > 253) {
    result.errors.push('域名长度不能超过253个字符');
    return result;
  }

  // 检查是否包含非法字符
  if (/[^a-z0-9.-\u00a0-\uffff]/.test(trimmedDomain)) {
    result.errors.push('域名包含非法字符');
    return result;
  }

  // 检查是否以点开头或结尾
  if (trimmedDomain.startsWith('.') || trimmedDomain.endsWith('.')) {
    result.errors.push('域名不能以点开头或结尾');
    return result;
  }

  // 检查连续的点
  if (trimmedDomain.includes('..')) {
    result.errors.push('域名不能包含连续的点');
    return result;
  }

  // 分割域名
  const parts = trimmedDomain.split('.');
  
  if (parts.length < 2) {
    result.errors.push('域名必须包含至少一个点');
    return result;
  }

  // 验证每个部分
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    
    if (part.length === 0) {
      result.errors.push(`域名第${i + 1}部分不能为空`);
      continue;
    }
    
    if (part.length > 63) {
      result.errors.push(`域名第${i + 1}部分长度不能超过63个字符`);
      continue;
    }
    
    // 检查是否以连字符开头或结尾
    if (part.startsWith('-') || part.endsWith('-')) {
      result.errors.push(`域名第${i + 1}部分不能以连字符开头或结尾`);
      continue;
    }
  }

  if (result.errors.length > 0) {
    return result;
  }

  // 提取TLD和SLD
  result.tld = parts[parts.length - 1];
  result.sld = parts.length > 1 ? parts[parts.length - 2] : '';
  
  // 检查是否为国别域名
  result.isCCTLD = isCCTLD(result.tld);
  
  // 检查是否为IDN
  result.isIDN = /[\u00a0-\uffff]/.test(trimmedDomain) || trimmedDomain.includes('xn--');
  
  // 如果是国别域名，获取相关信息
  if (result.isCCTLD) {
    const cctldInfo = getCCTLDInfo(result.tld);
    if (cctldInfo) {
      result.country = cctldInfo.country;
      result.registry = cctldInfo.registry;
    }
  }

  // IDN转换
  if (result.isIDN) {
    try {
      if (trimmedDomain.includes('xn--')) {
        // Punycode to Unicode
        result.punycode = trimmedDomain;
        result.unicode = punycodeToUnicode(trimmedDomain);
      } else {
        // Unicode to Punycode
        result.unicode = trimmedDomain;
        result.punycode = unicodeToPunycode(trimmedDomain);
      }
    } catch (error) {
      result.errors.push('IDN转换失败');
    }
  }

  // 确定域名类型
  if (parts.length === 2) {
    result.type = 'domain';
  } else if (parts.length > 2) {
    result.type = 'subdomain';
  }

  result.isValid = result.errors.length === 0;
  
  return result;
}

/**
 * 提取域名的TLD
 */
export function extractTLD(domain: string): string {
  if (!domain) return '';
  const parts = domain.toLowerCase().split('.');
  return parts[parts.length - 1];
}

/**
 * 提取域名的SLD（二级域名）
 */
export function extractSLD(domain: string): string {
  if (!domain) return '';
  const parts = domain.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 2] : '';
}

/**
 * 获取域名的根域名（不包含子域名）
 */
export function getRootDomain(domain: string): string {
  if (!domain) return '';
  const parts = domain.toLowerCase().split('.');
  if (parts.length < 2) return domain;
  return parts.slice(-2).join('.');
}

/**
 * 检查是否为子域名
 */
export function isSubdomain(domain: string): boolean {
  if (!domain) return false;
  const parts = domain.split('.');
  return parts.length > 2;
}

/**
 * Punycode转Unicode实现
 */
function punycodeToUnicode(punycodeDomain: string): string {
  try {
    if (punycode) {
      return punycode.toUnicode(punycodeDomain)
    }
    
    // 回退到浏览器内置API
    if (typeof URL !== 'undefined') {
      const url = new URL(`http://${punycodeDomain}`)
      return url.hostname
    }
    
    return punycodeDomain
  } catch (error) {
    console.warn('Punycode to Unicode conversion failed:', error)
    return punycodeDomain
  }
}

/**
 * Unicode转Punycode实现
 */
function unicodeToPunycode(unicodeDomain: string): string {
  try {
    if (punycode) {
      return punycode.toASCII(unicodeDomain)
    }
    
    // 回退到浏览器内置API
    if (typeof URL !== 'undefined') {
      const url = new URL(`http://${unicodeDomain}`)
      return url.hostname
    }
    
    return unicodeDomain
  } catch (error) {
    console.warn('Unicode to Punycode conversion failed:', error)
    return unicodeDomain
  }
}

/**
 * 格式化域名显示
 */
export function formatDomainDisplay(domain: string): {
  display: string
  punycode?: string
  unicode?: string
} {
  const validation = validateDomain(domain)
  
  if (!validation.isValid) {
    return { display: domain }
  }

  const result: { display: string; punycode?: string; unicode?: string } = { display: domain }

  if (validation.isIDN) {
    if (validation.unicode && validation.punycode) {
      result.unicode = validation.unicode
      result.punycode = validation.punycode
      // 优先显示Unicode版本
      result.display = validation.unicode
    }
  }

  return result
}

/**
 * 获取域名的WHOIS服务器
 */
export function getDomainWhoisServer(domain: string): string | null {
  const tld = extractTLD(domain);
  
  if (isCCTLD(tld)) {
    const cctldInfo = getCCTLDInfo(tld);
    return cctldInfo?.whoisServer || null;
  }

  // 通用顶级域名的WHOIS服务器
  const gtldServers: Record<string, string> = {
    'com': 'whois.verisign-grs.com',
    'net': 'whois.verisign-grs.com',
    'org': 'whois.pir.org',
    'info': 'whois.afilias.net',
    'biz': 'whois.neulevel.biz',
    'name': 'whois.nic.name',
    'mobi': 'whois.dotmobiregistry.net'
  };

  return gtldServers[tld] || null;
}

/**
 * 检查域名是否支持IDN
 */
export function supportsIDN(domain: string): boolean {
  const tld = extractTLD(domain);
  
  if (isCCTLD(tld)) {
    const cctldInfo = getCCTLDInfo(tld);
    return cctldInfo?.idn || false;
  }

  // 大多数gTLD都支持IDN
  const idnSupportedGTLDs = ['com', 'net', 'org', 'info', 'biz', 'name'];
  return idnSupportedGTLDs.includes(tld);
}