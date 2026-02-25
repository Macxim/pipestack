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

    const body = await req.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    const { data: stage } = await supabaseAdmin
      .from("stages")
      .select("id")
      .eq("user_id", userId)
      .order("position", { ascending: true })
      .limit(1)
      .single();

    if (!stage) {
      return NextResponse.json({ error: "No stages found." }, { status: 404 });
    }

    const { data: lead, error } = await supabaseAdmin
      .from("leads")
      .insert({
        stage_id: stage.id,
        user_id: userId,
        name: body.name.trim(),
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

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, lead }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok" });
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await getUserFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Lead ID is required." }, { status: 400 });
    }

    const { data: lead, error } = await supabaseAdmin
      .from("leads")
      .update({
        name: updates.name,
        value: updates.value,
        status: updates.status,
        email: updates.email,
        phone: updates.phone,
        notes: updates.notes,
        avatar_url: updates.avatarUrl,
        profile_url: updates.profileUrl,
        platform: updates.platform,
        follow_up_date: updates.followUpDate,
        stage_id: updates.stageId,
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, lead });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Lead ID is required." }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("leads")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}