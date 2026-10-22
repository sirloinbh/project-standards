-- 첫 마이그레이션. 기능 테이블은 002부터 새 번호의 파일로 추가한다.
-- 빈 볼륨에서는 Docker 초기화가 이 폴더의 파일을 먼저 실행하고, 뒤이어 db:migrate가 같은 파일을 다시 적용하며 기록한다.
-- 그래서 모든 마이그레이션은 다시 실행해도 안전하게 쓴다(IF NOT EXISTS, ON CONFLICT 등).
SET TIME ZONE 'Asia/Seoul';
