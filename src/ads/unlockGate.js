/** Bridge so AppState can request a rewarded unlock without importing React context. */

let requestUnlock = async () => false;

export function setUnlockRequester(fn) {
  requestUnlock = typeof fn === 'function' ? fn : async () => false;
}

/** @returns {Promise<boolean>} true when the required ads were watched */
export function requestAdUnlock(purpose) {
  return Promise.resolve(requestUnlock(purpose));
}

let premiumAccess = () => false;
let sleepAccess = () => false;
let studioAccess = () => false;

export function setPremiumAccessChecker(fn) {
  premiumAccess = typeof fn === 'function' ? fn : () => false;
}

export function setSleepAccessChecker(fn) {
  sleepAccess = typeof fn === 'function' ? fn : () => false;
}

export function setStudioAccessChecker(fn) {
  studioAccess = typeof fn === 'function' ? fn : () => false;
}

export function hasAdPremiumAccess() {
  return Boolean(premiumAccess());
}

export function hasAdSleepAccess() {
  return Boolean(sleepAccess());
}

export function hasAdStudioAccess() {
  return Boolean(studioAccess());
}
