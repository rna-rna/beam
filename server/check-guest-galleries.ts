
import { db } from '@db';
import { sql } from 'drizzle-orm';

async function checkGuestGalleries() {
  try {
    const result = await db.execute(
      sql`SELECT * FROM galleries WHERE guest_upload = true`
    );
    console.log('Guest galleries found:', result.rows);
    console.log('Total count:', result.rows.length);
  } catch (error) {
    console.error('Error checking guest galleries:', error);
  }
  process.exit(0);
}

checkGuestGalleries();
