# 사용자 단계의 키·OAuth 발급과 SSM 보관 (#422)

- 조사일: 2026-11-08. 발급 조건과 한도는 바뀔 수 있으므로 발급 직전에 공식 안내로 다시 확인한다.
- 사용자 결정(2026-11-08): 환경변수와 API 키는 AWS SSM Parameter Store로 관리한다.
- 근거 수준: **공식**은 제공처 페이지에서 직접 읽은 값, **2차**는 블로그·검색 결과에서만 본 값, **미확인**은 찾지 못한 값이다.

## 요약

| 이슈 | 발급할 것 | 승인 | 만료 | SSM 경로 (제안) | 앱 환경변수 |
|---|---|---|---|---|---|
| project-standards#266 | Anthropic API 키 | 즉시 | 만들 때 고름(Never 가능) | `/sirloinbh/shared/anthropic-api-key` | `ANTHROPIC_API_KEY` |
| project-standards#286 | healthchecks.io 프로젝트 ping key | 즉시 | 없음 | `/sirloinbh/shared/healthchecks-ping-key` | 서버 설치 스크립트가 읽음 |
| study-log#129, life-journal#40(TourAPI), health-log#118 | 공공데이터포털 인증키 **하나** | 개발계정 자동, 첫 사용까지 1시간~반나절 | 2년(2차) | `/sirloinbh/shared/data-go-kr-service-key` | `HOLIDAY_API_KEY`, `TOURAPI_SERVICE_KEY` 등 |
| life-journal#38 | Google OAuth 클라이언트 ID·비밀값 | 즉시, 검수 없이 게시 | 없음 | `/sirloinbh/life-journal/google-oauth-client-id`, `-secret` | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` |
| life-journal#40 | YES24 키, TMDB 읽기 토큰 | 즉시 | 없음(미확인 포함) | `/sirloinbh/life-journal/yes24-api-key`, `tmdb-read-access-token` | `YES24_API_KEY`, `TMDB_READ_ACCESS_TOKEN` |
| life-journal#44 | KOPIS 키 | 이메일 발급(2차) | 1년(2차) | `/sirloinbh/life-journal/kopis-service-key` | `KOPIS_SERVICE_KEY` |
| money-ledger#85 | KRX 키, Tiingo 토큰, 수출입은행 키 | KRX는 키·API마다 관리자 승인(약 1일), 나머지 즉시 | KRX 1년(연장 요청), 수출입은행 2년(재동의) | `/sirloinbh/money-ledger/krx-api-key`, `tiingo-api-key`, `koreaexim-api-key` | `KRX_API_KEY`, `TIINGO_API_KEY`, `KOREAEXIM_API_KEY` |
| health-log#28 | Garmin Personal API 키 | 즉시(승인 없음) | 30일~1년 중 고름 | `/sirloinbh/health-log/garmin-personal-api-key` | `GARMIN_PERSONAL_API_KEY` |

환경변수 이름은 각 앱 문서에 이미 정한 것을 따랐다. life-journal#38과 health-log#28은 아직 이름이 없어 이 문서가 제안한다.

## 조사에서 새로 알게 된 것

- **공공데이터포털 키는 계정에 하나다.** 특일정보, TourAPI, 식품영양성분 API를 각각 활용신청하면 같은 키로 부른다(2차). 그래서 SSM에는 공용 경로 하나로 두고, 앱마다 다른 환경변수로 넘긴다.
- **Garmin이 개인용 공식 API(Personal)를 열었다.** 신청·승인 없이 Garmin Connect 설정에서 키를 받는다. 비공식 라이브러리(garth)는 더 관리되지 않는다. health-log#28은 이 방식이 1순위다.
- **Google OAuth는 "테스트" 상태로 두면 refresh token이 7일 뒤 만료된다.** 혼자 쓰는 앱은 검수 없이 "프로덕션"으로 게시할 수 있다(경고 화면은 뜬다). 리디렉션 주소는 localhost가 아니면 공개 도메인의 https여야 해서, 서버에서 쓰려면 서브도메인(#406)이 먼저 있어야 한다.
- **알라딘 Open API는 2026-10-30에 끝났다.** YES24는 개인에게 키를 바로 발급한다.
- **KRX 약관은 비상업 목적만 허용하고 받은 정보를 제3자에게 줄 수 없다.** money-ledger를 혼자 쓰는 동안은 괜찮지만 다른 사람에게 시세를 보여 주면 약관 위반 소지가 있다. 화면에 "한국거래소 통계정보" 표시가 필요하다.
- **만료 주기가 서비스마다 다르다.** 만료 알림 메일을 받을 주소를 정확히 등록하고, 아래 "갱신 일정"을 따른다.

## 서비스별 발급 절차

### Anthropic API 키 (#266)
1. Console(`platform.claude.com`)에서 앱 공용 workspace(`byunghk-tool`, ADR-0010)를 만든다. Default Workspace에는 지출 한도를 걸 수 없다(공식).
2. Workspaces → 그 workspace → Spend limits에서 월 한도와 알림을 정한다. 한도에 닿으면 API가 400을 준다(공식).
3. API keys → Create key. 그 workspace로 한정하고, 만료는 Never 또는 1년을 고른다. 만든 뒤에는 만료를 바꿀 수 없다(공식).
4. 값은 화면에서 바로 SSM에 넣는다(아래 "SSM에 넣는 명령").

### healthchecks.io (#286)
- 무료 Hobbyist는 체크 20개까지다(공식). 앱 8개 × (health, 백업, 복구 확인)과 매일 보고를 합치면 20개를 넘을 수 있어 #284의 체크 수를 다시 센다.
- 신호 주소는 두 형식이 있다(공식). UUID 형식(`hc-ping.com/<uuid>`)은 체크마다 비밀 주소가 하나씩 생긴다. **ping key + slug 형식**(`hc-ping.com/<ping-key>/<slug>`)은 프로젝트의 ping key 하나만 비밀이고 slug는 공개해도 된다. SSM에 값 하나만 두면 되므로 slug 형식을 쓴다.
- 프로젝트 Settings에서 ping key를 만든다. API 키는 쓰지 않는다.

### 공공데이터포털 인증키 (study-log#129, life-journal#40 TourAPI, health-log#118)
1. data.go.kr 가입 → 각 API 상세 페이지에서 "활용신청". 개발계정은 자동승인이다(공식). 셋을 한 번에 신청한다.
   - 특일 정보(15012690): 개발 하루 10,000건
   - 국문 관광정보 TourAPI(15101578): 개발 **하루 1,000건**. 운영계정은 심의
   - 식품영양성분DB(15127578): 개발 하루 10,000건
2. 마이페이지에서 "일반 인증키(Decoding)"를 SSM에 넣는다. 코드의 HTTP 라이브러리가 쿼리를 인코딩하므로 Encoding 키를 쓰면 이중 인코딩으로 키 오류가 난다(공식 지침, 2차 사례).
3. 승인 직후 1시간~반나절은 `SERVICE_KEY_IS_NOT_REGISTERED_ERROR`(30)가 날 수 있다(2차). 기다렸다가 다시 확인한다.
4. 키는 쿼리 문자열(`serviceKey`, 특일정보는 `ServiceKey`)로만 보낸다(공식). 로그에 URL을 남길 때 지운다.
- health-log#118은 아직 "나중에 검토"다. 키는 같으므로 그 API만 활용신청하면 된다.

### Google 캘린더 OAuth 클라이언트 (life-journal#38)
1. Google Cloud에서 프로젝트를 만들고 Calendar API를 켠다.
2. OAuth 동의 화면: 사용자 유형 "외부", 범위는 구현에 필요한 최소(`calendar.events` 등). `calendar.events`는 민감 범위다(2차).
3. **게시 상태를 "프로덕션"으로 바꾼다.** 검수는 신청하지 않는다. 100명 미만 개인 사용은 검수가 필수가 아니다(공식). 로그인 때 "확인되지 않은 앱" 경고를 넘겨야 한다. "테스트"로 두면 refresh token이 7일마다 만료된다(공식).
4. OAuth 클라이언트(웹 애플리케이션)를 만든다. 리디렉션 URI 규칙(공식):
   - 로컬 개발: `http://localhost:<레지스트리 api 포트>/...`는 허용
   - 서버: 공개 도메인의 https만 허용. IP 주소나 사설 도메인은 안 된다. #406(서브도메인·HTTPS)이 끝나야 등록할 수 있다
5. 클라이언트 ID와 비밀값을 SSM에 넣는다. 사용자가 연결한 뒤 받는 refresh token은 앱이 DB에 저장한다(SSM에 넣지 않음).
- 대안: 서비스 계정에 개인 캘린더를 공유해 OAuth 없이 쓰는 방법은 동작한다는 보고와 안 된다는 보고가 엇갈린다(2차). 쓰지 않는다.

### YES24, TMDB (life-journal#40)
- **YES24:** `developers.yes24.com`에서 로그인, 이용 목적 입력, 약관 동의 후 즉시 발급. `X-Api-Key` 헤더, 기본키 하루 20,000회·초당 10회, 1인 1키. 화면에 출처와 상품 상세페이지 링크를 달아야 하고, 별도 DB로 대량 수집하면 안 된다(공식).
- **TMDB:** 계정 설정 → API에서 신청. v4 읽기 액세스 토큰을 `Authorization: Bearer`로 쓴다. 비상업 무료, 로고와 고지 문구 표시, 캐시는 6개월 이하(공식). 만료는 미확인.

### KOPIS (life-journal#44)
- kopis.or.kr에서 PC로만 신청, 1인 1키(공식). 키는 쿼리 `service`로 보내고, 명세가 http로만 나온다(공식, 개발가이드 v5.0). 출처 표기 의무.
- 호출 한도 수치, 만료, 상업 조건은 미확인이다. 신청할 때 약관에서 확인해 이슈에 적는다.

### KRX, Tiingo, 수출입은행 (money-ledger#85)
- **KRX:** Data Marketplace 가입 → 인증키 신청(관리자 승인) → 유가증권·코스닥·ETF 일별매매정보를 **각각** 이용신청(관리자 승인, 약 1일, 2차). 키만 있고 API 승인이 없으면 401이다(2차). 키당 하루 10,000회, 이용기간 1년이고 만료 전에 연장 요청, 12개월 안 쓰면 삭제될 수 있다(공식 약관). 헤더 `AUTH_KEY`로 보낸다(2차).
- **Tiingo:** 가입 후 무료 Starter 토큰 확인. 시간당 50회, 하루 1,000회, 월 500종목, 본인 개인 용도만(공식). `Authorization: Token <토큰>` 헤더.
- **수출입은행:** `oapi.koreaexim.go.kr`에서 개인정보 동의와 본인인증 후 발급. 하루 1,000회, 넘으면 `result:4`(공식). 개인정보 보유기간 2년이 지나기 전에 메일로 재동의해야 하고, 놓치면 키가 파기돼 `result:3`(인증 오류와 같은 값)이 온다(공식). 오류도 HTTP 200이라 `result`를 꼭 검사한다.

### Garmin Personal API (health-log#28)
- Garmin Connect 웹 → 설정 → Personal API Token에서 키를 만든다. 신청·승인 없음, 본인 데이터만, pull 방식만(공식).
- 만료를 30일·90일·180일·1년 중 고른다. 1년을 고르고 갱신 일정에 넣는다. 키는 한 번만 보이므로 바로 SSM에 넣는다.
- 앱은 키로 24시간짜리 액세스 토큰을 받는다(refresh token 없음). 토큰은 저장하지 않고 필요할 때 다시 받는다.
- 호출 한도와 약관 세부는 미확인이다. #26 조사의 결정과 다르면 #28을 시작할 때 다시 정한다.

## 갱신 일정

| 키 | 주기 | 할 일 |
|---|---|---|
| KRX | 1년 | 만료 전 연장 요청 |
| 수출입은행 | 2년 | 메일 재동의 |
| 공공데이터포털 | 2년(2차) | 포털에서 활용기간 연장 |
| KOPIS | 1년(2차) | 미확인. 발급 때 확인 |
| Garmin | 고른 기간(최대 1년) | 새 키 만들어 SSM 값 교체 |
| Anthropic | 고른 기간 | Never가 아니면 새 키 만들어 교체 |

교체는 SSM 값만 바꾼다. 서버는 다음 배포부터, PC는 `pull`을 다시 실행하면 새 값을 쓴다.

## SSM에 넣는 명령

값이 셸 기록과 채팅에 남지 않게, 지금 `tools/app-secrets.mjs set`처럼 표준 입력으로 받는다. 일반화한 명령(`set <경로>`)은 구현 이슈에서 만든다. 그전까지는 AWS CLI로 직접 넣는다.

```powershell
# 값을 묻고 화면에 보이지 않게 받는다
$v = Read-Host -AsSecureString '값'
$plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($v))
aws ssm put-parameter --profile <개인 프로필> --region ap-northeast-2 --type SecureString --overwrite --name /sirloinbh/<앱>/<이름> --value $plain
Remove-Variable v, plain
# 확인: 값 없이 이름과 수정 시각만
aws ssm describe-parameters --profile <개인 프로필> --region ap-northeast-2 --parameter-filters Key=Name,Option=BeginsWith,Values=/sirloinbh/
```

`--value`로 넘긴 값은 그 PowerShell 창의 명령 기록에 남지 않지만(`Read-Host`로 받은 변수), 같은 PC의 다른 프로세스가 명령줄 인자를 볼 수 있다. 구현 이슈에서는 표준 입력으로 넘기는 명령을 만든다.

## 후속 구현 (제안)

1. ADR-0010을 넓히는 새 ADR: 경로 규칙, `@ssm=` 태그, 권한
2. shared-aws-infrastructure: 서버 읽기 권한을 `/sirloinbh/shared/*`, `/sirloinbh/<앱>/*`로 넓히고 사용자 정책에 쓰기 권한
3. 배포 템플릿: `@ssm=` 태그를 읽어 넘기기(`remote-deploy.sh`, `ssm-get.sh`), 서버 설치 스크립트가 healthchecks ping key 읽기
4. `tools/app-secrets.mjs`: `set <경로>`, `check`, `pull <앱>`
5. `standards-check`, `docs/env-matrix.md`: `@ssm=` 검사와 표시

## 출처

- Google OAuth: https://developers.google.com/identity/protocols/oauth2 , https://support.google.com/cloud/answer/13464323 , https://developers.google.com/identity/protocols/oauth2/web-server
- TMDB: https://developer.themoviedb.org/docs/faq , https://www.themoviedb.org/api-terms-of-use
- YES24: https://developers.yes24.com/docs/apikey , https://developers.yes24.com/support/terms ; 알라딘 종료: https://blog.aladin.co.kr/openapi
- Tiingo: https://www.tiingo.com/about/pricing , https://www.tiingo.com/documentation/general/connecting
- healthchecks.io: https://healthchecks.io/pricing/ , https://healthchecks.io/docs/slug_urls/
- Garmin: https://developer.garmin.com/gc-developer-program/overview/ , https://developer.garmin.com/gc-developer-program/personal/personal-faq/ , https://github.com/matin/garth
- Anthropic: https://platform.claude.com/docs/en/manage-claude/authentication , https://platform.claude.com/docs/en/manage-claude/workspaces
- 공공데이터포털: https://www.data.go.kr/data/15012690/openapi.do , https://www.data.go.kr/data/15101578/openapi.do , https://www.data.go.kr/data/15127578/openapi.do
- KOPIS: https://www.kopis.or.kr/por/cs/openapi/openApiInfo.do?menuId=MNU_00074
- KRX: https://openapi.krx.co.kr/contents/OPP/INFO/OPPINFO003.jsp , 약관 https://openapi.krx.co.kr/contents/OPP/INFO/OPPINFO002.jsp
- 수출입은행: https://www.koreaexim.go.kr/ir/HPHKIR020M01?apino=2&viewtype=C

## SSM 보관 방식 (제안)

지금은 Claude API 키 하나만 SSM에 있다([ADR-0010](../adr/0010-claude-api-key-ssm.md)). 서버 IAM 사용자 `sirloinbh-apps-secrets-reader`는 그 파라미터 하나만 읽을 수 있고, 배포 스크립트는 그 이름을 직접 적어 읽는다. 키가 앱 5개, 10개 이상으로 늘어나므로 아래처럼 넓힌다. 이 문서는 제안이며, 채택하면 ADR-0010을 고치는 새 ADR과 구현 이슈로 진행한다.

### 이름

| 종류 | 경로 | 예 |
|---|---|---|
| 여러 앱이 같은 값을 쓰는 키 | `/sirloinbh/shared/<이름>` | `/sirloinbh/shared/anthropic-api-key`, `/sirloinbh/shared/data-go-kr-service-key` |
| 한 앱만 쓰는 키 | `/sirloinbh/<앱>/<이름>` | `/sirloinbh/money-ledger/tiingo-api-key` |

- `<이름>`은 소문자와 하이픈으로 쓴다. 앱이 읽는 환경변수 이름과 따로 두어, 공공데이터포털 키 하나를 앱마다 다른 변수(`HOLIDAY_API_KEY`, `TOURAPI_SERVICE_KEY`)로 넘길 수 있게 한다.
- 모두 `SecureString`, AWS 관리형 KMS 키(`alias/aws/ssm`), 표준 파라미터(무료), 리전 `ap-northeast-2`.
- 기존 `/sirloinbh/anthropic-api-key`는 #266에서 아직 값을 넣지 않았으므로, 넣기 전에 `/sirloinbh/shared/anthropic-api-key`로 옮기면 옮길 값이 없다.

### 어느 변수에 어느 파라미터를 넣는지

앱의 `.env.example`이 환경변수의 원본이므로([env-conventions.md](../env-conventions.md)) 거기에 태그 하나를 더한다.

```dotenv
# @desc 공휴일 조회용 공공데이터포털 인증키(Decoding) @secret @used=backend @ssm=/sirloinbh/shared/data-go-kr-service-key
HOLIDAY_API_KEY=
```

- 배포 스크립트는 `@ssm=` 태그가 있는 키마다 SSM을 읽어 compose 환경변수로 넘긴다. 서버 `.env`에는 값을 쓰지 않는다. 지금 Claude 키를 읽는 방식(`deploy/ssm-get.sh`)을 태그 목록으로 넓힌 것이다.
- 로컬 개발은 `node tools/app-secrets.mjs pull <앱>`이 같은 태그를 읽어 그 앱의 `.env`에 넣는다. 지금은 Claude 키 하나를 `project-standards/.env`에 넣는다.
- `standards-check`가 `@ssm=` 경로 모양을 검사하고, `docs/env-matrix.md`에 경로를 함께 보여 준다. 값은 나오지 않는다.

### 권한

| 주체 | 권한 | 범위 |
|---|---|---|
| 사용자 PC(개인 AWS 프로필) | `ssm:PutParameter`, `GetParameter`, `GetParametersByPath`, `DeleteParameter` | `parameter/sirloinbh/*` |
| 서버 `sirloinbh-apps-secrets-reader` | `ssm:GetParameter`, `GetParametersByPath` | `parameter/sirloinbh/shared/*`, `parameter/sirloinbh/<앱>/*`(서버에 있는 앱) |
| CI | 없음 | 테스트는 외부 API를 가짜로 바꾼다 |
| 에이전트 | 없음 | 값을 보거나 옮기지 않는다. 존재 여부 확인(`check`)만 한다 |

- 앱이 모두 서버 하나에 있으므로 앱별로 IAM 사용자를 나누지 않는다. 서버 키가 유출되면 모든 앱 키를 함께 교체한다(ADR-0010과 같은 판단).
- 지금 사용자 IAM(`terraform-workout` 정책)에는 SSM 쓰기 권한이 없어 #266에서 거부됐다. 위 범위로 권한을 더해야 한다.

### SSM에 넣지 않는 것

- **OAuth refresh token처럼 앱이 실행 중에 받는 값:** 사용자가 처음 연결할 때 앱이 받아 저장하고, 만료되면 앱이 다시 받는다. 서버가 SSM에 쓰려면 쓰기 권한이 필요해지므로 앱 DB에 둔다. SSM에는 OAuth 클라이언트 ID·비밀값만 둔다.
- **DB 비밀번호처럼 서버에서 정하는 값:** 지금처럼 서버 `.env`에 둔다. 이 이슈의 범위 밖이다.
- **healthchecks.io 신호 주소:** 서버 timer가 쓰는 값이라 앱 compose가 아니라 서버 설치 스크립트가 읽는다. SSM에 두면 설치 스크립트도 SSM을 읽어야 한다(아래 표 참고).
