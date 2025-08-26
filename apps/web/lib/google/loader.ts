let gapiPromise: Promise<void> | null = null;
let pickerPromise: Promise<void> | null = null;

function inject(src: string) {
  return new Promise<void>((resolve, reject) => {
    const exists = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (exists && (exists as any)._loaded) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => {
      (s as any)._loaded = true;
      resolve();
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export async function loadGapi() {
  if (!gapiPromise) {
    gapiPromise = inject('https://apis.google.com/js/api.js').then(() => {
      // @ts-ignore
      return new Promise<void>((res) => gapi.load('client:picker', () => res()));
    });
  }
  await gapiPromise;
}

export async function loadPicker() {
  if (!pickerPromise) {
    pickerPromise = inject('https://apis.google.com/js/picker.js');
  }
  await pickerPromise;
}


