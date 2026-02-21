import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function isValidLead(data: unknown): boolean {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return typeof d.name === "string" && d.name.trim() !== "";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!isValidLead(body)) {
      return NextResponse.json(
        { error: "Invalid lead data. Name is required." },
        { status: 400 }
      );
    }

    const { data: stage, error: stageError } = await supabase
      .from("stages")
      .select("id")
      .order("position", { ascending: true })
      .limit(1)
      .single();

    if (stageError || !stage) {
      return NextResponse.json(
        { error: "No pipeline stages found. Please create a pipeline first." },
        { status: 404 }
      );
    }

    const { data: lead, error } = await supabase
      .from("leads")
      .insert({
        stage_id: stage.id,
        name: (body.name as string).trim(),
        value: 0,
        status: "none",
        email: body.email ?? null,
        phone: body.phone ?? null,
        notes: body.notes ?? null,
        avatar_url: body.avatarUrl ?? null,
        profile_url: body.profileUrl ?? null,
        platform: body.platform ?? null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, lead }, { status: 201 });

  } catch {
    return NextResponse.json(
      { error: "Failed to parse request body." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", message: "Leads API is running" });
}