import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserFromRequest } from "@/lib/get-user-from-request";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leads } = await req.json();
    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ duplicates: [] });
    }

    const { data: existing } = await supabaseAdmin
      .from("leads")
      .select("profile_url, email")
      .eq("user_id", userId);

    const existingUrls = new Set(
      existing?.map((l) => l.profile_url).filter(Boolean) ?? []
    );
    const existingEmails = new Set(
      existing?.map((l) => l.email?.toLowerCase()).filter(Boolean) ?? []
    );

    const duplicates = leads
      .filter((lead: any) => {
        if (lead.profileUrl && existingUrls.has(lead.profileUrl)) return true;
        if (lead.email && existingEmails.has(lead.email.toLowerCase())) return true;
        return false;
      })
      .map((lead: any) => lead.profileUrl ?? lead.email);

    return NextResponse.json({ duplicates });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
