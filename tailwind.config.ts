import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontSize: {
        'h1': ['6rem', { lineHeight: '1.167', letterSpacing: '-0.01562em', fontWeight: '300' }],
        'h2': ['3.75rem', { lineHeight: '1.2', letterSpacing: '-0.00833em', fontWeight: '300' }],
        'h3': ['3rem', { lineHeight: '1.167', letterSpacing: '0em', fontWeight: '400' }],
        'h4': ['2.125rem', { lineHeight: '1.235', letterSpacing: '0.00735em', fontWeight: '400' }],
        'h5': ['1.5rem', { lineHeight: '1.334', letterSpacing: '0em', fontWeight: '400' }],
        'h6': ['1.25rem', { lineHeight: '1.6', letterSpacing: '0.0075em', fontWeight: '500' }],
        'subtitle1': ['1rem', { lineHeight: '1.75', letterSpacing: '0.00938em', fontWeight: '400' }],
        'subtitle2': ['0.875rem', { lineHeight: '1.57', letterSpacing: '0.00714em', fontWeight: '500' }],
        'body1': ['1rem', { lineHeight: '1.5', letterSpacing: '0.00938em', fontWeight: '400' }],
        'body2': ['0.875rem', { lineHeight: '1.43', letterSpacing: '0.01071em', fontWeight: '400' }],
        'caption': ['0.75rem', { lineHeight: '1.66', letterSpacing: '0.03333em', fontWeight: '400' }],
        'overline': ['0.75rem', { lineHeight: '2.66', letterSpacing: '0.08333em', fontWeight: '400' }],
      },
      screens: {
        'xs': '475px',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      maxWidth: {
        '8xl': '90rem',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          50: '#fef5ee',
          100: '#fde8d7',
          150: '#ffdacb',
          200: '#fbcdae',
          300: '#f9ab7a',
          400: '#f68244',
          500: '#FB924E',
          600: '#e8772d',
          700: '#c25d1e',
          800: '#9a4a1d',
          900: '#7d3e1b',
          DEFAULT: '#FB924E',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: '#DBDBDB',
        charcoal: 'var(--charcoal)',
        'black-99': 'var(--black-99)',
        'black-de': 'var(--black-de)',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
