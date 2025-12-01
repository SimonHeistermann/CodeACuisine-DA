/** @type {import("prettier").Config} */
module.exports = {
    printWidth: 100,
    singleQuote: true,
    trailingComma: "es5",
  
    plugins: ["prettier-plugin-tailwindcss"],
  
    overrides: [
      {
        files: "*.html",
        options: {
          parser: "angular",
        },
      },
    ],
};