(() => {
  const host = window.location.hostname;
  const follow = (url) => {
    window.location.href = url
  };

  const pathname = window.location.pathname || "/";
  const queryString = window.location.search;
  const hash = window.location.hash;

  const getTargetUrl = (type) =>
    `https://${type}.${host}${pathname}${queryString}${hash}`;

  const getLoaderUrl = (baseUrl) => `${baseUrl}/blank.png`;

  const isRu = () => {
    const langs = navigator.languages?.length
      ? navigator.languages
      : [navigator.language].filter(Boolean);
    return langs.some((l) => String(l).toLowerCase().startsWith("ru"));
  };

  const applyI18n = () => {
    const translations = {
      en: {
        languageLabel: "Language",
        loading: "Loading…",
        global: "Global",
        mirror: "Mirror",
      },
      ru: {
        languageLabel: "Язык",
        loading: "Загрузка…",
        global: "Global",
        mirror: "Зеркало (Россия)",
      },
      fr: {
        languageLabel: "Langue",
        loading: "Chargement…",
        global: "Global",
        mirror: "Miroir",
      },
      de: {
        languageLabel: "Sprache",
        loading: "Wird geladen…",
        global: "Global",
        mirror: "Spiegel",
      },
      es: {
        languageLabel: "Idioma",
        loading: "Cargando…",
        global: "Global",
        mirror: "Espejo",
      },
      it: {
        languageLabel: "Lingua",
        loading: "Caricamento…",
        global: "Globale",
        mirror: "Mirror",
      },
      pl: {
        languageLabel: "Język",
        loading: "Ładowanie…",
        global: "Globalnie",
        mirror: "Mirror",
      },
      ko: {
        languageLabel: "언어",
        loading: "로딩 중…",
        global: "Global",
        mirror: "미러",
      },
    };

    const normalizeLang = (lang) => {
      if (!lang) return "en";
      const lower = String(lang).toLowerCase();
      const base = lower.split("-")[0];
      return Object.hasOwn(translations, base) ? base : "en";
    };

    const getInitialLang = () => {
      const langs = navigator.languages?.length
        ? navigator.languages
        : [navigator.language].filter(Boolean);

      for (const l of langs) {
        const normalized = normalizeLang(l);
        if (normalized !== "en") return normalized;
      }
      return "en";
    };

    const lang = getInitialLang();
    const dict = translations[lang] ?? translations.en;
    document.documentElement.lang = lang;

    for (const el of document.querySelectorAll("[data-i18n]")) {
      const key = el.getAttribute("data-i18n");
      if (!key) continue;
      const value = dict[key] ?? translations.en[key];
      if (value) el.textContent = value;
    }
  };

  const updateMirrorLinks = () => {
    for (const link of document.querySelectorAll(".mirror")) {
      const baseUrl = link.getAttribute("href");
      if (!baseUrl) continue;
      link.setAttribute("href", `${baseUrl}${pathname}${queryString}${hash}`);
    }
  };

  const probe = async (type, timeoutMs = 1200, signal) => {
    const baseUrl = `https://${type}.${host}`;
    const url = getTargetUrl(type);
    const src = `${getLoaderUrl(baseUrl)}?t=${Date.now()}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const onAbort = () => controller.abort();
    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) controller.abort();

    try {
      try {
        const response = await fetch(src, {
          signal: controller.signal,
          cache: "no-store",
          mode: "cors",
        });
        if (!response.ok) throw new Error("http");
        response.body?.cancel();
        return { type, url };
      } catch (error) {
        if (controller.signal.aborted || error.message === "http") throw error;

        // No CORS: Image onerror still treats HTTP 500 as down.
        await new Promise((resolve, reject) => {
          const img = new Image();
          const stop = (fn) => () => {
            controller.signal.removeEventListener("abort", onImgAbort);
            img.onload = img.onerror = null;
            fn();
          };
          const onImgAbort = stop(() => reject(new Error("aborted")));
          if (controller.signal.aborted) {
            onImgAbort();
            return;
          }
          controller.signal.addEventListener("abort", onImgAbort, { once: true });
          img.onload = stop(resolve);
          img.onerror = stop(() => reject(new Error("unreachable")));
          img.src = src;
        });
        return { type, url };
      }
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
  };

  const pick = async () => {
    // First healthy mirror wins. Prefer fallback for RU only by giving global a shorter timeout.
    const ruBias = isRu();
    const select = new AbortController();

    try {
      return await Promise.any([
        probe("global", ruBias ? 800 : 1200, select.signal),
        probe("fallback", 1200, select.signal),
      ]);
    } catch {
      return { type: "global", url: getTargetUrl("global") };
    } finally {
      select.abort();
    }
  };

  const onLoad = (fn) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  };

  const init = async () => {
    applyI18n();
    updateMirrorLinks();

    const panel = document.getElementById("loaderPanel");
    window.setTimeout(() => {
      panel?.classList.add("panel--ready");
      panel?.querySelector(".panel__rest")?.setAttribute("aria-hidden", "false");
    }, 2000);

    const chosen = await pick();
    follow(chosen.url);
  };

  onLoad(init);
})();
