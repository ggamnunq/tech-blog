#!/usr/bin/env bash
# AWS 공식 아키텍처 아이콘 패키지를 diagrams/_vendor/aws 에 받음 (gitignore — 레포에 올리지 않음)
# 패키지는 분기마다 갱신됨. 새 주소는 https://aws.amazon.com/architecture/icons/ 의 "Icon package" 링크
# 이용 조건: AWS는 고객·파트너가 아키텍처 다이어그램에 아이콘을 쓰도록 허용함 (같은 페이지 참고)
set -euo pipefail
URL="${1:-https://d1.awsstatic.com/onedam/marketing-channels/website/public/shared/architecture-icon-release/Icon-package_07312026.5846e92413caa21490223536cc97f1269e44fa92.zip}"
cd "$(dirname "$0")/.."
tmp="$(mktemp -d)"
curl -fsSL -o "$tmp/icons.zip" "$URL"
rm -rf diagrams/_vendor/aws && mkdir -p diagrams/_vendor/aws
unzip -q "$tmp/icons.zip" -d diagrams/_vendor/aws
rm -rf diagrams/_vendor/aws/__MACOSX "$tmp"
echo "AWS icons → diagrams/_vendor/aws ($(find diagrams/_vendor/aws -name '*.svg' | wc -l | tr -d ' ') svg)"
