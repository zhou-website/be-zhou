import { supabase, BUCKET_NAME } from '../config/supabase.js';

export const getSignedDownloadUrl = async (
  filePath: string,
  expiresInSeconds: number = 3600
): Promise<string> => {
  // Jika URL Supabase masih placeholder di environment lokal dev, kembalikan mock secured URL
  if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('xyzcompany')) {
    return `https://mock-storage.zhouconsulting.com/signed-download/${filePath}?token=sec_${Date.now()}&expires=${expiresInSeconds}`;
  }

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, expiresInSeconds);

    if (error || !data) {
      throw new Error(error?.message || 'Gagal membuat signed URL');
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Supabase signed URL error:', error);
    return `https://storage.zhouconsulting.com/fallback/${filePath}`;
  }
};

export const uploadFileToStorage = async (
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string
): Promise<{ filePath: string; publicUrl?: string }> => {
  const sanitizedPath = `documents/${Date.now()}_${fileName.replace(/\s+/g, '_')}`;

  if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('xyzcompany')) {
    return { filePath: sanitizedPath };
  }

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(sanitizedPath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error || !data) {
    throw new Error(error?.message || 'Gagal mengunggah berkas ke Supabase');
  }

  return { filePath: data.path };
};
