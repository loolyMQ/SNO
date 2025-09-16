module.exports = {
  root: true,
  env: { node: true, browser: true, es2021: true, jest: true },
  parser: "@typescript-eslint/parser",
  parserOptions: { 
    ecmaVersion: "latest", 
    sourceType: "module", 
    project: "./tsconfig.base.json",
    tsconfigRootDir: __dirname
  },
  settings: { react: { version: "detect" } },
  plugins: ["@typescript-eslint", "import"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "prettier"
  ],
  rules: {
    // Clean Code principles
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "prefer-const": "error",
    "no-var": "error",
    "no-unused-vars": "off", // handled by TypeScript
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    
    // Naming conventions (camelCase, PascalCase, etc.)
    "@typescript-eslint/naming-convention": [
      "error",
      {
        "selector": "variable",
        "format": ["camelCase", "UPPER_CASE", "PascalCase"],
        "leadingUnderscore": "allow"
      },
      {
        "selector": "function",
        "format": ["camelCase", "PascalCase"]
      },
      {
        "selector": "typeLike",
        "format": ["PascalCase"]
      },
      {
        "selector": "interface",
        "format": ["PascalCase"]
      }
    ],
    
    // Import organization and order
    "import/order": [
      "error",
      {
        "groups": [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index"
        ],
        "alphabetize": { "order": "asc", "caseInsensitive": true },
        "newlines-between": "always"
      }
    ],
    "import/no-duplicates": "error",
    "import/no-unresolved": "off", // handled by TypeScript
    
    // TypeScript specific rules
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/consistent-type-imports": ["error", { "prefer": "type-imports" }],
    "@typescript-eslint/prefer-nullish-coalescing": "off",
    "@typescript-eslint/prefer-optional-chain": "off", 
    "@typescript-eslint/no-unnecessary-condition": "off",
    "@typescript-eslint/no-non-null-assertion": "warn",
    
    // Code quality
    "complexity": ["warn", 15],
    "max-lines-per-function": ["warn", 100],
    "max-depth": ["warn", 6],
    "max-params": ["warn", 6],
    "@typescript-eslint/no-empty-object-type": "off"
  },
  ignorePatterns: ["dist", "build", "node_modules", "*.js", "*.cjs", "*.mjs", ".turbo/**"],
};
