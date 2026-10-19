export function passwordProblems(password) {
  const problems = [];
  if ((password || '').length < 8) problems.push('At least 8 characters');
  if (!/[A-Z]/.test(password || '')) problems.push('An uppercase letter');
  if (!/[a-z]/.test(password || '')) problems.push('A lowercase letter');
  if (!/[0-9]/.test(password || '')) problems.push('A number');
  if (!/[^A-Za-z0-9]/.test(password || '')) problems.push('A symbol');
  return problems;
}

export function passwordIsValid(password) {
  return passwordProblems(password).length === 0;
}
