import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                dark: "rgb(var(--bg-dark) / <alpha-value>)",
                panel: "rgb(var(--panel-bg) / 0.7)", // bg-panel 기본값(기존 의도 유지)
                stroke: "rgb(var(--stroke) / 0.08)", // border-stroke 기본값(기존 의도 유지)

                primary: "rgb(var(--text-primary) / <alpha-value>)",
                secondary: "rgb(var(--text-secondary) / <alpha-value>)",

                accent: {
                    blue: "rgb(var(--accent-blue) / <alpha-value>)",
                    amber: "rgb(var(--accent-amber) / <alpha-value>)",
                },
            },
            boxShadow: {
                outer: "var(--shadow-outer)",
                inner: "var(--shadow-inner)",
                glow: "0 0 20px rgba(59, 130, 246, 0.5)",
            },
            borderRadius: {
                sm: "var(--radius-sm)",
                md: "var(--radius-md)",
                lg: "var(--radius-lg)",
                full: "var(--radius-full)",
            },
        },
    },
    plugins: [],
};

export default config;