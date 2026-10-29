.PHONY: infra-up infra-down backend-dev backend-test backend-it frontend-dev frontend-test frontend-lint gen-api

# Chạy chỉ PostgreSQL + MinIO bằng Docker để phát triển backend/frontend trực tiếp trên máy
infra-up:
	docker compose up -d postgres minio minio-init

infra-down:
	docker compose down

backend-dev:
	cd backend && ./mvnw spring-boot:run

backend-test:
	cd backend && ./mvnw -B test

backend-it:
	cd backend && ./mvnw -B verify

frontend-dev:
	cd frontend && npm run dev

frontend-test:
	cd frontend && npm test

frontend-lint:
	cd frontend && npm run lint

gen-api:
	cd frontend && npm run gen:api

