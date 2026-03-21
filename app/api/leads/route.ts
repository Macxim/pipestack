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
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    let targetStageId = body.stageId ?? null;

    // If no stageId provided (e.g. from extension), fall back to first stage
    if (!targetStageId) {
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

      targetStageId = stage.id;
    }

    // Verify the stage belongs to this user (security check)
    const { data: stageCheck } = await supabaseAdmin
      .from("stages")
      .select("id")
      .eq("id", targetStageId)
      .eq("user_id", userId)
      .single();

    if (!stageCheck) {
      return NextResponse.json({ error: "Invalid stage." }, { status: 403 });
    }

    // ── Duplicate check ───────────────────────────────────────────────
    const profileUrl = body.profileUrl ?? null;
    const email = body.email ?? null;

    if (profileUrl || email) {
      const query = supabaseAdmin
        .from("leads")
        .select("id")
        .eq("user_id", userId);

      if (profileUrl) query.eq("profile_url", profileUrl);
      else if (email) query.ilike("email", email);

      const { data: existing } = await query.limit(1).single();

      if (existing) {
        return NextResponse.json(
          { success: false, skipped: true, message: "Lead already exists in your pipeline." },
          { status: 200 }
        );
      }
    }

    // Get the next position in this stage
    const { data: lastLead } = await supabaseAdmin
      .from("leads")
      .select("position")
      .eq("stage_id", targetStageId)
      .order("position", { ascending: false })
      .limit(1)
      .single();

    const nextPosition = lastLead ? (lastLead.position ?? 0) + 1 : 0;

    let finalAvatarUrl = body.avatarUrl ?? null;
    const isFacebookOrInstagramUrl = (url: string) => 
      url.includes("fbcdn.net") || 
      url.includes("fbsbx.com") || 
      url.includes("cdninstagram.com");

    if (finalAvatarUrl && isFacebookOrInstagramUrl(finalAvatarUrl)) {
      finalAvatarUrl = await uploadAvatarToSupabase(finalAvatarUrl, "lead");
    }

    const { data: lead, error } = await supabaseAdmin
      .from("leads")
      .insert({
        stage_id: targetStageId,
        user_id: userId,
        name: body.name.trim(),
        value: 0,
        email: body.email ?? null,
        phone: body.phone ?? null,
        notes: body.notes ?? null,
        avatar_url: finalAvatarUrl,
        profile_url: body.profileUrl ?? null,
        platform: body.platform ?? null,
        follow_up_date: body.followUpDate ?? null,
        position: nextPosition,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, lead }, { status: 201 });
  } catch (error) {
    console.error("POST /api/leads error:", error);
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

    let finalAvatarUrl = updates.avatarUrl;
    const isFacebookOrInstagramUrl = (url: string) => 
      url.includes("fbcdn.net") || 
      url.includes("fbsbx.com") || 
      url.includes("cdninstagram.com");

    if (finalAvatarUrl && isFacebookOrInstagramUrl(finalAvatarUrl)) {
      const uploadedUrl = await uploadAvatarToSupabase(finalAvatarUrl, "lead");
      if (uploadedUrl) finalAvatarUrl = uploadedUrl;
    }

    const { data: lead, error } = await supabaseAdmin
      .from("leads")
      .update({
        name: updates.name,
        value: updates.value,
        email: updates.email,
        phone: updates.phone,
        notes: updates.notes,
        avatar_url: finalAvatarUrl,
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