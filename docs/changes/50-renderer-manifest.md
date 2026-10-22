# #50 템플릿 렌더러와 관리 파일 해시(manifest)

## 변경

| 파일 | 내용 |
|---|---|
| `scripts/lib/render.mjs` | `{{변수}}` 치환(정의되지 않은 변수는 실패), 파일 형식별 관리 헤더 삽입, `# --- project ---` 아래 프로젝트 구간 보존 |
| `scripts/lib/hash.mjs` | 줄바꿈(CRLF/LF)과 BOM을 무시하는 SHA-256, 구간 추출, 필드 추출, 키 순서와 무관한 JSON 비교 |
| `scripts/lib/manifest.mjs` | `.standards/manifest.json` 생성과 대상 리포 파일 비교. 관리 방식은 전체(full)·구간(section)·필드(fields) 세 가지 |
| `scripts/test/render.test.mjs`, `manifest.test.mjs` | 테스트 16개 |

## 정한 규칙

- **GitHub Actions 표현식 보존:** `${{ github.sha }}`처럼 `$` 바로 뒤에 오는 `{{ }}`는 템플릿 변수로 보지 않는다. 워크플로 템플릿에서 GitHub Actions 표현식이 깨지지 않게 하기 위해서다.
- **헤더 위치:** 기본은 첫 줄이다. 다음 줄들은 맨 앞에 있어야 하므로 그 바로 아래에 넣는다: shebang(`#!`), Dockerfile 파서 지시어(`# syntax=`), Markdown frontmatter.
- **헤더를 넣지 않는 경우:** 주석을 쓸 수 없는 형식(JSON, `.nvmrc`, `.node-version`)이거나, 헤더가 이미 있는 파일이다.
- **줄바꿈:** 렌더링은 LF로 한다. 대상 리포의 `.gitattributes`가 체크아웃할 때 줄바꿈을 정한다(`*.ps1`은 CRLF).
- **구간 관리 파일:** 템플릿은 반드시 `# --- project ---` 줄로 끝나야 한다. 대상 리포에 표시 줄이 없으면 프로젝트 구간을 빈 채로 시작한다.

## 검증

- `npm run check`: 테스트 40개 통과(기존 24개 + 새 16개), `registry-check: ok`, `docs/projects.md: up to date`
