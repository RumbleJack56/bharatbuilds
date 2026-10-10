#!/usr/bin/env bash
# One-time AWS setup from a machine with the AWS CLI logged in (aws configure / SSO).
# Usage: scripts/aws-setup.sh <bucket-name>      e.g. rainready-photos-4821
# Creates: private S3 bucket, IAM role + instance profile "rainready-ec2" with scripts/iam-policy.json.
# Safe to re-run. The EC2 instance, security group and Elastic IP are still made in the console (docs/DEPLOY.md).
set -euo pipefail
BUCKET="${1:?usage: aws-setup.sh <bucket-name>}"
REGION="${AWS_REGION:-ap-south-1}"
ROLE=rainready-ec2
HERE="$(cd "$(dirname "$0")" && pwd)"

aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null || \
  aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" \
    --create-bucket-configuration "LocationConstraint=$REGION"
aws s3api put-public-access-block --bucket "$BUCKET" --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

TRUST='{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
aws iam get-role --role-name "$ROLE" >/dev/null 2>&1 || \
  aws iam create-role --role-name "$ROLE" --assume-role-policy-document "$TRUST" >/dev/null
aws iam put-role-policy --role-name "$ROLE" --policy-name rainready-access \
  --policy-document "$(sed "s/BUCKET/$BUCKET/" "$HERE/iam-policy.json")"
aws iam get-instance-profile --instance-profile-name "$ROLE" >/dev/null 2>&1 || {
  aws iam create-instance-profile --instance-profile-name "$ROLE" >/dev/null
  aws iam add-role-to-instance-profile --instance-profile-name "$ROLE" --role-name "$ROLE"
}
echo "ok: bucket=$BUCKET role/profile=$ROLE region=$REGION"
echo "next: launch EC2 with instance profile $ROLE and metadata hop limit 2 (docs/DEPLOY.md)"
