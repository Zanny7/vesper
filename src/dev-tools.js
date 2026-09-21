export const isLocalDevelopment = hostname => hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '127.0.0.1' || hostname === '[::1]';

// UI convenience only, not an access-control boundary. The review page is
// read-only with respect to player saves and uses an in-memory equipment store.
if (typeof document !== 'undefined') {
  const link = document.querySelector('#dev-catalogue-link');
  if (link) link.hidden = !isLocalDevelopment(location.hostname);
}
