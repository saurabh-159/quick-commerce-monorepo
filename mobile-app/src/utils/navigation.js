export function resetToLogin(navigation) {
  let root = navigation;
  while (root.getParent?.()) {
    root = root.getParent();
  }
  root.reset({
    index: 0,
    routes: [{ name: 'Login' }]
  });
}
