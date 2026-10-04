// Shared by both sitemap generators so portfolio routes survive SEO rebuilds.
const base = '/Muhammad%20Shahzeb%20Malik/';
const projects = [
  'agent-blue', 'ecommerce-cart', 'expense-manager', 'flappy-copter',
  'pacman-clone', 'ship-battle', 'time-tracker', 'virtualsupportgroup'
];

module.exports = [
  { url: base, priority: '0.8', changefreq: 'monthly' },
  ...projects.map(slug => ({
    url: base + 'projects/' + slug, priority: '0.6', changefreq: 'monthly'
  }))
];
