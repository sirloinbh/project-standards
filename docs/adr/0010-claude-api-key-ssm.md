# 0010. Claude API 키를 AWS SSM Parameter Store 한 곳에 두고 앱이 받아 쓰기

- 상태: 채택 (이슈 #264)
- 날짜: 2026-10-27

## 맥락

- 사용자가 Claude API 키를 project-standards에서 한 번 세팅하고 여러 앱에서 쓰기를 원했다(2026-10-27).
- 지금 Claude API를 쓰는 앱은 study-log 하나다(`backend/src/translation.ts`, 서버 `.env`의 `ANTHROPIC_API_KEY`).
- 리포가 모두 공개라 키 **값**은 중앙 리포에 둘 수 없다. 중앙 리포는 명령과 규칙을 제공하고, 값은 리포 밖 한 곳에 둔다.
- Lightsail 서버에는 IAM 역할을 붙일 수 없어서, 서버가 AWS를 읽으려면 서버에 키가 하나 필요하다.
- 개인 계정에는 조직 단위 Actions secret이 없다.
- 비교한 선택지(SSM, 서버 공용 파일 + PC 사용자 폴더)와 키 나누기는 #264 댓글에 있다. 사용자가 권장안을 그대로 골랐다.

## 결정

| 항목 | 결정 |
|---|---|
| 원본 | AWS SSM Parameter Store SecureString `/sirloinbh/anthropic-api-key` (ap-northeast-2, AWS 관리형 KMS 키). 표준 파라미터라 비용이 없다 |
| 키 수 | 1개. workspace 하나에 지출 한도를 건다. 두 번째 앱이 쓰기 시작할 때 앱별 키(`/sirloinbh/<앱>/anthropic-api-key`)로 나눌지 다시 정한다 |
| 운영 서버 | 배포 스크립트가 배포할 때 SSM에서 읽어 앱 컨테이너 환경변수로 넘긴다. 서버 `.env`에는 값을 쓰지 않는다. 서버에는 그 파라미터 하나만 읽을 수 있는 IAM 키를 둔다 |
| 로컬 개발 | 중앙 명령이 개인 AWS 프로필로 SSM을 읽어, 그 키를 쓰는 앱의 `.env`(git 제외)에 넣는다 |
| CI | 실제 키를 두지 않는다. 테스트는 API 호출을 가짜로 바꾼다 |
| 교체 | SSM 값만 바꾼다. 서버는 다음 배포부터, PC는 중앙 명령을 다시 실행하면 새 키를 쓴다 |
| 환경변수 이름 | `ANTHROPIC_API_KEY`(비밀값), `CLAUDE_MODEL`(모델 이름. 코드에 하드코딩하지 않는다) |
| 공통 호출 코드 | 만들지 않는다. 쓰는 앱이 늘면 #241(API 형태 조사)에서 다시 판단한다 |

## 결과

- 키를 교체할 때 고칠 곳이 SSM 하나다. 교체 기록은 AWS(CloudTrail)에 남는다.
- 서버에 AWS 읽기 키가 하나 늘어난다. 그 키로는 이 파라미터 하나만 읽을 수 있어서, 유출되어도 다른 AWS 자원에는 닿지 않는다. 다만 Claude API 키는 읽을 수 있으므로, 서버 키가 유출되면 두 키를 함께 교체한다.
- 서버는 AWS CLI 없이 `curl --aws-sigv4`로 SSM을 부른다(#262 S3 업로드와 같은 방식).
- 파라미터와 IAM 사용자는 shared-aws-infrastructure가 Terraform으로 만든다. 파라미터 **값**은 Terraform state에 남지 않도록 사용자가 직접 넣는다.
- 구현은 #265(전달 도구), 사용자 단계는 #266(키 발급·지출 한도·SSM에 넣기)이다.
