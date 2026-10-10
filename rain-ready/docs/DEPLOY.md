# Deploy on AWS (ap-south-1)

1. Create/sign in to the AWS account (new accounts get credits; see event rules). Region **ap-south-1**.
2. S3: create a private bucket, block all public access.
3. IAM role for EC2: `s3:PutObject`, `s3:GetObject` on that bucket; `bedrock:InvokeModel` (and `bedrock:Converse`). Steps 2 and 3 as one script: `scripts/aws-setup.sh <bucket>` (policy in `scripts/iam-policy.json`).
4. EC2: Amazon Linux 2023, t3.small, 20 GB. Security group: 22 from your IP, 80 and 443 open. Attach an Elastic IP and the role. Set the metadata option **hop limit to 2** (Advanced details); with 1, the Docker container cannot read the role and S3/Bedrock fail with "no credentials".
5. On the box: run `scripts/bootstrap-ec2.sh` (git, docker, compose plugin, AWS CLI), then log out and in. `git clone` the repo, `cd bharatbuilds/rain-ready`.
6. `cp .env.example .env`. Set `DOMAIN=<ip-with-dashes>.sslip.io` (e.g. `13-233-10-20.sslip.io`), `STORAGE=s3`, `S3_BUCKET=...`.
7. `docker compose up -d --build`. Caddy fetches a certificate. Open `https://<DOMAIN>` on a phone (camera and GPS need HTTPS). Then check `https://<DOMAIN>/api/health?deep=1` with the header `X-User-Id: admin-1` (the deep check is admin only and cached for 30 s): `config_warnings` must be empty and `aws` shows `s3: ok` (and `bedrock: ok` when enabled). Any error text there names the missing role, bucket or model access.
8. Bedrock: enable a Claude model in the console. Find the id with `aws bedrock list-inference-profiles --region ap-south-1`. Put it in `BEDROCK_MODEL_ID`, set `TRIAGE_MODE=bedrock`, restart. Test one photo. If it fails, `TRIAGE_MODE=manual` (the app falls back anyway).
9. Backup: hourly cron `S3_BUCKET=<bucket> scripts/backup.sh` (snapshot to `backup/rainready-<hour>.db`, keeps 24 copies). Take an AMI before recording.
10. Build the APK on your own machine, not the server: `make apk API=https://<DOMAIN>`. It needs Node, **JDK 17** and the **Android SDK** (`ANDROID_HOME`, platform and build tools installed; `mobile/build.sh` header lists them). The first run downloads Gradle and takes several minutes.
11. Stop the instance after judging.

**Automatic deploy:** after the one-time setup in `docs/AWS_TODO.md` section 3, every merge to `main` that passes the tests is deployed by the `deploy` job in `.github/workflows/test.yml` (`scripts/deploy-ssm.sh`: code to S3, then SSM runs `scripts/server-deploy.sh` on the host). The same file is the full AWS CLI playbook for the remaining AWS work.

## Cloudflare (custom domain `rainready.rumblejack56.dev`)

Checked on 10 Oct with `curl -I`:

| Path | Result |
|---|---|
| `/` (HTML) | `cf-cache-status: DYNAMIC`: not cached, always fresh |
| `/js/*`, `/css/*` | cached; `cache-control: max-age=14400` (4 h), added by Cloudflare's Browser Cache TTL. The origin sends no cache header |

So a deploy can leave old JS and CSS for up to 4 h. Two ways to avoid it:

1. **Cache Rule (recommended, no code, no chore).** Cloudflare dashboard, the zone, Caching, Cache Rules, create a rule: hostname equals `rainready.rumblejack56.dev`, action *Bypass cache*. The app is small, so the origin serves it fine.
2. **Version bump per deploy.** `web/index.html` carries `?v=N` on the CSS link, on `main.js` and on every module in the import map. Bump it before each deploy: `sed -i 's/?v=1/?v=2/g' rain-ready/web/index.html` (a test guards it).

A manual purge (Caching, Configuration, Purge Everything) also works but must be repeated after every deploy. None of this is related to the deploy job's AWS sign-in.

| Symptom | Cause |
|---|---|
| Camera or GPS dead | page is not HTTPS |
| No certificate | ports 80/443 closed or wrong host name |
| Photos 403 | bucket private: they load via `/media/` pre-signed redirect; check the IAM role |
| Bedrock denied | model access, region or quota |
| Data lost on redeploy | `./var` not mounted |
