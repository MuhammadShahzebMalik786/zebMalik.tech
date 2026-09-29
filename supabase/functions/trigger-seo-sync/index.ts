// Supabase Edge Function: trigger-seo-sync
// Called by Supabase Database Webhook whenever a post is
// inserted, updated, or deleted in the `posts` table.
// Fires the GitHub Actions workflow_dispatch to regenerate
// sitemap.xml + llms.txt + ping IndexNow immediately.

Deno.serve(async (req: Request) => {
  // Only accept POST from Supabase webhooks
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const record = body.record || body.old_record || {};
    const eventType = body.type || 'UNKNOWN'; // INSERT / UPDATE / DELETE

    // Only react when a post's status changes to/from 'published'
    // (ignore draft saves that don't affect public visibility)
    const newStatus  = body.record?.status;
    const oldStatus  = body.old_record?.status;

    const isPublishEvent = newStatus === 'published';
    const isUnpublishEvent = oldStatus === 'published' && newStatus !== 'published';
    const isDeleteEvent = eventType === 'DELETE' && oldStatus === 'published';

    if (!isPublishEvent && !isUnpublishEvent && !isDeleteEvent) {
      console.log(`Skipping event: ${eventType}, old=${oldStatus}, new=${newStatus}`);
      return new Response(JSON.stringify({ skipped: true, reason: 'Not a publish/unpublish/delete event' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const slug  = record.slug || body.old_record?.slug || 'unknown';
    const title = record.title || body.old_record?.title || 'Unknown';
    console.log(`🔔 SEO sync triggered: ${eventType} on "${title}" (${slug})`);

    // Read GitHub PAT from environment secret
    const GITHUB_TOKEN = Deno.env.get('GITHUB_PAT');
    if (!GITHUB_TOKEN) {
      console.error('GITHUB_PAT secret is not set in Supabase Edge Function secrets.');
      return new Response(JSON.stringify({ error: 'GITHUB_PAT not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Trigger the GitHub Actions workflow_dispatch
    const githubApiUrl = 'https://api.github.com/repos/MuhammadShahzebMalik786/zebMalik.tech/actions/workflows/update-sitemap.yml/dispatches';

    const triggerSource = `supabase-webhook:${eventType}:${slug}`;

    const response = await fetch(githubApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          trigger_source: triggerSource
        }
      })
    });

    if (response.ok || response.status === 204) {
      console.log(`✅ GitHub Actions workflow triggered successfully (HTTP ${response.status})`);
      return new Response(JSON.stringify({
        success: true,
        triggered: true,
        event: eventType,
        article: slug
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      const errorText = await response.text();
      console.error(`❌ GitHub API error ${response.status}: ${errorText}`);
      return new Response(JSON.stringify({
        error: 'GitHub API error',
        status: response.status,
        detail: errorText
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
