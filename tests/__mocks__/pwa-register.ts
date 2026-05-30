// Mock para virtual:pwa-register/react (não existe em ambiente de teste)
export function useRegisterSW() {
  return {
    needRefresh: [false, () => {}],
    offlineReady: [false, () => {}],
    updateServiceWorker: () => {},
  };
}
