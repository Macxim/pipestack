import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserFromRequest } from "@/lib/get-user-from-request";
import { uploadAvatarToSupabase } from "@/lib/upload-avatar";

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

    const body = await req.json();
    const { leads, stageId } = body;

    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ error: "No leads provided." }, { status: 400 });
    }

    let targetStageId = stageId;
    if (!targetStageId) {
      const { data: stage } = await supabaseAdmin
        .from("stages")
        .select("id")
        .eq("user_id", userId)
        .order("position", { ascending: true })
        .limit(1)
        .single();

      if (!stage) return NextResponse.json({ error: "No stages found." }, { status: 404 });
      targetStageId = stage.id;
    }

    const rows = await Promise.all(leads.map(async (lead: any) => {
      let finalAvatarUrl = lead.avatarUrl ?? null;
      const isFacebookOrInstagramUrl = (url: string) => 
        url.includes("fbcdn.net") || 
        url.includes("fbsbx.com") || 
        url.includes("cdninstagram.com");

      if (finalAvatarUrl && isFacebookOrInstagramUrl(finalAvatarUrl)) {
        finalAvatarUrl = await uploadAvatarToSupabase(finalAvatarUrl, "lead") || finalAvatarUrl;
      }
      return {
        stage_id: targetStageId,
        user_id: userId,
        name: lead.name.trim(),
        value: 0,
        status: "none",
        profile_url: lead.profileUrl ?? null,
        platform: lead.platform ?? null,
        avatar_url: finalAvatarUrl,
      };
    }));

    const { data, error } = await supabaseAdmin.from("leads").insert(rows).select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, count: data.length, leads: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}