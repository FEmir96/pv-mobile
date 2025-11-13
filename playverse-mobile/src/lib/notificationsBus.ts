type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitRefresh() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.warn("notificationsBus listener error", err);
    }
  });
}

