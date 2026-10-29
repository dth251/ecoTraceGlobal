#!/usr/bin/env bash
# Sinh cặp khóa ECDSA P-256 (secp256r1) dùng ký số Hộ chiếu xanh (mục 10.2)
# Lưu ý: KHÔNG commit file .pem sinh ra vào git (.gitignore đã chặn *.pem).
set -euo pipefail

OUT_DIR="${1:-./secrets}"
mkdir -p "$OUT_DIR"

openssl ecparam -name prime256v1 -genkey -noout -out "$OUT_DIR/passport_ec_private.pem"
openssl ec -in "$OUT_DIR/passport_ec_private.pem" -pubout -out "$OUT_DIR/passport_ec_public.pem"
chmod 600 "$OUT_DIR/passport_ec_private.pem"

echo "Generated ECDSA P-256 key pair in $OUT_DIR"

