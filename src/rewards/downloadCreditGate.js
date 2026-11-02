let consumer = null;

export function setDownloadCreditConsumer(fn) {
  consumer = fn;
}

export function tryConsumeDownloadCredit() {
  try {
    return Boolean(consumer?.());
  } catch {
    return false;
  }
}
