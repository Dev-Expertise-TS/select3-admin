// 서버 액션으로 대체됨. 안전을 위해 410 Gone 반환
export async function POST() {
  return new Response(null, { status: 410 })
}


