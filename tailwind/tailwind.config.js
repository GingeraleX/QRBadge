/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./public/**/*.{html,js}"
        // If you had other folders with .html/.js that use Tailwind classes, list them here.
    ],
    plugins: [
        require("daisyui"),
        require("@tailwindcss/typography")
    ],
    daisyui: {
        themes: [
            {
                arcanode: {
                    "primary": "#fff",
                    "primary-content": "#161616",
                    "secondary": "#e0e0e0",
                    "secondary-content": "#121212",
                    "accent": "#f9f9f9",
                    "accent-content": "#151515",
                    "neutral": "#4a4a4a",
                    "neutral-content": "#d8d8d8",
                    "base-100": "#3a3938",
                    "base-200": "#31302f",
                    "base-300": "#282827",
                    "base-content": "#d4d4d3",
                    "info": "#6a7ac8",
                    "info-content": "#04050f",
                    "success": "#2f4f4f",
                    "success-content": "#d2d9d9",
                    "warning": "#d4af37",
                    "warning-content": "#100b01",
                    "error": "#b57ba6",
                    "error-content": "#0c050a",
                    "--rounded-box": "0.5rem", // border radius rounded-box utility class, used in card and other large boxes
                    "--rounded-btn": "0.25rem", // border radius rounded-btn utility class, used in buttons and similar element
                    "--rounded-badge": "0.8rem", // border radius rounded-badge utility class, used in badges and similar
                    "--animation-btn": "0.12s", // duration of animation when you click on button
                    "--animation-input": "0.1s", // duration of animation for inputs like checkbox, toggle, radio, etc
                    "--btn-focus-scale": "0.95", // scale transform of button when you focus on it
                    "--border-btn": "0.5px", // border width of buttons
                    "--tab-border": "0.5px", // border width of tabs
                    "--tab-radius": "0.25rem", // border radius of tabs
                },
            },
            "light",
            "dark",
            "wireframe",
            "valentine"
            // You can add more DaisyUI themes here (e.g., "cupcake", "corporate", etc.)
        ],
    }
};
