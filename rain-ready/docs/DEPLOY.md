# Deploy on AWS (ap-south-1)

1. Create/sign in to the AWS account (new accounts get credits; see event rules). Region **ap-south-1**.
2. S3: create a private bucket, block all public access.
3. IAM role for EC2: `s3:PutObject`, `s3:GetObject` on that bucket; `bedrock:InvokeModel` (and `bedrock:Converse`).
4. EC2: Amazon Linux 2023, t3.small, 20 GB. Security group: 22 from your IP, 80 and 443 open. Attach an Elastic IP and the role.
5. On the box: install git, docker, compose plugin. `git clone` the repo, `cd bharatbuilds/rain-ready`.
6. `cp .env.example .env`. Set `DOMAIN=<ip-with-dashes>.sslip.io` (e.g. `13-233-10-20.sslip.io`), `STORAGE=s3`, `S3_BUCKET=...`.
7. `docker compose up -d --build`. Caddy fetches a certificate. Open `https://<DOMAIN>` on a phone (camera and GPS need HTTPS).
8. Bedrock: enable a Claude model in the console. Find the id with `aws bedrock list-inference-profiles --region ap-south-1`. Put it in `BEDROCK_MODEL_ID`, set `TRIAGE_MODE=bedrock`, restart. Test one photo. If it fails, `TRIAGE_MODE=manual` (the app falls back anyway).
9. Backup: cron `aws s3 cp var/rainready.db s3://<bucket>/backup/` hourly. Take an AMI before recording.
10. Build the APK: `make apk API=https://<DOMAIN>`.
11. Stop the instance after judging.

| Symptom | Cause |
|---|---|
| Camera or GPS dead | page is not HTTPS |
| No certificate | ports 80/443 closed or wrong host name |
| Photos 403 | bucket private: they load via `/media/` pre-signed redirect; check the IAM role |
| Bedrock denied | model access, region or quota |
| Data lost on redeploy | `./var` not mounted |
