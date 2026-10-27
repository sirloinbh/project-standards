# #237 리포 공개 전환 (회사 신원 정리)

## 왜

비공개 리포의 GitHub Actions 사용 한도가 차서 CI가 시작되지 않았다(#236, "recent account payments have failed or your spending limit needs to be increased"). 공개 리포는 기본 러너가 무료라 공개로 바꾸기로 했다. 공개 전에 노출되면 안 되는 것을 검사했다(2026-10-27).

## 검사

- 비밀값: 9개 비공개 리포의 모든 커밋에서 토큰·AWS 키·개인키·커밋된 `.env`·Terraform state·DB 백업·서버 IP 없음. 인프라 리포의 IP·계정 번호는 예시 값뿐
- 워크플로: 모두 GitHub 호스트 러너, self-hosted 러너와 `pull_request_target` 없음
- 노출 위험: 이 PC의 전역 git 설정이 회사 계정이라, 리포별 설정 전에 만든 초기 세팅 커밋이 회사 이메일로 남아 있었다(앱 7개 각 1개, 인프라 2개, workout-memo 24개). 중앙 리포는 회사 이메일 커밋이 없고, 문서 2개에 회사 GitHub 계정 이름이 있었다.

## 한 것

| 대상 | 내용 |
|---|---|
| 앱 8개, `shared-aws-infrastructure` | 회사 이메일·이름의 작성자·커미터를 개인 noreply(`sirloinbh`)로 다시 써서 모든 브랜치·태그를 강제 push. 파일 내용은 그대로(main tree 차이 0). 다시 쓰기 전 사본을 백업으로 보관 |
| workout-memo | 같은 작업. 브랜치 보호의 강제 push 허용만 잠시 켜고 바로 원래대로(필수 검사 `verify`·`docker-build`, 강제 push·삭제 금지) 되돌림. 다시 push로 생긴 브랜치별 CI는 취소 |
| 중앙 문서 | `docs/tools.md`, `docs/bootstrap-prompt.md`에서 회사 계정 이름 삭제 |
| 로컬 | 앱 사본을 새 main으로 맞추고, 병합이 끝난 `<앱>-126` 작업 폴더 삭제 |

## 남는 것

- GitHub의 PR 내부 참조(`refs/pull/*`)는 사용자가 지울 수 없다. 옛 커밋은 이 참조를 직접 받아 보면 남아 있다. 웹 화면에서는 보이지 않는다. 다만 workout-memo의 PR 5개(#2·5·7·10·11)는 Commits 탭에 회사 이메일이 보인다(이미 공개됐던 리포). 완전히 지우려면 GitHub 지원팀에 요청해야 한다.
- 중앙 리포의 옛 커밋에는 회사 계정 이름이 든 문서 내용과 개인 Gmail 작성자가 남는다(사용자가 현재 문서만 고치기로 정함).
- 다시 막으려면 리포마다 개인 git 설정이 먼저 적용돼야 한다(`~/.gitconfig-personal`, docs/tools.md).
