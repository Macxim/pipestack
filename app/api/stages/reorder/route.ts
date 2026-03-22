import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { stages } = await req.json();

    if (!Array.isArray(stages)) {
      return NextResponse.json(
        { error: "Invalid request: 'stages' must be an array." },
        { status: 400 }
      );
    }

    // Update each stage's position, scoped to current user for security
    const results = await Promise.all(
      stages.map((s: { id: string; position: number }) =>
        supabase
          .from("stages")
          .update({ position: s.position })
          .eq("id", s.id)
          .eq("user_id", user.id)
      )
    );

    const firstError = results.find((r) => r.error);
    if (firstError?.error) {
      return NextResponse.json({ error: firstError.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Stage reorder error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
