import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  theme: {
    extend: {
      colors: {
        paper: '#F6F5F1',
        card: '#FCFBF8',
        ink: '#232730',
        faint: '#6B6F7A',
        indigo: {
          DEFAULT: '#2E3A66',
          deep: '#222C50',
          wash: '#E8EAF2'
        },
        brass: { DEFAULT: '#9C7A2E', soft: '#F0E7D2' },
        moss: { DEFAULT: '#2F7A4D', soft: '#E4EFE7' },
        clay: { DEFAULT: '#AE4438', soft: '#F4E4E1' },
        rule: '#D8D5CC'
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['"Albert Sans"', 'system-ui', 'sans-serif'],
        mono: ['"Spline Sans Mono"', 'ui-monospace', 'monospace']
      },
      boxShadow: {
        lift: '0 1px 2px rgba(35,39,48,0.05), 0 6px 20px -8px rgba(35,39,48,0.12)'
      }
    }
  }
}
