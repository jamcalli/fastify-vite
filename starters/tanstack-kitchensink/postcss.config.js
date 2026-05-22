export default {
  plugins: {
    '@tailwindcss/postcss': {},
    'postcss-preset-env': {
      stage: 1,
      features: {
        'nesting-rules': false,
      },
    },
  },
}
