import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leads, stageId } = body;

    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json(
        { error: "No leads provided." },
        { status: 400 }
      );
    }

    // Use provided stageId or fall back to first stage
    let targetStageId = stageId;
    if (!targetStageId) {
      const { data: stage, error: stageError } = await supabase
        .from("stages")
        .select("id")
        .order("position", { ascending: true })
        .limit(1)
        .single();

      if (stageError || !stage) {
        return NextResponse.json(
          { error: "No pipeline stages found." },
          { status: 404 }
        );
      }
      targetStageId = stage.id;
    }

    const rows = leads.map((lead: {
      name: string;
      profileUrl?: string;
      platform?: string;
      avatarUrl?: string;
    }) => ({
      stage_id: targetStageId,
      name: lead.name.trim(),
      value: 0,
      status: "none",
      profile_url: lead.profileUrl ?? null,
      platform: lead.platform ?? null,
      avatar_url: lead.avatarUrl ?? null,
    }));

    const { data, error } = await supabase
      .from("leads")
      .insert(rows)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, count: data.length, leads: data },
      { status: 201 }
    );

  } catch {
    return NextResponse.json(
      { error: "Failed to parse request body." },
      { status: 500 }
    );
  }
}