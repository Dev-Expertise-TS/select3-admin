import { NextRequest, NextResponse } from 'next/server'

const ENDPOINT = 'https://api.api-ninjas.com/v1/airports'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const iata = searchParams.get('iata') // e.g. LHR, ICN
  const icao = searchParams.get('icao') // 대안
  const city = searchParams.get('city') // 도시명으로 검색

  if (!iata && !icao && !city) {
    return NextResponse.json({ error: 'Provide iata, icao, or city' }, { status: 400 })
  }

  let url = ENDPOINT
  if (iata) {
    url += `?iata=${iata}`
  } else if (icao) {
    url += `?icao=${icao}`
  } else if (city) {
    url += `?city=${encodeURIComponent(city)}`
  }

  const res = await fetch(url, {
    headers: { 'X-Api-Key': process.env.API_NINJAS_KEY! },
    // Next.js 캐싱 전략(필요 시 조정)
    next: { revalidate: 60 * 60 },
  })
  const data = await res.json()
  return NextResponse.json(data)
}

