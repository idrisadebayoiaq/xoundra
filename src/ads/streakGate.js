/** Bridge so AppState can pause the next free-user track until streak ads finish. */

let waitForAds = async () => true;

export function setStreakAdWaiter(fn) {
  waitForAds = typeof fn === 'function' ? fn : async () => true;
}

export function requestStreakAds() {
  return Promise.resolve(waitForAds());
}
