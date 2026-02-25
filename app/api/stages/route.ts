import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { title, color, pipelineId } = await req.json();
    if (!title || !pipelineId) {
      return NextResponse.json({ error: "Title and pipelineId required." }, { status: 400 });
    }

    // Get current max position
    const { data: stages } = await supabase
      .from("stages")
      .select("position")
      .eq("user_id", user.id)
      .eq("pipeline_id", pipelineId)
      .order("position", { ascending: false })
      .limit(1);

    const nextPosition = stages && stages.length > 0 ? stages[0].position + 1 : 0;

    const { data: stage, error } = await supabase
      .from("stages")
      .insert({
        title,
        color: color ?? "#3b82f6",
        pipeline_id: pipelineId,
        user_id: user.id,
        position: nextPosition,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, stage }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
