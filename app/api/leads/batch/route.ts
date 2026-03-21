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
        email: lead.email ?? null,
        profile_url: lead.profileUrl ?? null,
        platform: lead.platform ?? null,
        avatar_url: finalAvatarUrl,
      };
    }));

    // ── Duplicate filtering ──────────────────────────────────────────
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

    const filtered = rows.filter((lead) => {
      if (lead.profile_url && existingUrls.has(lead.profile_url)) return false;
      if (lead.email && existingEmails.has(lead.email?.toLowerCase())) return false;
      return true;
    });

    const skipped = rows.length - filtered.length;

    if (filtered.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        skipped,
        message: "All leads already exist in your pipeline.",
      });
    }

    const { data, error } = await supabaseAdmin.from("leads").insert(filtered).select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, count: data.length, skipped, leads: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}