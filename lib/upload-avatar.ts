import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Fetches an image from a given URL and uploads it to the Supabase `avatars` bucket.
 * Returns the public URL of the uploaded avatar.
 */
export async function uploadAvatarToSupabase(url: string, prefix = "lead"): Promise<string | null> {
  if (!url) return null;
  console.log(`[Avatar] Processing URL: ${url.substring(0, 60)}...`);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    if (!response.ok) {
      console.error(`[Avatar] Failed to fetch avatar: ${response.status} ${response.statusText}`);
      return url; // fallback to original url
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get("content-type") || "image/jpeg";
    
    console.log(`[Avatar] Fetched buffer, size: ${buffer.length}, type: ${contentType}`);

    // Attempt to ensure bucket exists
    await ensureBucketExists();

    const fileExt = contentType.split("/")[1] || "jpg";
    const fileName = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { data, error } = await supabaseAdmin.storage
      .from("avatars")
      .upload(fileName, buffer, {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error("[Avatar] Error uploading to Supabase:", error);
      return url; // fallback
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("avatars").getPublicUrl(fileName);

    console.log(`[Avatar] Successfully persistent: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error("[Avatar] Exception in uploadAvatarToSupabase:", error);
    return url; // fallback
  }
}

let bucketChecked = false;
async function ensureBucketExists() {
  if (bucketChecked) return;
  
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    if (!buckets?.find((b) => b.name === "avatars")) {
      await supabaseAdmin.storage.createBucket("avatars", { public: true });
    }
    bucketChecked = true;
  } catch (err) {
    console.error("Error checking/creating bucket:", err);
  }
}
