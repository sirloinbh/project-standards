# 공용 도메인과 앱별 서브도메인 방식 (#248)

2026-10-28 조사. 가격은 웹 검색으로 확인한 값이다(아래 "출처"). 등록 업체 가격은 자주 바뀌므로 구매 직전에 다시 확인한다. 아무것도 구매·설정하지 않았다. 사용자가 고른 결과는 맨 아래 "결정"과 [ADR-0012](../adr/0012-shared-domain-subdomains.md)에 있다. 8장의 권장안과 결정은 등록 업체가 다르다.

## 1. 지금 상태

- 서버: Lightsail 한 대에 앱 8개(ADR-0009). 앱마다 웹 포트 8101–8108.
- 방화벽(shared-aws-infrastructure `main.tf`): 22·80만 열려 있고 둘 다 허용 IP(`allowed_cidrs`)에만 열린다. 변수 검사가 `/0`(전체 공개)을 막는다.
- 레지스트리: `platform.json`의 `rootDomain`과 앱별 `service.subdomain`이 모두 `null`.
- 앱 로그인이 없다(workout-memo#107 예정). 그래서 공개하면 누구나 데이터를 볼 수 있다.

## 2. 도메인과 등록 업체

| 등록 업체 | .com 1년 (등록 = 갱신) | WHOIS 비공개 | 비고 |
|---|---|---|---|
| Cloudflare Registrar | 약 $10.46 | 무료 | 원가 판매(도매가 + ICANN 수수료). DNS를 Cloudflare에 두어야 함 |
| Porkbun | 갱신 약 $11.08 | 무료 | |
| Namecheap | 갱신 $19.98 (2026-11-01부터) | 무료 | |
| Route 53 | $16 (2026-07-01부터. 2026-11-01 확인) | 무료 | 같은 AWS 계정에서 관리. 등록할 때 호스팅 영역이 함께 만들어진다 |

- .com 도매가는 2026-11-01에 $10.26 → $10.97로 오른다. 위 다른 업체 가격 중 이 인상이 반영되지 않은 값이 있을 수 있다.
- Route 53 가격은 AWS 가격표를 인용한 글 두 편에서 확인했다. AWS 가격표 PDF의 본문은 직접 읽지 못했으므로 구매 화면에서 다시 확인한다.
- 도메인 이름 후보는 사용자가 정한다(짧고 개인 이름과 겹치지 않는 것).

## 3. DNS 관리 위치

| 위치 | 비용 | Terraform | 인증서 DNS 검증 | 판단 |
|---|---|---|---|---|
| Route 53 | 호스팅 영역 월 $0.50, 질의 100만 건당 $0.40 | `aws_route53_zone`·`aws_route53_record` (지금 인프라 리포와 같은 provider) | certbot `dns-route53` 플러그인(공식 이미지). 이 영역만 바꿀 수 있는 IAM 키를 서버에 둔다 | **권장** |
| Lightsail DNS | 영역 무료(영역 수 한도 3~6개, 공식 수치 확인 필요) | `aws_lightsail_domain_entry` | certbot 공식 플러그인 없음 | 비권장. DNS 검증 자동화가 어렵다 |
| Cloudflare DNS | 무료 | 별도 `cloudflare` provider와 API 토큰 | certbot `dns-cloudflare` 플러그인 | 가능. 계정·토큰이 하나 더 늘어난다 |

- 등록 업체와 DNS 위치는 따로 정할 수 있다. 예: Porkbun에서 사고 네임서버만 Route 53으로 돌린다. Cloudflare Registrar는 DNS를 Cloudflare에 둬야 한다.

## 4. 서브도메인 이름

| 규칙 | 예 | 판단 |
|---|---|---|
| 레지스트리 `name` 그대로 | `workout-memo.<도메인>`, `study-log.<도메인>` | **권장.** 이미 8개가 겹치지 않고 리포 이름과 같아 헷갈리지 않는다 |
| DB 이름(짧은 이름) | `workout.<도메인>`, `study.<도메인>` | 짧지만 이름이 두 벌이 된다 |

- 형식 검사(레지스트리 충돌 검사에 넣을 것): 소문자·숫자·하이픈, 63자 이하, 앱끼리 겹치지 않음, `www`·`api`·`mail` 같은 예약 이름 금지.

## 5. 리버스 프록시와 인증서

서버에 프록시 하나를 두고 443을 받아 `127.0.0.1:810x`(앱 web 컨테이너)로 넘긴다.

| 방식 | 인증서 | 방화벽 | 이미지 | 판단 |
|---|---|---|---|---|
| nginx + certbot(`dns-route53`), 와일드카드 `*.<도메인>` | DNS-01. 90일, timer로 자동 갱신 | 443만 허용 IP에 열면 됨. 80을 전체에 열 필요 없음 | 둘 다 공식 이미지(`nginx`, `certbot/dns-route53`) | **권장** |
| Caddy, 서브도메인별 인증서(HTTP-01·TLS-ALPN-01) | 자동 발급·갱신 | Let's Encrypt가 여러 곳에서 확인하므로 80 또는 443을 **전체에 열어야** 함 | 공식 이미지 | 비권장. 지금의 "허용 IP만" 규칙과 맞지 않는다 |
| Caddy + Route 53 모듈, 와일드카드 | DNS-01, 자동 | 허용 IP만 | 모듈을 넣은 이미지를 직접 빌드(`xcaddy`) | 비권장. 직접 빌드한 이미지를 계속 관리해야 한다 |

- nginx는 앱의 web 컨테이너에서 이미 쓰고 있어 설정 방식이 같다. 프록시 설정은 레지스트리에서 생성해 서브도메인을 더할 때 사람이 고치지 않게 한다(#251).
- 와일드카드 인증서 하나로 앱 8개를 덮는다. 서브도메인을 더해도 새로 발급할 필요가 없다.

## 6. 접속 제한

| 방식 | 내용 | 판단 |
|---|---|---|
| A. 443도 허용 IP만 | 지금 규칙 그대로. 휴대폰 데이터망처럼 IP가 바뀌는 곳에서는 못 들어간다 | **권장, 지금.** 앱에 로그인이 없어서 |
| B. 443 전체 공개 + 앱 로그인 | 어디서나 접속, PWA 설치·Play 스토어 가능 | 앱 로그인(workout-memo#107) 뒤 앱별로. Play 스토어(TWA)는 Google이 `assetlinks.json`을 읽으므로 공개가 필요하다 |
| C. 443 전체 공개 + 프록시 Basic 인증 | 로그인 없이도 막을 수 있음 | 임시로만. PWA·모바일에서 불편하다 |

- DNS-01을 쓰면 A에서도 인증서를 받을 수 있다. 80은 지금처럼 허용 IP에만 두고, HTTPS로 옮긴 뒤 닫는다.

## 7. 비용

| 항목 | 1년 |
|---|---:|
| .com 도메인 (Cloudflare·Porkbun 기준) | 약 $10.5–11 |
| Route 53 호스팅 영역 $0.50 × 12 | $6 |
| 인증서 (Let's Encrypt) | $0 |
| **합계** | **약 $17 (약 24,000원, 환율 1,400원)** |

## 8. 권장안 요약

| 항목 | 권장 |
|---|---|
| 도메인 | .com 하나, Porkbun 또는 Cloudflare에서 구매(2026-11-01 전이면 더 쌈) |
| DNS | Route 53 (Terraform으로 shared-aws-infrastructure에서 관리) |
| 서브도메인 | 레지스트리 `name` 그대로 |
| 프록시 | 서버의 nginx 하나 |
| 인증서 | Let's Encrypt 와일드카드, certbot `dns-route53`(DNS-01) |
| 접속 | 지금은 443도 허용 IP만. 앱 로그인이 생기면 앱별로 공개 |

Cloudflare에서 사면 DNS도 Cloudflare여야 하므로, 권장 조합(Route 53)과 함께 쓰려면 Porkbun처럼 네임서버를 바꿀 수 있는 업체가 맞다.

## 출처

- Route 53 요금: [costgoat](https://costgoat.com/pricing/route-53), [wring.co](https://wring.co/blog/aws-route53-pricing-guide)
- .com 가격: [Cloudflare (costgoat)](https://costgoat.com/pricing/cloudflare-domains), [Namecheap 공지](https://www.namecheap.com/support/knowledgebase/article.aspx/10840/2201/com-price-change-november-1-2026/), [Verisign 인상](https://osir.com/en/blog/verisign-com-price-update-2026/), [dev.to 비교](https://dev.to/devtoolpicks/best-domain-registrars-for-indie-hackers-in-2026-cloudflare-vs-porkbun-vs-namecheap-2ebm)
- Route 53 .com 가격: [AWS 요금 페이지](https://aws.amazon.com/route53/pricing/)(가격표 PDF로 연결), [Classmethod](https://dev.classmethod.jp/en/articles/route53-tld-pricing-change-2026/), [CostGoat](https://costgoat.com/pricing/route-53-domains)
- Lightsail DNS: [AWS 문서](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-register-new-domain.html), [re:Post](https://repost.aws/questions/QUPqWChU-JS_6Rtba5mAwv8w/i-want-to-increase-the-limit-of-lightsail-domains-with-route-53)

## 결정

2026-11-01. 사용자가 "AWS로 모두 관리"를 골랐다. 그래서 등록 업체는 권장안의 Porkbun 대신 Route 53이고, 합계는 1년 약 $22(약 30,800원)다. 나머지는 권장안대로다.

| 항목 | 결정 |
|---|---|
| 도메인 | `.com` 하나, Route 53에서 등록. 이름은 구매할 때 정함(#249) |
| DNS | Route 53 |
| 서브도메인 | 레지스트리 `name` 그대로 |
| 프록시·인증서 | nginx 하나, Let's Encrypt 와일드카드, certbot `dns-route53` |
| 접속 | 443도 허용 IP만. 앱 로그인이 생기면 앱별로 공개 |
