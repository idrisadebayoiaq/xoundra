const presenter = { show: async () => {} };

export function setNoticePresenter(fn) {
  presenter.show = typeof fn === 'function' ? fn : async () => {};
}

export function presentNotice(title, body, data) {
  return presenter.show(title, body, data);
}
