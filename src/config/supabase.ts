import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL || 'https://xyzcompany.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'dummy_supabase_key';

export const supabase = createClient(supabaseUrl, supabaseKey);
export const BUCKET_NAME = process.env.SUPABASE_BUCKET_DOCUMENTS || 'zhou-documents';
