import type { Config } from "tailwindcss"
import defaultTheme from "tailwindcss/defaultTheme"
import tailwindAnimate from "tailwindcss-animate"

const config = {
  // Habilita o dark mode via classe CSS (essencial para Shadcn)
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
	],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      // 1. TIPOGRAFIA CIENTÍFICA
      // Integra a fonte Geist (Sans e Mono) configurada no layout
      fontFamily: {
        sans: ["var(--font-geist-sans)", ...defaultTheme.fontFamily.sans],
        mono: ["var(--font-geist-mono)", ...defaultTheme.fontFamily.mono], // Crucial para tabelas de dados
      },

      // 2. CORES SEMÂNTICAS (Mapeadas para variáveis CSS do globals.css)
      // Em vez de 'blue-500', usamos 'primary'. Isso abstrai a cor real.
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        
        // A cor principal (Ação, Botões, Destaques)
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // Elementos secundários (Fundos de card, botões cancel)
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        // Para alertas de erro (ex: experimento falhou)
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        // Textos de apoio, legendas de gráficos
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        // Acentos visuais (ex: hover em linhas da tabela)
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        // Popups e Modais
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        // Cards e Painéis
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        
        // 3. CORES ESPECÍFICAS DE CIÊNCIA (Cores Estáticas)
        // Úteis para gráficos do Plotly ou status específicos que não mudam no tema
        science: {
           50: '#f0f9ff',
           100: '#e0f2fe',
           500: '#0ea5e9', // Azul Sky (Padrão)
           700: '#0369a1',
           900: '#0c4a6e',
        },
        success: "#10b981", // Emerald-500 (Para experimentos concluídos com sucesso)
        warning: "#f59e0b", // Amber-500 (Para alertas de outlier)
      },

      // 4. BORDAS TÉCNICAS
      // Raio da borda controlado globalmente (fino e preciso)
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      // 5. ANIMAÇÕES DE INTERFACE (Feedback tátil)
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        // Animação customizada: "Pulso de Processamento"
        "processing": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "processing": "processing 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [tailwindAnimate],
} satisfies Config

export default config