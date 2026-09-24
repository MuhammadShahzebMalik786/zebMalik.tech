/* ==============================================================================
   zebMalik.tech Blog Engine & Supabase Client Integration
   ============================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ZebBlog = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // REPLACE THESE WITH YOUR SUPABASE PROJECT CREDENTIALS (from Settings > API)
  var SUPABASE_URL = window.ZEBMALIK_SUPABASE_URL || 'https://YOUR_SUPABASE_PROJECT_ID.supabase.co';
  var SUPABASE_ANON_KEY = window.ZEBMALIK_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

  var client = null;

  function getClient() {
    if (!client) {
      if (!window.supabase) {
        console.error('Supabase client library not loaded. Make sure to include @supabase/supabase-js CDN.');
        return null;
      }
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return client;
  }

  // --- Auth Utilities ---
  async function getCurrentUser() {
    var sb = getClient();
    if (!sb) return null;
    var res = await sb.auth.getUser();
    return res.data ? res.data.user : null;
  }

  async function getAuthorProfile(userId) {
    var sb = getClient();
    if (!sb || !userId) return null;
    var res = await sb.from('profiles').select('*').eq('id', userId).single();
    return res.data;
  }

  async function signInWithEmail(email) {
    var sb = getClient();
    if (!sb) return { error: 'Client not loaded' };
    return await sb.auth.signInWithOtp({
      email: email,
      options: { emailRedirectTo: window.location.origin + '/author-dashboard.html' }
    });
  }

  async function signInWithGoogle() {
    var sb = getClient();
    if (!sb) return { error: 'Client not loaded' };
    return await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/author-dashboard.html' }
    });
  }

  async function signOut() {
    var sb = getClient();
    if (!sb) return;
    await sb.auth.signOut();
    window.location.reload();
  }

  // --- Posts & Feed Utilities ---
  async function fetchPublishedPosts(limit, tag) {
    var sb = getClient();
    if (!sb) return [];
    var query = sb
      .from('posts')
      .select('id, title, slug, excerpt, cover_image_url, tags, view_count, published_at, profiles(full_name, username, avatar_url)')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(limit || 20);

    if (tag) {
      query = query.contains('tags', [tag]);
    }

    var res = await query;
    return res.data || [];
  }

  async function fetchPostBySlug(slug) {
    var sb = getClient();
    if (!sb || !slug) return null;
    var res = await sb
      .from('posts')
      .select('*, profiles(full_name, username, bio, avatar_url)')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();
    return res.data;
  }

  // --- View Tracking with Anti-Bot & Retention Verification ---
  async function trackVerifiedView(postId) {
    var sb = getClient();
    if (!sb || !postId) return;

    // Wait at least 12 seconds on the page before counting a legitimate read
    setTimeout(async function () {
      try {
        var rawId = navigator.userAgent + '|' + (screen.width + 'x' + screen.height) + '|' + (new Date().getTimezoneOffset());
        var buffer = new TextEncoder().encode(rawId);
        var hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        var hashArray = Array.from(new Uint8Array(hashBuffer));
        var ipHash = hashArray.map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');

        await sb.rpc('record_verified_view', {
          target_post_id: postId,
          client_ip_hash: ipHash
        });
      } catch (e) {
        console.warn('View tracking non-fatal note:', e);
      }
    }, 12000);
  }

  // --- Author Publishing & Dashboard Utilities ---
  async function savePostDraft(postData) {
    var sb = getClient();
    var user = await getCurrentUser();
    if (!sb || !user) throw new Error('Must be logged in to save drafts.');

    var payload = {
      author_id: user.id,
      title: postData.title,
      slug: postData.slug,
      excerpt: postData.excerpt,
      content_markdown: postData.content_markdown,
      cover_image_url: postData.cover_image_url || '',
      tags: postData.tags || [],
      status: postData.status || 'draft',
      updated_at: new Date().toISOString()
    };

    if (postData.id) {
      return await sb.from('posts').update(payload).eq('id', postData.id).select().single();
    } else {
      return await sb.from('posts').insert(payload).select().single();
    }
  }

  async function fetchAuthorPosts(authorId) {
    var sb = getClient();
    if (!sb || !authorId) return [];
    var res = await sb
      .from('posts')
      .select('*')
      .eq('author_id', authorId)
      .order('created_at', { ascending: false });
    return res.data || [];
  }

  async function requestPayout(authorId, amount, details) {
    var sb = getClient();
    if (!sb || !authorId) throw new Error('Unauthorized');
    return await sb.from('payout_requests').insert({
      author_id: authorId,
      amount: amount,
      notes: details
    });
  }

  return {
    getClient: getClient,
    getCurrentUser: getCurrentUser,
    getAuthorProfile: getAuthorProfile,
    signInWithEmail: signInWithEmail,
    signInWithGoogle: signInWithGoogle,
    signOut: signOut,
    fetchPublishedPosts: fetchPublishedPosts,
    fetchPostBySlug: fetchPostBySlug,
    trackVerifiedView: trackVerifiedView,
    savePostDraft: savePostDraft,
    fetchAuthorPosts: fetchAuthorPosts,
    requestPayout: requestPayout
  };
}));
