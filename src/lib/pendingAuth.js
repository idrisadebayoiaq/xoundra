let pending = { email: '', password: '' };

export function rememberSignIn(email, password) {
  pending = { email: (email || '').trim().toLowerCase(), password: password || '' };
}

export function passwordFor(email) {
  if (pending.email !== (email || '').trim().toLowerCase()) return '';
  return pending.password;
}

export function clearPendingAuth() {
  pending = { email: '', password: '' };
}
