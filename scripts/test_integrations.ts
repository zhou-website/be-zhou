import 'dotenv/config';
import { supabase, BUCKET_NAME } from '../src/config/supabase.js';
import { resend, FROM_EMAIL } from '../src/config/resend.js';

async function testAll() {
  console.log('--- 1. TESTING SUPABASE STORAGE ---');
  try {
    const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
    if (listErr) {
      console.error('❌ Supabase listBuckets error:', listErr.message);
    } else {
      console.log('✅ Supabase connected successfully!');
      console.log('Existing buckets:', buckets.map(b => b.name));

      const bucketExists = buckets.some(b => b.name === BUCKET_NAME);
      if (!bucketExists) {
        console.log(`Creating bucket "${BUCKET_NAME}"...`);
        const { error: createErr } = await supabase.storage.createBucket(BUCKET_NAME, {
          public: false,
          fileSizeLimit: 5242880, // 5MB limit
        });
        if (createErr) {
          console.error('❌ Failed to create bucket:', createErr.message);
        } else {
          console.log(`✅ Bucket "${BUCKET_NAME}" created successfully!`);
        }
      } else {
        console.log(`✅ Target bucket "${BUCKET_NAME}" already exists!`);
      }
    }
  } catch (err) {
    console.error('❌ Supabase catch error:', (err as Error).message);
  }

  console.log('\n--- 2. TESTING RESEND EMAIL CONFIG ---');
  try {
    if (!resend) {
      console.log('⚠️ Resend client is null (no RESEND_API_KEY).');
    } else {
      console.log('✅ Resend client is configured with API key.');
      console.log('From email:', FROM_EMAIL);
      // Test sending an email to delivered@resend.dev (Resend test mailbox)
      const res = await resend.emails.send({
        from: FROM_EMAIL,
        to: 'delivered@resend.dev',
        subject: 'Test Verification Email — Zhou Consulting',
        html: '<p>Backend email service is fully active and verified!</p>',
      });
      console.log('✅ Resend test email result:', res);
    }
  } catch (err) {
    console.error('❌ Resend email test error:', (err as Error).message);
  }

  console.log('\n--- 3. TESTING GOOGLE CLIENT ID CONFIG ---');
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  console.log('Google Client ID:', googleClientId ? '✅ Configured (' + googleClientId.slice(0, 20) + '...)' : '❌ Not set');

  process.exit(0);
}

testAll();
