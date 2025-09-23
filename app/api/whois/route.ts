import { NextRequest, NextResponse } from "next/server"
import whoiser from "whoiser"
import LRU from "lru-cache"
import { Redis } from "@upstash/redis"

const lru = new LRU<string, any>({ max: 200, ttl: 1000 * 60 * 5 })

const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null

function parseKey(type: string, q: string) {
  return `whois:${type}:${q}`
}

async function queryWhois(type: string, q: string) {
  switch (type) {
    case "domain": {
      return await whoiser.domain(q)
    }
    case "ipv4":
    case "ipv6": {
      return await whoiser.ip(q)
    }
    case "asn": {
      const asn = q.startsWith("AS") ? q.slice(2) : q
      return await whoiser.asn(asn)
    }
    case "cidr": {
      return await whoiser.ip(q)
    }
    default:
      throw new Error("Unsupported type")
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type") || "domain"
  const q = (searchParams.get("q") || "").trim()

  if (!q) return NextResponse.json({ error: "Missing q" }, { status: 400 })

  const key = parseKey(type, q)

  try {
    // 1) LRU
    const cached = lru.get(key)
    if (cached) return NextResponse.json({ source: "cache", type, q, data: cached })

    // 2) Redis
    if (redis) {
      const r = await redis.get(key)
      if (r) {
        lru.set(key, r)
        return NextResponse.json({ source: "redis", type, q, data: r })
      }
    }

    // 3) Query upstream
    const data = await queryWhois(type, q)

    // cache write
    lru.set(key, data)
    if (redis) await redis.set(key, data, { ex: 60 * 60 })

    return NextResponse.json({ source: "live", type, q, data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "query failed" }, { status: 500 })
  }
}