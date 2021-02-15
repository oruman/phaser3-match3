module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    sourceType: "module"
  },
  plugins: ["@typescript-eslint", "prettier"],
  extends: [
    "airbnb-base",
    "plugin:prettier/recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  rules: {
    "prettier/prettier": "error",
    "@typescript-eslint/explicit-function-return-type": ["warn", { allowExpressions: true }],
    "@typescript-eslint/explicit-module-boundary-types": ["warn", { allowTypedFunctionExpressions: true }],
    "@typescript-eslint/ban-ts-ignore": 0,
    "@typescript-eslint/no-namespace": [2, { allowDeclarations: true }],
    "@typescript-eslint/member-delimiter-style": 0,
    "@typescript-eslint/no-explicit-any": 0,
    "import/extensions": [0, "never"],
    "linebreak-style": ["error", "unix"],
    "no-plusplus": ["warn", { allowForLoopAfterthoughts: true }],
    "lines-between-class-members": ["warn", "always", { exceptAfterSingleLine: true }],
    "no-continue": 0
  },
  settings: {
    "import/resolver": {
      parcel: {
        rootDir: "src", // wherever your entrypoints are located
        extensions: [".ts"]
      }
    }
  }
};
