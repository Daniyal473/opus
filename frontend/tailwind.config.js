/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'teal-primary': '#008080',
                'teal-light': '#E0F7FA',
                'checking-out': '#FF8800',
                'maintenance': '#CC0000',
            },
        },
    },
    plugins: [],
}
