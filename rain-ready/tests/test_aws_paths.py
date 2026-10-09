"""S3 storage and Bedrock triage paths, checked with a fake boto3 client (no AWS account needed)."""
import pytest

from ai import triage
from app import config, storage


class FakeS3:
    def __init__(self):
        self.puts, self.signed = [], []

    def put_object(self, **kw):
        self.puts.append(kw)

    def generate_presigned_url(self, op, Params, ExpiresIn):
        self.signed.append((op, Params, ExpiresIn))
        return f"https://signed.example/{Params['Key']}"


@pytest.fixture()
def s3(monkeypatch):
    fake = FakeS3()
    import boto3
    monkeypatch.setattr(boto3, "client", lambda name, **kw: fake)
    monkeypatch.setattr(config, "STORAGE", "s3")
    monkeypatch.setattr(config, "S3_BUCKET", "bkt")
    return fake


def test_save_photo_puts_to_bucket(s3):
    key = storage.save_photo(b"img", "image/png")
    assert key.endswith(".png")
    assert s3.puts == [{"Bucket": "bkt", "Key": key, "Body": b"img", "ContentType": "image/png"}]


def test_media_redirects_to_presigned_url(s3, client):
    r = client.get("/media/abc.jpg", follow_redirects=False)
    assert r.status_code in (302, 307)
    assert r.headers["location"] == "https://signed.example/abc.jpg"
    assert s3.signed[0][1] == {"Bucket": "bkt", "Key": "abc.jpg"}


def test_media_rejects_path_tricks(s3, client):
    assert client.get("/media/..%2Fx").status_code in (400, 404)


def reply(*texts):
    return {"output": {"message": {"content": [{"text": t} if t is not None else {"reasoning": {}} for t in texts]}}}


@pytest.mark.parametrize("resp,expect", [
    (reply('{"kind":"blocked_drain","summary":"Leaves over a grate."}'), "blocked_drain"),
    (reply('Sure:\n```json\n{"kind":"overflow","summary":"x"}\n```'), "overflow"),
    (reply(None, '{"kind":"other"}'), "other"),              # non-text block first
    (reply('{"kind":"flood","summary":"x"}'), None),         # kind not allowed
    (reply('no json here'), None),
    (reply('{bad json}'), None),
    (reply('[1,2]'), None),
])
def test_parse_reply(resp, expect):
    out = triage.parse_reply(resp)
    assert (out["kind"] if out else None) == expect


def test_summary_is_trimmed():
    out = triage.parse_reply(reply('{"kind":"other","summary":"' + "a" * 500 + '"}'))
    assert len(out["summary"]) == 200


def test_triage_off_by_default(monkeypatch):
    monkeypatch.setattr(config, "TRIAGE_MODE", "manual")
    assert triage.triage_photo(b"x", "image/jpeg") is None


def test_triage_calls_bedrock_and_fails_soft(monkeypatch):
    monkeypatch.setattr(config, "TRIAGE_MODE", "bedrock")
    monkeypatch.setattr(config, "BEDROCK_MODEL_ID", "m-1")
    calls = []

    class Br:
        def converse(self, **kw):
            calls.append(kw)
            return reply('{"kind":"standing_water","summary":"Puddle."}')

    import boto3
    monkeypatch.setattr(boto3, "client", lambda name, **kw: Br())
    out = triage.triage_photo(b"x", "image/jpeg", "note")
    assert out == {"kind": "standing_water", "summary": "Puddle.", "model": "m-1"}
    assert calls[0]["modelId"] == "m-1"

    class Boom:
        def converse(self, **kw):
            raise RuntimeError("AccessDenied")

    monkeypatch.setattr(boto3, "client", lambda name, **kw: Boom())
    assert triage.triage_photo(b"x", "image/jpeg") is None
