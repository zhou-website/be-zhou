import { supabase, BUCKET_NAME } from '../config/supabase.js';

export const getPublicStorageUrl = (filePath: string): string => {
  if (!filePath) return '';
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  try {
    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
    return data?.publicUrl || '';
  } catch {
    return `https://storage.zhouconsulting.com/fallback/${filePath}`;
  }
};

export const getSignedDownloadUrl = async (
  filePath: string,
  expiresInSeconds: number = 3600
): Promise<string> => {
  if (!filePath) return '';

  // Jika filepath secara tidak sengaja berupa full URL, ekstrak path relatifnya
  let cleanPath = filePath;
  if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
    const bucketPrefix = `/${BUCKET_NAME}/`;
    const idx = cleanPath.indexOf(bucketPrefix);
    if (idx !== -1) {
      cleanPath = cleanPath.substring(idx + bucketPrefix.length).split('?')[0];
    } else {
      // Jika URL eksternal atau URL CDN lain yang tidak berada di bucket ini, kembalikan langsung
      return cleanPath;
    }
  }

  // Jika URL Supabase masih placeholder di environment lokal dev, kembalikan mock secured URL
  if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('xyzcompany')) {
    return `https://mock-storage.zhouconsulting.com/signed-download/${cleanPath}?token=sec_${Date.now()}&expires=${expiresInSeconds}`;
  }

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(cleanPath, expiresInSeconds);

    if (error || !data) {
      throw new Error(error?.message || 'Gagal membuat signed URL');
    }

    return data.signedUrl;
  } catch (error) {
    console.warn('⚠️ Supabase signed URL fallback:', (error as Error).message);
    const { data: pubData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(cleanPath);
    return pubData?.publicUrl || `https://storage.zhouconsulting.com/fallback/${cleanPath}`;
  }
};

export const uploadFileToStorage = async (
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string,
  folder: string = 'documents'
): Promise<{ filePath: string; publicUrl?: string; signedUrl?: string }> => {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const sanitizedPath = `${folder}/${Date.now()}_${safeName}`;

  if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('xyzcompany')) {
    return {
      filePath: sanitizedPath,
      publicUrl: `https://mock-storage.zhouconsulting.com/${sanitizedPath}`,
      signedUrl: `https://mock-storage.zhouconsulting.com/signed-download/${sanitizedPath}?token=sec_${Date.now()}`,
    };
  }

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(sanitizedPath, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error || !data) {
    console.error('Supabase upload error details:', error);
    throw new Error(error?.message || 'Gagal mengunggah berkas ke Supabase Storage');
  }

  const { data: publicData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  let signedUrl: string | undefined;
  try {
    const { data: signData } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(data.path, 3600);
    signedUrl = signData?.signedUrl;
  } catch {
    // Abaikan jika signed URL gagal digenerate saat upload
  }

  return {
    filePath: data.path,
    publicUrl: publicData?.publicUrl,
    signedUrl: signedUrl || publicData?.publicUrl,
  };
};

