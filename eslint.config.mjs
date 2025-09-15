import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import reactHooks from "eslint-plugin-react-hooks";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // Lucide React 아이콘은 alt prop이 필요하지 않음
      "jsx-a11y/alt-text": ["error", {
        "elements": ["img", "object", "area", "input[type=\"image\"]"],
        "img": ["Image"],
        "object": ["Object"],
        "area": ["Area"],
        "input[type=\"image\"]": ["InputImage"]
      }],
      // 언더스코어로 시작하는 변수는 사용하지 않아도 경고하지 않음
      "@typescript-eslint/no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }],
    },
  },
];

export default eslintConfig;
