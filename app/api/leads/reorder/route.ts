import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leads } = await req.json();

    if (!Array.isArray(leads)) {
      return NextResponse.json(
        { error: "Invalid request: 'leads' must be an array." },
        { status: 400 }
      );
    }

    // Update each lead's stage and position
    // The .eq("user_id", user.id) ensures users can only reorder their own leads
    const results = await Promise.all(
      leads.map((l: any) =>
        supabase
          .from("leads")
          .update({ stage_id: l.stageId, position: l.position })
          .eq("id", l.id)
          .eq("user_id", user.id) // security: can't touch other users' leads
      )
    );

    const firstError = results.find((r) => r.error);
    if (firstError?.error) {
      return NextResponse.json({ error: firstError.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Reorder error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}