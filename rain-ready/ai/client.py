"""The one place a Bedrock client is made: short timeouts, so a slow model cannot hold a request for a minute."""
from app import config


def runtime():
    import boto3
    from botocore.config import Config
    return boto3.client("bedrock-runtime", region_name=config.AWS_REGION,
                        config=Config(connect_timeout=3, read_timeout=15, retries={"max_attempts": 2, "mode": "standard"}))
