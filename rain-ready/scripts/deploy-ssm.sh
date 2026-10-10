#!/usr/bin/env bash
# Deploy the current commit to the EC2 host without SSH: upload the code to S3, then run it through SSM.
# Used by .github/workflows/test.yml after tests pass on main. Also works by hand with AWS CLI credentials:
#   BUCKET=<bucket> INSTANCE=<instance-id> scripts/deploy-ssm.sh
# Setup of the roles this needs: docs/AWS_TODO.md section 3.
set -euo pipefail
: "${BUCKET:?set BUCKET}" "${INSTANCE:?set INSTANCE}"
REGION="${AWS_REGION:-ap-south-1}"
ROOT="$(git rev-parse --show-toplevel)"
SHA="$(git -C "$ROOT" rev-parse HEAD)"
KEY="deploy/$SHA.tar.gz"

git -C "$ROOT" archive --format=tar.gz HEAD:rain-ready |
  aws s3 cp - "s3://$BUCKET/$KEY" --region "$REGION" --only-show-errors

# On the host: fetch, check the archive, replace the code (keep .env, var/ and local keys), rebuild.
REMOTE="set -euo pipefail; cd ~/bharatbuilds/rain-ready"
REMOTE="$REMOTE; aws s3 cp s3://$BUCKET/$KEY /tmp/rr-deploy.tgz --region $REGION --only-show-errors"
REMOTE="$REMOTE; tar -tzf /tmp/rr-deploy.tgz >/dev/null"
REMOTE="$REMOTE; find . -mindepth 1 -maxdepth 1 ! -name .env ! -name var ! -name '*.pem' ! -name .aws-state -exec rm -rf {} +"
REMOTE="$REMOTE; tar -xzf /tmp/rr-deploy.tgz; bash scripts/server-deploy.sh $SHA"
PARAMS="$(python3 -c 'import json,sys; print(json.dumps({"commands": ["runuser -l ec2-user -c \"" + sys.argv[1] + "\""]}))' "$REMOTE")"

CID="$(aws ssm send-command --region "$REGION" --instance-ids "$INSTANCE" \
  --document-name AWS-RunShellScript --comment "rain-ready $SHA" \
  --parameters "$PARAMS" --query Command.CommandId --output text)"
echo "sent $CID for $SHA"

STATUS=Pending
for _ in $(seq 1 120); do   # up to 10 minutes
  STATUS="$(aws ssm get-command-invocation --region "$REGION" --command-id "$CID" \
    --instance-id "$INSTANCE" --query Status --output text 2>/dev/null || echo Pending)"
  case "$STATUS" in Pending|InProgress|Delayed) sleep 5 ;; *) break ;; esac
done
aws ssm get-command-invocation --region "$REGION" --command-id "$CID" --instance-id "$INSTANCE" \
  --query '[StandardOutputContent,StandardErrorContent]' --output text || true
echo "status: $STATUS"
[ "$STATUS" = Success ]
