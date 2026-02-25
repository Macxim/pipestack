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
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    // Get user's first stage
    const { data: stage } = await supabase
      .from("stages")
      .select("id")
      .eq("user_id", user.id)
      .order("position", { ascending: true })
      .limit(1)
      .single();

    if (!stage) {
      return NextResponse.json({ error: "No stages found." }, { status: 404 });
    }

    const { data: lead, error } = await supabase
      .from("leads")
      .insert({
        stage_id: stage.id,
        user_id: user.id,
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
  } catch (err) {
    console.error("Lead create error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok" });
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Lead ID is required." }, { status: 400 });
    }

    const { data: lead, error } = await supabase
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
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, lead });
  } catch (err) {
    console.error("Lead update error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Lead ID is required." }, { status: 400 });
    }

    const { error } = await supabase
      .from("leads")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Lead delete error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}