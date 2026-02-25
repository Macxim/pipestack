import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { leads, stageId } = body;

    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ error: "No leads provided." }, { status: 400 });
    }

    let targetStageId = stageId;
    if (!targetStageId) {
      const { data: stage } = await supabase
        .from("stages")
        .select("id")
        .eq("user_id", user.id)
        .order("position", { ascending: true })
        .limit(1)
        .single();

      if (!stage) return NextResponse.json({ error: "No stages found." }, { status: 404 });
      targetStageId = stage.id;
    }

    const rows = leads.map((lead: any) => ({
      stage_id: targetStageId,
      user_id: user.id,
      name: lead.name.trim(),
      value: 0,
      status: "none",
      profile_url: lead.profileUrl ?? null,
      platform: lead.platform ?? null,
      avatar_url: lead.avatarUrl ?? null,
    }));

    const { data, error } = await supabase.from("leads").insert(rows).select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, count: data.length, leads: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}