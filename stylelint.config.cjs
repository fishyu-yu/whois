module.exports = {
  extends: ["stylelint-config-standard"],
  rules: {
    "no-empty-source": null,
    "at-rule-no-unknown": [true, { ignoreAtRules: ["tailwind", "theme", "plugin", "custom-variant"] }],
    "lightness-notation": null,
    "hue-degree-notation": null,
    "import-notation": null,
    "property-no-vendor-prefix": null,
    "rule-empty-line-before": null,
    "custom-property-empty-line-before": null,
    "declaration-block-single-line-max-declarations": null
  },
  ignoreFiles: [
    "**/node_modules/**",
    "**/.next/**",
    "**/out/**",
    "**/build/**"
  ]
}
