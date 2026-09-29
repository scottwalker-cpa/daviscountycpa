/** Tailwind build config for daviscountycpa.com (see tailwind/README.md) */
module.exports = {
  content: ['../index.html'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'sans-serif'] },
      colors: {
        dccpa: {
          navy: '#0B1B3D',      // Deep Law Enforcement Navy
          slate: '#2C3E50',     // Steel / Slate Gray
          gold: '#D4AF37',      // Badge Gold Accent
          goldhover: '#C5A059', // Muted Gold Hover
          bg: '#F4F6F9',        // Soft Canvas Gray
          darkbg: '#060F23',    // Dark Section Canvas
        },
      },
    },
  },
};
