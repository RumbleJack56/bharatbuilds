# AWS to-do for Aarush (AWS CLI playbook)

Aarush owns the AWS account. This file is the full list of AWS work that is left. Every step is an AWS CLI command, so you can hand the file to a coding agent. Section 3 sets up automatic deploys from GitHub.

## 0. Rules for the agent

1. Work only in region `ap-south-1` and only on the resources named in section 1.
2. Run the sections in order. Each step has a **Check**. If a check fails, stop and report; do not improvise a fix.
3. Do not delete or stop any resource except in section 9. Do not rotate keys.
4. Never print or commit `.env`, `rainready.pem` or any credential.
5. Every step is safe to run twice. "Already exists" is a pass.
6. At the end, fill in section 10 and send it to Ujjwal.

Needs: AWS CLI v2 logged in as an admin of the account, `python3`, the SSH key `rain-ready/rainready.pem`, and a clone of the repo. Run all commands from the repo root.

## 1. Values

```bash
export AWS_REGION=ap-south-1 AWS_PAGER=""
export ACCOUNT=<account-id>
export INSTANCE=<instance-id>
export IP=<elastic-ip>
export HOST=<ip-with-dashes>.sslip.io
export BUCKET=rainready-photos-<account-id>
export EC2_ROLE=rainready-ec2
export GH_REPO=RumbleJack56/bharatbuilds
export GH_ROLE=rainready-github-deploy
# This repo uses GitHub's immutable OIDC subject (owner and repo ids in the claim). If it changes:
#   gh api repos/$GH_REPO/actions/oidc/customization/sub --jq .sub_claim_prefix
export GH_SUB_IMMUTABLE="repo:RumbleJack56@57482148/bharatbuilds@1412276053"
SSH="ssh -i rain-ready/rainready.pem ec2-user@$IP"
APP=bharatbuilds/rain-ready     # the app directory on the server
```

## 2. Check what exists

```bash
aws sts get-caller-identity --query Account --output text
aws ec2 describe-instances --instance-ids $INSTANCE --query \
  'Reservations[0].Instances[0].[State.Name,PublicIpAddress,IamInstanceProfile.Arn,MetadataOptions.HttpPutResponseHopLimit]'
aws s3api get-public-access-block --bucket $BUCKET
curl -fsS -H "X-User-Id: admin-1" "https://$HOST/api/health?deep=1"
```

**Check:** the account is `<account-id>`; the instance is `running` with IP `<elastic-ip>`, profile `rainready-ec2` and hop limit `2`; all four public-access flags are `true`; health shows `"ok":true` and `"s3":"ok"`.

If the hop limit is 1: `aws ec2 modify-instance-metadata-options --instance-id $INSTANCE --http-put-response-hop-limit 2`.

## 3. Automatic deploy from GitHub

How it works: a pull request is merged to `main`, the tests run, then the `deploy` job in `.github/workflows/test.yml` signs in to AWS with a short-lived token (OIDC, no stored keys), uploads the code to `s3://$BUCKET/deploy/` and tells the server through SSM to unpack it, rebuild and check health. No SSH key and no open port are used. An open pull request does not deploy: only code on `main` reaches the live host.

### 3.1 Let SSM reach the server

```bash
aws iam attach-role-policy --role-name $EC2_ROLE \
  --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
$SSH 'sudo systemctl restart amazon-ssm-agent'
sleep 60
aws ssm describe-instance-information \
  --filters "Key=InstanceIds,Values=$INSTANCE" --query 'InstanceInformationList[0].PingStatus'
```

**Check:** the last command prints `"Online"`. If it prints `null`, wait two minutes and run it again.

### 3.2 Trust GitHub (OIDC provider)

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com --client-id-list sts.amazonaws.com
```

**Check:** `aws iam list-open-id-connect-providers` lists `token.actions.githubusercontent.com`. An `EntityAlreadyExists` error is a pass. If the CLI asks for a thumbprint, add `--thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1`.

### 3.3 Deploy role for GitHub

Only workflows on the `main` branch of this one repo can use the role. The trust policy lists both subject formats: the classic `repo:<owner>/<repo>` and the immutable one with owner and repo ids. With only the classic one the deploy job fails with `Not authorized to perform sts:AssumeRoleWithWebIdentity`.

```bash
cat > /tmp/gh-trust.json <<EOF
{"Version":"2012-10-17","Statement":[{"Effect":"Allow",
 "Principal":{"Federated":"arn:aws:iam::$ACCOUNT:oidc-provider/token.actions.githubusercontent.com"},
 "Action":"sts:AssumeRoleWithWebIdentity",
 "Condition":{"StringEquals":{
   "token.actions.githubusercontent.com:aud":"sts.amazonaws.com",
   "token.actions.githubusercontent.com:sub":[
     "repo:$GH_REPO:ref:refs/heads/main",
     "$GH_SUB_IMMUTABLE:ref:refs/heads/main"]}}}]}
EOF
cat > /tmp/gh-policy.json <<EOF
{"Version":"2012-10-17","Statement":[
 {"Sid":"UploadCode","Effect":"Allow","Action":"s3:PutObject",
  "Resource":"arn:aws:s3:::$BUCKET/deploy/*"},
 {"Sid":"RunOnTheServer","Effect":"Allow","Action":"ssm:SendCommand","Resource":[
  "arn:aws:ec2:$AWS_REGION:$ACCOUNT:instance/$INSTANCE",
  "arn:aws:ssm:$AWS_REGION::document/AWS-RunShellScript"]},
 {"Sid":"ReadResult","Effect":"Allow","Action":"ssm:GetCommandInvocation","Resource":"*"}]}
EOF
aws iam get-role --role-name $GH_ROLE >/dev/null 2>&1 || \
  aws iam create-role --role-name $GH_ROLE --assume-role-policy-document file:///tmp/gh-trust.json
aws iam update-assume-role-policy --role-name $GH_ROLE --policy-document file:///tmp/gh-trust.json
aws iam put-role-policy --role-name $GH_ROLE --policy-name deploy --policy-document file:///tmp/gh-policy.json
aws iam get-role --role-name $GH_ROLE --query Role.Arn --output text
```

**Check:** the last command prints `arn:aws:iam::<account-id>:role/rainready-github-deploy`, and
`aws iam get-role --role-name $GH_ROLE --query "Role.AssumeRolePolicyDocument.Statement[0].Condition.StringEquals"` lists two `sub` values.

If the GitHub `deploy` job already failed with `Not authorized to perform sts:AssumeRoleWithWebIdentity`, re-running the block above repairs it (`update-assume-role-policy` replaces the trust policy). Then run `gh workflow run test --repo $GH_REPO --ref main` and check the `deploy` job.

**This cannot be fixed from the GitHub side.** The repo's OIDC subject is immutable (it carries the owner and repo ids). Tested on 10 Oct: the customization API ignores `use_immutable_subject=false`, and a custom template built from the `repo` and `context` claim keys still produces the immutable prefix. Only the role's trust policy can change. The command replaces the whole trust policy, so it works whatever the role holds now.

No AWS CLI on the machine? Open **AWS CloudShell** (the terminal icon in the console's top bar, region `ap-south-1`). It has the CLI and the console login. Paste the block from section 1 and the block above.

### 3.4 Test one deploy by hand

A deploy replaces everything in the app directory on the server except `.env`, `var/`, `*.pem` and `.aws-state`. Look first:

```bash
$SSH "ls -la $APP"
```

**Check:** nothing else in that list needs to be kept. If something does, stop and ask Ujjwal.

```bash
git switch main && git pull --rebase
BUCKET=$BUCKET INSTANCE=$INSTANCE bash rain-ready/scripts/deploy-ssm.sh
curl -fsS -H "X-User-Id: admin-1" "https://$HOST/api/health?deep=1"
$SSH 'crontab -l'
```

**Check:** the script ends with `status: Success` and prints `ok: <commit> is live`; health is `"ok":true`; the crontab still has the hourly `scripts/backup.sh` line.

### 3.5 Switch it on in GitHub (repo admin: Ujjwal)

Send Ujjwal the role ARN. He runs:

```bash
gh variable set AWS_DEPLOY_ROLE_ARN --repo RumbleJack56/bharatbuilds --body arn:aws:iam::<account-id>:role/rainready-github-deploy
gh variable set AWS_REGION          --repo RumbleJack56/bharatbuilds --body ap-south-1
gh variable set DEPLOY_BUCKET       --repo RumbleJack56/bharatbuilds --body rainready-photos-<account-id>
gh variable set DEPLOY_INSTANCE_ID  --repo RumbleJack56/bharatbuilds --body <instance-id>
gh workflow run test --repo RumbleJack56/bharatbuilds --ref main
```

**Check:** in the Actions tab the `deploy` job is green. From then on every merge to `main` deploys by itself in about two minutes. To pause automatic deploys, delete the `AWS_DEPLOY_ROLE_ARN` variable.

### 3.6 Keep the bucket tidy

```bash
aws s3api get-bucket-lifecycle-configuration --bucket $BUCKET
```

Only if that returns `NoSuchLifecycleConfiguration`:

```bash
aws s3api put-bucket-lifecycle-configuration --bucket $BUCKET --lifecycle-configuration \
 '{"Rules":[{"ID":"expire-deploys","Status":"Enabled","Filter":{"Prefix":"deploy/"},"Expiration":{"Days":7}}]}'
```

## 3.7 Capture secret (task A8)

Without `CAPTURE_SECRET`, camera tokens stop working on every deploy. This sets one only if it is empty, and never prints it.

```bash
$SSH "cd $APP && grep -q '^CAPTURE_SECRET=[^ #]' .env && echo already set || { \
  grep -q '^CAPTURE_SECRET=' .env && sed -i \"s|^CAPTURE_SECRET=.*|CAPTURE_SECRET=\$(openssl rand -hex 24)|\" .env \
  || echo \"CAPTURE_SECRET=\$(openssl rand -hex 24)\" >> .env; \
  docker compose up -d --force-recreate app; echo set; }"
```

**Check:** it prints `already set` or `set`, and health is still `"ok":true`.

## 4. Bedrock (task B4)

1. One-time, in the console (no reliable CLI path): Bedrock, Model catalog, open an Anthropic Claude model, submit the use-case form if asked.
2. List the model ids this account can call. Do not guess an id.

```bash
aws bedrock list-inference-profiles --query \
  "inferenceProfileSummaries[?contains(inferenceProfileId,'anthropic')].[inferenceProfileId,status]" --output table
```

3. Pick the newest Claude Haiku profile with status `ACTIVE` (cheap and fast; it reads images). Test it from your admin login first, because the first call also accepts the model terms for the account:

```bash
export MODEL=<id from the table>
aws bedrock-runtime converse --model-id "$MODEL" \
  --messages '[{"role":"user","content":[{"text":"Reply with the word ok"}]}]' \
  --query 'output.message.content[0].text'
```

**Check:** it prints `"ok"`. If it prints `AccessDeniedException`, wait 15 minutes after step 1 and retry. If it still fails, stop here: the app stays on `TRIAGE_MODE=manual`, which is a supported mode. Tell Ujjwal.

4. Turn it on for the server:

```bash
$SSH "cd $APP && sed -i -e 's|^TRIAGE_MODE=.*|TRIAGE_MODE=bedrock|' -e 's|^BEDROCK_MODEL_ID=.*|BEDROCK_MODEL_ID=$MODEL|' .env \
  && docker compose up -d --force-recreate app"
sleep 10; curl -fsS -H "X-User-Id: admin-1" "https://$HOST/api/health?deep=1"
```

**Check:** health shows `"triage":"bedrock"` and `"bedrock":"ok"`. Then report one photo in the app with no category chosen; the incident's `ai` field must be filled. If the health check shows an error, set `TRIAGE_MODE=manual` again with the same command and report the error text.

## 5. Photos open on the live site (task B3)

Do this after Ujjwal's fix for pre-signed URLs is on `main` and deployed.

1. On a phone, open `https://<ip-with-dashes>.sslip.io`, log in as a resident and send a report with a photo.
2. Log in as `off-mcd`, open the task and tap the photo.

```bash
aws s3 ls s3://$BUCKET/ --recursive | tail -5
```

**Check:** the photo shows in the task timeline, and a new object is in the bucket. A 403 on the photo means the fix is not deployed yet.

## 6. Backups

```bash
$SSH 'crontab -l'
aws s3 ls s3://$BUCKET/backup/
aws s3 cp "s3://$BUCKET/backup/$(aws s3 ls s3://$BUCKET/backup/ | sort | tail -1 | awk '{print $4}')" /tmp/rr-restore.db
python3 -c "import sqlite3; print(sqlite3.connect('/tmp/rr-restore.db').execute('select count(*) from tasks').fetchone())"
```

**Check:** the crontab has an hourly `backup.sh` line with `S3_BUCKET` set; the newest backup is less than 70 minutes old; the last command prints a row count and no error.

## 7. Lock down access

```bash
SG=$(aws ec2 describe-instances --instance-ids $INSTANCE \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' --output text)
aws ec2 describe-security-groups --group-ids $SG \
  --query 'SecurityGroups[0].IpPermissions[].[FromPort,IpRanges[].CidrIp]' --output json
```

**Check:** ports 80 and 443 are open to `0.0.0.0/0`. Port 22 is open only to your own IP. If port 22 is open to `0.0.0.0/0`:

```bash
aws ec2 revoke-security-group-ingress --group-id $SG --protocol tcp --port 22 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $SG --protocol tcp --port 22 \
  --cidr "$(curl -fsS https://checkip.amazonaws.com)/32"
```

Cost so far (credits should cover it):

```bash
aws ce get-cost-and-usage --time-period Start=2026-10-01,End=2026-10-12 \
  --granularity MONTHLY --metrics UnblendedCost --query 'ResultsByTime[0].Total.UnblendedCost'
```

## 8. Before recording the video

Do these only when Ujjwal says the final code and seed data are on `main`.

1. Fresh data. This removes every test report. The old database is kept as a `.bak` file.

```bash
$SSH "cd $APP && docker compose stop app \
  && sudo mv var/rainready.db var/rainready.db.bak-\$(date +%H%M) \
  && sudo rm -f var/rainready.db-wal var/rainready.db-shm \
  && docker compose start app"
sleep 10; curl -fsS -H "X-User-Id: admin-1" "https://$HOST/api/health?deep=1"
```

2. An image of the server to roll back to:

```bash
aws ec2 create-image --instance-id $INSTANCE --no-reboot \
  --name "rainready-$(date +%Y%m%d-%H%M)" --query ImageId --output text
```

**Check:** health is `"ok":true`; the dashboard shows seed data only; `aws ec2 describe-images --owners self --query 'Images[].[Name,State]'` shows the new image as `available` after a few minutes.

3. For the video, show in the AWS console: the EC2 instance, the S3 bucket with photos and `backup/`, Bedrock if it is on, and the live URL in a browser.

## 9. After judging

```bash
aws ec2 stop-instances --instance-ids $INSTANCE
```

The Elastic IP and the bucket are kept, so the URL works again after `aws ec2 start-instances --instance-ids $INSTANCE`. Do not release the Elastic IP: the host name and the APK depend on it.

## 10. Report back to Ujjwal

| Item | Result |
|---|---|
| 2. Inventory check | pass / fail |
| 3.1 SSM `Online` | |
| 3.3 Deploy role ARN | |
| 3.4 Manual deploy `Success` | |
| 3.7 Capture secret: already set / set | |
| 4. Bedrock model id, or "manual" with the error text | |
| 5. Photo opens on the phone | |
| 6. Newest backup time, restore check | |
| 7. Port 22 limited to one IP | |
| 8. AMI id (when done) | |
