/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: "#FBF6F3",
          deep: "#F6ECE9",
        },
        mist: "#F4EEF9",
        lavender: {
          50: "#F6F0FC",
          100: "#ECE0F7",
          200: "#D9C2EE",
          300: "#C3A3E4",
          400: "#A982D6",
          500: "#8F63C2",
          600: "#764AA3",
        },
        blush: {
          50: "#FDF3F5",
          100: "#FBE5EA",
          200: "#F6C6D2",
          300: "#EE9FB1",
          400: "#E2758D",
          500: "#D14D6D",
        },
        plum: {
          700: "#4A2A52",
          800: "#3A1F43",
          900: "#2A152F",
        },
        ink: {
          DEFAULT: "#3A1F43",
          soft: "#6B4A72",
          faint: "#9A82A0",
        },
      },
      borderRadius: {
        soft: "16px",
        card: "26px",
        panel: "34px",
      },
      fontFamily: {
        geist: ["Geist_400Regular"],
        "geist-medium": ["Geist_500Medium"],
        "geist-semibold": ["Geist_600SemiBold"],
        "instrument-serif": ["InstrumentSerif_400Regular_Italic"],
      },
    },
  },
  plugins: [],
};
