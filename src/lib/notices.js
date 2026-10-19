let present = async () => {};

export function setNoticePresenter(fn) {
  present = fn;
}

export function presentNotice(title, body) {
  return present(title, body);
}
