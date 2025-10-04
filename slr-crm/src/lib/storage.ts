import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
const bucket = process.env.SUPABASE_BUCKET || 'job-media';

export async function getSignedUploadUrls(jobId: string, mimeTypes: string[]) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const targets: { path: string; url: string }[] = [];
  for (let i = 0; i < mimeTypes.length; i++) {
    const ext = mimeTypes[i].includes('jpeg') ? 'jpg' : (mimeTypes[i].split('/')[1] || 'bin');
    const path = `${jobId}/${Date.now()}-${i}.${ext}`;
    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
    if (error) throw error;
    targets.push({ path, url: (data as any).signedUrl });
  }
  return { bucket, targets };
}

export function publicFileUrl(path: string) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
