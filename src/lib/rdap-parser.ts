/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * RDAP数据解析器
 * 将RDAP响应转换为统一的WHOIS格式
 */

import { RDAPResponse, RDAPEntity, RDAPEvent } from './rdap-client';

export interface ParsedRDAPData {
  domain_name?: string;
  registry_domain_id?: string;
  registrar?: string;
  registrar_whois_server?: string;
  registrar_url?: string;
  updated_date?: string;
  creation_date?: string;
  registry_expiry_date?: string;
  registrar_iana_id?: string;
  registrar_abuse_contact_email?: string;
  registrar_abuse_contact_phone?: string;
  domain_status?: string[];
  name_server?: string[];
  dnssec?: string;
  registrant_name?: string;
  registrant_organization?: string;
  registrant_email?: string;
  registrant_phone?: string;
  registrant_country?: string;
  admin_name?: string;
  admin_organization?: string;
  admin_email?: string;
  admin_phone?: string;
  admin_country?: string;
  tech_name?: string;
  tech_organization?: string;
  tech_email?: string;
  tech_phone?: string;
  tech_country?: string;
  // 新增：账单联系人
  billing_name?: string;
  billing_organization?: string;
  billing_email?: string;
  billing_phone?: string;
  billing_country?: string;
}

/**
 * 文件：src/lib/rdap-parser.ts
 * 用途：解析 RDAP 响应为统一的 WHOIS 字段表示，并支持将结构化数据回转为 WHOIS 文本。
 * 作者：Ryan
 * 创建日期：2025-09-25
 * 修改记录：
 * - 2025-09-25：添加中文 JSDoc 文件头与函数注释，说明解析流程与字段含义。
 */
function parseVCard(vcardArray: any[]): any {
  if (!vcardArray || !Array.isArray(vcardArray) || vcardArray.length < 2) {
    return {};
  }

  const properties = vcardArray[1];
  const result: any = {};

  for (const prop of properties) {
    if (!Array.isArray(prop) || prop.length < 4) continue;

    const [name, params, type, value] = prop;
    
    switch (name.toLowerCase()) {
      case 'fn':
        result.name = value;
        break;
      case 'org':
        result.organization = value;
        break;
      case 'email':
        result.email = value;
        break;
      case 'tel':
        result.phone = value;
        break;
      case 'adr':
        if (Array.isArray(value) && value.length > 6) {
          result.country = value[6]; // 国家通常在第7个位置
        }
        break;
    }
  }

  return result;
}

/**
 * 根据角色查找实体
 */
function findEntityByRole(entities: RDAPEntity[] | undefined, role: string): RDAPEntity | undefined {
  if (!entities) return undefined;
  
  return entities.find(entity => 
    entity.roles && entity.roles.includes(role)
  );
}

/**
 * 解析事件数据
 */
function parseEvents(events: RDAPEvent[] | undefined): { [key: string]: string } {
  const result: { [key: string]: string } = {};
  
  if (!events) return result;

  for (const event of events) {
    switch (event.eventAction.toLowerCase()) {
      case 'registration':
        result.creation_date = event.eventDate;
        break;
      case 'expiration':
        result.registry_expiry_date = event.eventDate;
        break;
      case 'last changed':
      case 'last update of rdap database':
        result.updated_date = event.eventDate;
        break;
    }
  }

  return result;
}

/**
 * 解析RDAP响应
 */
export function parseRDAPResponse(rdapData: RDAPResponse): ParsedRDAPData {
  const result: ParsedRDAPData = {};

  // 基本域名信息
  if (rdapData.ldhName) {
    result.domain_name = rdapData.ldhName.toUpperCase();
  }

  if (rdapData.handle) {
    result.registry_domain_id = rdapData.handle;
  }

  // 域名状态
  if (rdapData.status) {
    result.domain_status = rdapData.status;
  }

  // 解析事件
  const eventData = parseEvents(rdapData.events);
  Object.assign(result, eventData);

  // 解析名称服务器
  if (rdapData.nameservers) {
    result.name_server = rdapData.nameservers
      .map(ns => ns.ldhName)
      .filter(name => name) as string[];
  }

  // 解析DNSSEC
  if (rdapData.secureDNS) {
    result.dnssec = rdapData.secureDNS.delegationSigned ? 'signedDelegation' : 'unsigned';
  }

  // 解析实体信息
  if (rdapData.entities) {
    // 查找注册商
    const registrarEntity = findEntityByRole(rdapData.entities, 'registrar');
    if (registrarEntity) {
      if (registrarEntity.vcardArray) {
        const registrarInfo = parseVCard(registrarEntity.vcardArray);
        result.registrar = registrarInfo.name || registrarInfo.organization;
      }
      if (registrarEntity.port43) {
        result.registrar_whois_server = registrarEntity.port43;
      }
    }

    // 查找注册人
    const registrantEntity = findEntityByRole(rdapData.entities, 'registrant');
    if (registrantEntity && registrantEntity.vcardArray) {
      const registrantInfo = parseVCard(registrantEntity.vcardArray);
      result.registrant_name = registrantInfo.name;
      result.registrant_organization = registrantInfo.organization;
      result.registrant_email = registrantInfo.email;
      result.registrant_phone = registrantInfo.phone;
      result.registrant_country = registrantInfo.country;
    }

    // 查找管理联系人
    const adminEntity = findEntityByRole(rdapData.entities, 'administrative');
    if (adminEntity && adminEntity.vcardArray) {
      const adminInfo = parseVCard(adminEntity.vcardArray);
      result.admin_name = adminInfo.name;
      result.admin_organization = adminInfo.organization;
      result.admin_email = adminInfo.email;
      result.admin_phone = adminInfo.phone;
      // 可选：国家
      if (adminInfo.country) result.admin_country = adminInfo.country;
    }

    // 查找技术联系人
    const techEntity = findEntityByRole(rdapData.entities, 'technical');
    if (techEntity && techEntity.vcardArray) {
      const techInfo = parseVCard(techEntity.vcardArray);
      result.tech_name = techInfo.name;
      result.tech_organization = techInfo.organization;
      result.tech_email = techInfo.email;
      result.tech_phone = techInfo.phone;
      // 可选：国家
      if (techInfo.country) result.tech_country = techInfo.country;
    }

    // 新增：查找账单联系人
    const billingEntity = findEntityByRole(rdapData.entities, 'billing');
    if (billingEntity && billingEntity.vcardArray) {
      const billingInfo = parseVCard(billingEntity.vcardArray);
      result.billing_name = billingInfo.name;
      result.billing_organization = billingInfo.organization;
      result.billing_email = billingInfo.email;
      result.billing_phone = billingInfo.phone;
      result.billing_country = billingInfo.country;
    }
  }

  return result;
}

/**
 * 将解析后的RDAP数据转换为WHOIS格式的原始文本
 */
export function rdapToWhoisText(parsedData: ParsedRDAPData): string {
  const lines: string[] = [];

  if (parsedData.domain_name) {
    lines.push(`Domain Name: ${parsedData.domain_name}`);
  }

  if (parsedData.registry_domain_id) {
    lines.push(`Registry Domain ID: ${parsedData.registry_domain_id}`);
  }

  if (parsedData.registrar) {
    lines.push(`Registrar: ${parsedData.registrar}`);
  }

  if (parsedData.registrar_whois_server) {
    lines.push(`Registrar WHOIS Server: ${parsedData.registrar_whois_server}`);
  }

  if (parsedData.registrar_url) {
    lines.push(`Registrar URL: ${parsedData.registrar_url}`);
  }

  if (parsedData.updated_date) {
    lines.push(`Updated Date: ${parsedData.updated_date}`);
  }

  if (parsedData.creation_date) {
    lines.push(`Creation Date: ${parsedData.creation_date}`);
  }

  if (parsedData.registry_expiry_date) {
    lines.push(`Registry Expiry Date: ${parsedData.registry_expiry_date}`);
  }

  if (parsedData.domain_status) {
    parsedData.domain_status.forEach(status => {
      lines.push(`Domain Status: ${status}`);
    });
  }

  if (parsedData.name_server) {
    parsedData.name_server.forEach(ns => {
      lines.push(`Name Server: ${ns}`);
    });
  }

  if (parsedData.dnssec) {
    lines.push(`DNSSEC: ${parsedData.dnssec}`);
  }

  // 添加联系人信息（注册人）
  if (parsedData.registrant_name) {
    lines.push(`Registrant Name: ${parsedData.registrant_name}`);
  }
  if (parsedData.registrant_organization) {
    lines.push(`Registrant Organization: ${parsedData.registrant_organization}`);
  }
  if (parsedData.registrant_email) {
    lines.push(`Registrant Email: ${parsedData.registrant_email}`);
  }
  if (parsedData.registrant_phone) {
    lines.push(`Registrant Phone: ${parsedData.registrant_phone}`);
  }

  // 行政联系人
  if (parsedData.admin_name) {
    lines.push(`Admin Name: ${parsedData.admin_name}`);
  }
  if (parsedData.admin_organization) {
    lines.push(`Admin Organization: ${parsedData.admin_organization}`);
  }
  if (parsedData.admin_email) {
    lines.push(`Admin Email: ${parsedData.admin_email}`);
  }
  if (parsedData.admin_phone) {
    lines.push(`Admin Phone: ${parsedData.admin_phone}`);
  }

  // 技术联系人
  if (parsedData.tech_name) {
    lines.push(`Tech Name: ${parsedData.tech_name}`);
  }
  if (parsedData.tech_organization) {
    lines.push(`Tech Organization: ${parsedData.tech_organization}`);
  }
  if (parsedData.tech_email) {
    lines.push(`Tech Email: ${parsedData.tech_email}`);
  }
  if (parsedData.tech_phone) {
    lines.push(`Tech Phone: ${parsedData.tech_phone}`);
  }

  // 账单联系人
  if (parsedData.billing_name) {
    lines.push(`Billing Name: ${parsedData.billing_name}`);
  }
  if (parsedData.billing_organization) {
    lines.push(`Billing Organization: ${parsedData.billing_organization}`);
  }
  if (parsedData.billing_email) {
    lines.push(`Billing Email: ${parsedData.billing_email}`);
  }
  if (parsedData.billing_phone) {
    lines.push(`Billing Phone: ${parsedData.billing_phone}`);
  }

  return lines.join('\n');
}