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

  // Supabase Project Credentials
  var SUPABASE_URL = window.ZEBMALIK_SUPABASE_URL || 'https://qfsmwivvcfpkutqszlhd.supabase.co';
  var SUPABASE_ANON_KEY = window.ZEBMALIK_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmc213aXZ2Y2Zwa3V0cXN6bGhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNjI5NTUsImV4cCI6MjEwNTgzODk1NX0.rWln2NStaO3DNTNZzrJOk_F7FkG4hqijwPvm1aP199M';

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

  async function signInWithPassword(email, password) {
    var sb = getClient();
    if (!sb) return { error: { message: 'Database client not ready' } };
    return await sb.auth.signInWithPassword({ email: email, password: password });
  }

  // Blacklist of disposable and temporary email domains
  var DISPOSABLE_DOMAINS = [
    'mailinator.com', 'tempmail.com', 'temp-mail.org', '10minutemail.com',
    'guerrillamail.com', 'throwawaymail.com', 'yopmail.com', 'dispostable.com',
    'sharklasers.com', 'trashmail.com', 'getairmail.com', 'fakeinbox.com',
    'maildrop.cc', 'inboxkitten.com', 'crazymailing.com', 'mohmal.com',
    'generator.email', 'emailondeck.com', 'mytemp.email', 'tempail.com',
    'burnermail.io', 'nada.ltd', 'getnada.com', 'fakemailgenerator.com',
    'tempmail.net', 'disposablemail.com', 'temp-mail.io', 'dropmail.me',
    'tempmailo.com', 'trashmail.net', 'throwawaymail.org', 'mytempemail.com'
  ];

  function isDisposableEmail(email) {
    if (!email || !email.includes('@')) return false;
    var domain = email.split('@')[1].toLowerCase().trim();
    return DISPOSABLE_DOMAINS.indexOf(domain) !== -1;
  }

  async function signUpWithPassword(email, password, fullName) {
    var sb = getClient();
    if (!sb) return { error: { message: 'Database client not ready' } };

    var cleanName = (fullName || '').trim();
    if (cleanName.length < 3) {
      return { error: { message: 'Full legal name is required (minimum 3 letters) to ensure payout eligibility.' } };
    }

    var cleanEmail = (email || '').toLowerCase().trim();
    if (isDisposableEmail(cleanEmail)) {
      return { error: { message: 'Temporary / disposable emails are not permitted. Please register with a permanent personal or business email.' } };
    }

    if (!password || password.length < 8 || !/\d/.test(password)) {
      return { error: { message: 'Password must be at least 8 characters long and contain at least one number.' } };
    }

    return await sb.auth.signUp({
      email: cleanEmail,
      password: password,
      options: { data: { full_name: cleanName } }
    });
  }

  async function signInWithEmail(email) {
    var sb = getClient();
    if (!sb) return { error: 'Client not loaded' };
    return await sb.auth.signInWithOtp({
      email: email,
      options: { emailRedirectTo: window.location.origin + '/author-dashboard' }
    });
  }

  async function signInWithGoogle() {
    var sb = getClient();
    if (!sb) return { error: 'Client not loaded' };
    return await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/author-dashboard' }
    });
  }

  async function signOut() {
    var sb = getClient();
    if (!sb) return;
    await sb.auth.signOut();
    window.location.reload();
  }

  async function resetPasswordForEmail(email) {
    var sb = getClient();
    if (!sb) return { error: { message: 'Database client not ready' } };
    return await sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/write'
    });
  }

  async function updateUserPassword(newPassword) {
    var sb = getClient();
    if (!sb) return { error: { message: 'Database client not ready' } };
    return await sb.auth.updateUser({ password: newPassword });
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

    // 1. Try public published query (fast path for readers)
    var res = await sb
      .from('posts')
      .select('*, profiles(full_name, username, bio, avatar_url)')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle();

    if (res && res.data) return res.data;

    // 2. If not published, check if user is logged in (author or admin preview)
    try {
      var user = await getCurrentUser();
      if (user) {
        var previewRes = await sb
          .from('posts')
          .select('*, profiles(full_name, username, bio, avatar_url)')
          .eq('slug', slug)
          .maybeSingle();
        if (previewRes && previewRes.data) return previewRes.data;
      }
    } catch (e) {
      console.warn('Preview fetch error:', e);
    }

    return null;
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

  // --- Admin Moderation & Operations ---
  async function fetchAdminPendingPosts() {
    var sb = getClient();
    if (!sb) return [];
    var res = await sb
      .from('posts')
      .select('*, profiles(full_name, username, avatar_url)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    return res.data || [];
  }

  async function adminApprovePost(postId) {
    var sb = getClient();
    if (!sb || !postId) throw new Error('Missing parameter');
    return await sb
      .from('posts')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('id', postId);
  }

  async function adminRejectPost(postId, reason) {
    var sb = getClient();
    if (!sb || !postId) throw new Error('Missing parameter');
    return await sb
      .from('posts')
      .update({ status: 'rejected', rejection_reason: reason || '' })
      .eq('id', postId);
  }

  async function fetchAdminPayoutRequests() {
    var sb = getClient();
    if (!sb) return [];
    var res = await sb
      .from('payout_requests')
      .select('*, profiles(full_name, username, payout_method, payout_details)')
      .order('requested_at', { ascending: false });
    return res.data || [];
  }

  async function adminUpdatePayoutStatus(requestId, status) {
    var sb = getClient();
    if (!sb || !requestId) throw new Error('Missing parameter');
    return await sb
      .from('payout_requests')
      .update({ status: status, processed_at: new Date().toISOString() })
      .eq('id', requestId);
  }

  // --- Client-side Image Optimization to WebP ---
  function convertToWebP(file, maxDimension, quality) {
    return new Promise(function (resolve, reject) {
      if (!file || !file.type.startsWith('image/')) {
        return reject(new Error('Selected file is not an image.'));
      }
      var maxDim = maxDimension || 1600;
      var qual = quality || 0.82;

      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          var width = img.width;
          var height = img.height;

          // Responsive downscaling to preserve storage & speed
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          var canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(function (blob) {
            if (!blob) return reject(new Error('Canvas WebP conversion failed.'));
            resolve(blob);
          }, 'image/webp', qual);
        };
        img.onerror = function () { reject(new Error('Failed to load image.')); };
        img.src = e.target.result;
      };
      reader.onerror = function () { reject(new Error('Failed to read file.')); };
      reader.readAsDataURL(file);
    });
  }

  // --- Upload to Supabase Storage as WebP ---
  async function uploadBlogImage(file) {
    var sb = getClient();
    var user = await getCurrentUser();
    if (!sb || !user) throw new Error('You must be signed in to upload images.');

    // 1. Convert to high-efficiency WebP locally in browser
    var webpBlob = await convertToWebP(file, 1600, 0.82);

    // 2. Generate unique path
    var filename = Date.now() + '-' + Math.random().toString(36).substring(2, 8) + '.webp';
    var filePath = user.id + '/' + filename;

    // 3. Upload to 'blog-images' bucket
    var uploadRes = await sb.storage
      .from('blog-images')
      .upload(filePath, webpBlob, {
        contentType: 'image/webp',
        cacheControl: '31536000',
        upsert: false
      });

    if (uploadRes.error) throw uploadRes.error;

    // 4. Return public CDN URL
    var publicUrlRes = sb.storage.from('blog-images').getPublicUrl(filePath);
    return publicUrlRes.data.publicUrl;
  }

  return {
    getClient: getClient,
    getCurrentUser: getCurrentUser,
    getAuthorProfile: getAuthorProfile,
    signInWithPassword: signInWithPassword,
    signUpWithPassword: signUpWithPassword,
    signInWithEmail: signInWithEmail,
    signInWithGoogle: signInWithGoogle,
    signOut: signOut,
    fetchPublishedPosts: fetchPublishedPosts,
    fetchPostBySlug: fetchPostBySlug,
    trackVerifiedView: trackVerifiedView,
    savePostDraft: savePostDraft,
    fetchAuthorPosts: fetchAuthorPosts,
    requestPayout: requestPayout,
    convertToWebP: convertToWebP,
    uploadBlogImage: uploadBlogImage,
    resetPasswordForEmail: resetPasswordForEmail,
    updateUserPassword: updateUserPassword,
    fetchAdminPendingPosts: fetchAdminPendingPosts,
    adminApprovePost: adminApprovePost,
    adminRejectPost: adminRejectPost,
    fetchAdminPayoutRequests: fetchAdminPayoutRequests,
    adminUpdatePayoutStatus: adminUpdatePayoutStatus
  };
}));
