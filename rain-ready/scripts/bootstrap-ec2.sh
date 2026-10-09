#!/usr/bin/env bash
# Run once on a fresh Amazon Linux 2023 instance:  bash bootstrap-ec2.sh
# Installs git, docker, the compose plugin and the AWS CLI. Log out and back in afterwards.
set -euo pipefail
sudo dnf install -y git docker
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
command -v aws >/dev/null || sudo dnf install -y awscli
echo "done. Log out and back in (docker group), then: git clone <repo> && cd bharatbuilds/rain-ready && cp .env.example .env"
