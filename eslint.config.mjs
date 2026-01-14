import reactHooks from "eslint-plugin-react-hooks";

import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const eslintConfig = [
  // Next.js 16.1+ 에서 eslint-config-next가 Flat Config(Array)로 제공됩니다.
  // (FlatCompat로 legacy extends를 변환할 필요 없음)
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
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
