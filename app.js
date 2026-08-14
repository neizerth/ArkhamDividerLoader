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

  const getLoaderUrl = (baseUrl) => `${baseUrl}/images/loader.gif`;

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

  const probe = async (type, timeoutMs = 1200) => {
    const baseUrl = `https://${type}.${host}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const url = getTargetUrl(type);

    try {
      // mode:'no-cors' lets us cheaply probe reachability without needing CORS.
      await fetch(`${getLoaderUrl(baseUrl)}?t=${Date.now()}`, {
        signal: controller.signal,
        cache: "no-store",
        mode: "no-cors",
      });
      return { type, url };
    } finally {
      clearTimeout(timer);
    }
  };

  const pick = async () => {
    try {
      // If the user's language is Russian, prefer fallback unless global is clearly reachable fast.
      const ruBias = isRu();
      const globalTimeout = ruBias ? 800 : 1200;
      const fallbackTimeout = 1200;
      return await Promise.any([
        probe("global", globalTimeout),
        probe("fallback", fallbackTimeout),
      ]);
    } catch {
      return { type: "fallback", url: getTargetUrl("fallback") };
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

  init();
})();
