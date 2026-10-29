# EcoTrace Global

Nền tảng nhập liệu từ chứng từ và file Excel, tính phát thải khí nhà kính (Scope 1, 2, 3), phân bổ dấu chân carbon về sản phẩm phục vụ **CBAM**, đề xuất giảm phát thải theo quy tắc và cấp **Hộ chiếu xanh số** (ECDSA P-256 + QR) cho doanh nghiệp vừa và nhỏ xuất khẩu.

> Tài liệu kỹ thuật đầy đủ: [`EcoTrace_Global.md`](./EcoTrace_Global.md)

## Cấu trúc thư mục (monorepo)

```text
ecotrace-global/
├── EcoTrace_Global.md        # Tài liệu kỹ thuật đầy đủ (Backend + Frontend + DB)
├── docker-compose.yml        # PostgreSQL 16, MinIO, backend, frontend
├── .env.example              # Biến môi trường mẫu
├── Makefile                  # Lệnh phát triển nhanh
├── .github/workflows/        # CI cho backend và frontend
├── backend/                  # Java 21 + Spring Boot 3.5 (modular monolith)
├── frontend/                 # React 18 + TypeScript + Vite + Tailwind CSS
├── data/                     # Hệ số phát thải CSV mẫu
├── scripts/                  # generate_signing_key.sh, seed_demo_data.sh
├── docs/                     # Phương pháp tính, ADR
└── infra/                    # Cấu hình Nginx / deploy
```

## Chạy nhanh khi phát triển

### 1. Khởi động PostgreSQL + MinIO

```bash
docker compose up -d postgres minio minio-init
```

### 2. Chạy Backend (cổng `8080`, context path `/api/v1`)

```bash
cd backend
./mvnw spring-boot:run
# Swagger UI: http://localhost:8080/api/v1/swagger-ui.html
# OpenAPI JSON: http://localhost:8080/api/v1/v3/api-docs
```

Chạy kiểm thử backend:

```bash
cd backend
./mvnw test      # Unit test (không cần Docker)
./mvnw verify    # Unit test + Integration test (Testcontainers PostgreSQL)
```

### 3. Chạy Frontend (cổng `5173`, proxy `/api` → `localhost:8080`)

```bash
cd frontend
npm install
npm run dev
```

Kiểm tra type, lint, test và build frontend:

```bash
cd frontend
npm run lint
npm test
npm run build
```

