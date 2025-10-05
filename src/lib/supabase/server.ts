
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const createClient = (cookieStore?: Awaited<ReturnType<typeof cookies>>) => {
  // cookieStore가 제공되지 않은 경우 (API 라우트에서 사용)
  if (!cookieStore) {
    return createServerClient(
      supabaseUrl!,
      supabaseKey!,
      {
        cookies: {
          getAll() {
            return []
          },
          setAll() {
            // API 라우트에서는 쿠키 설정하지 않음
          },
        },
      },
    );
  }

  // Server Component에서 사용할 때
  return createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
};

// Service Role 클라이언트 - 관리자 권한으로 RLS 우회 가능
export const createServiceRoleClient = () => {
  return createServerClient(
    supabaseUrl!,
    supabaseServiceRoleKey!,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll() {
          // Service Role 클라이언트는 쿠키 사용하지 않음
        },
      },
    },
  );
};
