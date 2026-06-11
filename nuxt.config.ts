export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },
  modules: ['@nuxtjs/tailwindcss', '@nuxtjs/supabase'],
  css: ['~/assets/css/main.css'],
  supabase: {
    // Every page requires sign-in — the books are private to each artisan.
    // The module reads SUPABASE_URL and SUPABASE_KEY from .env automatically.
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: []
    }
  },
  app: {
    head: {
      title: 'CraftLedger — books for makers',
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Simple bookkeeping for artisans. Record sales and expenses, see monthly profit and loss, and track yearly gross revenue.'
        }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700&family=Albert+Sans:wght@400;500;600&family=Spline+Sans+Mono:wght@400;500;600&display=swap'
        }
      ]
    }
  }
})
