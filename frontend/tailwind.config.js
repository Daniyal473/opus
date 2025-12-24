/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'teal-primary': '#c7b25e',
                'teal-light': '#E0F7FA',
                'checking-out': '#FF8800',
                'maintenance': '#CC0000',
            },
        },
    },
    plugins: [],
}
