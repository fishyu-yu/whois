"use client"

import { useParams } from 'next/navigation'
import { QueryPage } from '@/components/query-page'

export default function QueryDetails() {
  const params = useParams<{ domain: string }>()
  // Encoded separators can remain escaped in client route parameters.
  let query = params.domain
  try { query = decodeURIComponent(query) } catch { /* Let API validation report malformed input. */ }
  return <QueryPage initialQuery={query} />
}
