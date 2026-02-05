/** @type {import('prettier').Config & import('prettier-plugin-tailwindcss').PluginOptions} */
export default {
    quoteProps: 'as-needed',
    arrowParens: 'always',
    bracketSameLine: true,
    bracketSpacing: true,
    endOfLine: 'lf',
    htmlWhitespaceSensitivity: 'ignore',
    jsxSingleQuote: true,
    printWidth: 120,
    proseWrap: 'preserve',
    semi: true,
    singleAttributePerLine: false,
    singleQuote: true,
    tabWidth: 4,
    trailingComma: 'es5',
    useTabs: false,
    plugins: ['prettier-plugin-tailwindcss'],
    // Tailwind CSS v4 projects must point the formatter at the stylesheet
    // that imports Tailwind so custom utilities and theme tokens are known.
    tailwindStylesheet: './src/styles/index.css',
};
