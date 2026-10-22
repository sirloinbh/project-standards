# @sirloinbh/tsconfig

sirloinbh 앱 공통 TypeScript 설정이다.

| 파일 | 쓰는 곳 |
|---|---|
| `base.json` | 공통: ES2022, strict, skipLibCheck |
| `react-app.json` | `frontend/tsconfig.json` (Vite + React, 빌드 산출물 없음) |
| `node-api.json` | `backend/tsconfig.json` (Node ESM, `dist/`로 빌드) |

```json
// frontend/tsconfig.json (중앙 관리 파일)
{ "extends": "@sirloinbh/tsconfig/react-app.json", "include": ["src", "vite.config.ts"] }
```

- `include`는 상속되지 않으므로 앱의 진입 파일에 둔다.
- `node-api.json`의 `outDir`은 `${configDir}/dist`다. 상속받는 tsconfig가 있는 폴더 기준이라, `backend/dist`로 빌드된다(TypeScript 5.5 이상).
